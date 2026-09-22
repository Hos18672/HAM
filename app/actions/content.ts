'use server';

import { revalidateTag } from 'next/cache';
import { sql } from '@/lib/db';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';
import { requireUser, AuthError } from '@/lib/auth';
import { readEditSession } from '@/lib/preferences';
import { ENTITIES } from '@/lib/db/entity-map';
import {
  fieldUpdateSchema,
  baseFieldUpdateSchema,
  listOpSchema,
  type EntityKind,
} from '@/lib/validation/content';
import { locales } from '@/lib/i18n/config';

/**
 * The content write API.
 *
 * Both the /admin editors and the in-place editor come through these actions —
 * one source of truth, so the two can never diverge. Every action:
 *   1. re-checks the session itself (middleware is not a boundary for actions),
 *   2. validates its input with Zod,
 *   3. resolves table and column names through the entity map, never from the
 *      request, so identifiers are always ones we wrote,
 *   4. writes an audit row,
 *   5. revalidates the affected cache tag.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** For `add` and `duplicate`: the id of the new row. */
  id?: string;
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Both doors into the content API: a logged-in admin, or a valid edit session. */
async function authorize(): Promise<{ userId: string } | null> {
  const editSession = await readEditSession();
  if (editSession) return { userId: editSession.userId };
  try {
    const user = await requireUser();
    return { userId: user.id };
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  diff: Record<string, unknown>,
) {
  try {
    await db.insert(auditLog).values({ userId, action, entity, entityId, diff });
  } catch (error) {
    // An audit failure must not lose the edit the staff member just made.
    console.error('[audit] write failed', error);
  }
}

/* ─── Field updates ──────────────────────────────────────────────────────── */

/**
 * Write one translated field for one locale. This is what a blur in the
 * in-place editor calls, and what the admin's bilingual fields call on save.
 */
export async function updateField(input: unknown): Promise<ActionResult> {
  const session = await authorize();
  if (!session) return fail('unauthenticated');

  const parsed = fieldUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const { entity, id, field, locale, value } = parsed.data;
  const definition = ENTITIES[entity as EntityKind];
  if (!definition) return fail('unknown-entity');

  const column = definition.fields[field];
  if (!column) return fail('unknown-field');

  try {
    if (entity === 'block') {
      // Blocks hold a jsonb document whose shape follows the block's `kind`:
      // a list block holds { items: [...] }, everything else { text }. The
      // kind is read from the row rather than inferred from the field name,
      // so the admin's single "Text" field — one item per line, as its hint
      // says — cannot flatten a list into a paragraph.
      const [block] = await sql<{ kind: string }[]>`
        SELECT kind FROM content_blocks WHERE id = ${id}
      `;
      if (!block) return fail('not-found');

      const payload =
        field === 'items' || block.kind === 'list'
          ? {
              items: value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            }
          : { text: value };

      await sql`
        INSERT INTO block_translations (block_id, locale, value)
        VALUES (${id}, ${locale}, ${sql.json(payload)})
        ON CONFLICT (block_id, locale) DO UPDATE SET value = EXCLUDED.value
      `;
    } else {
      // Identifiers come from the entity map, never from the request; only the
      // value is a bound parameter.
      await sql`
        INSERT INTO ${sql(definition.translations)} (${sql(definition.fk)}, locale, ${sql(column)})
        VALUES (${id}, ${locale}, ${value})
        ON CONFLICT (${sql(definition.fk)}, locale)
        DO UPDATE SET ${sql(column)} = EXCLUDED.${sql(column)}
      `;
    }

    await audit(session.userId, 'update', entity, id, { field, locale, value });
    revalidateTag(definition.tag);
    return { ok: true };
  } catch (error) {
    console.error('[content] updateField failed', { entity, id, field, error });
    return fail('write-failed');
  }
}

/** Write one language-independent field on a base row. */
export async function updateBaseField(input: unknown): Promise<ActionResult> {
  const session = await authorize();
  if (!session) return fail('unauthenticated');

  const parsed = baseFieldUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const { entity, id, field, value } = parsed.data;
  const definition = ENTITIES[entity as EntityKind];
  if (!definition) return fail('unknown-entity');

  const column = definition.baseFields[field];
  if (!column) return fail('unknown-field');

  try {
    await sql`UPDATE ${sql(definition.base)} SET ${sql(column)} = ${value} WHERE id = ${id}`;
    await audit(session.userId, 'update-base', entity, id, { field, value });
    revalidateTag(definition.tag);
    return { ok: true };
  } catch (error) {
    console.error('[content] updateBaseField failed', { entity, id, field, error });
    return fail('write-failed');
  }
}

/* ─── List operations ────────────────────────────────────────────────────── */

/**
 * Add, duplicate, delete or reorder an entry.
 *
 * All of these act on the *base* row, which is what keeps the two languages in
 * step: adding an entry creates a translation row for every locale at once, and
 * reordering changes a single `sort` value that both languages read.
 */
export async function listOperation(input: unknown): Promise<ActionResult> {
  const session = await authorize();
  if (!session) return fail('unauthenticated');

  const parsed = listOpSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  const { entity, op, id, parentId } = parsed.data;
  const definition = ENTITIES[entity as EntityKind];
  if (!definition) return fail('unknown-entity');

  try {
    switch (op) {
      case 'add': {
        const scope =
          definition.parentColumn && parentId ? { [definition.parentColumn]: parentId } : {};
        // `required()` is called per insert, not shared, so two additions in a
        // row each get their own generated key and cannot collide on a unique
        // index. Without it an insert into a table with a NOT NULL slug or
        // tier_key simply fails — which is what "Neuer Eintrag" did on
        // courses, events, du'as and memberships.
        const defaults = {
          ...(definition.defaults ?? {}),
          ...(definition.required?.() ?? {}),
          ...scope,
        };

        // New entries land at the end of the list.
        const nextSort = definition.sortable
          ? ((await sql`SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM ${sql(definition.base)}`)[0]
              ?.next ?? 0)
          : undefined;

        const columns = { ...defaults, ...(nextSort !== undefined ? { sort: nextSort } : {}) };
        const rows = Object.keys(columns).length
          ? await sql`INSERT INTO ${sql(definition.base)} ${sql(columns)} RETURNING id`
          : await sql`INSERT INTO ${sql(definition.base)} DEFAULT VALUES RETURNING id`;

        const newId = rows[0]?.id as string | undefined;
        if (!newId) return fail('write-failed');

        // A translation row per locale, so the entry exists in both languages
        // from the moment it is created and the two can never drift.
        for (const locale of locales) {
          await sql`
            INSERT INTO ${sql(definition.translations)} (${sql(definition.fk)}, locale)
            VALUES (${newId}, ${locale})
            ON CONFLICT DO NOTHING
          `;
        }

        await audit(session.userId, 'add', entity, newId, {});
        revalidateTag(definition.tag);
        return { ok: true, id: newId };
      }

      case 'duplicate': {
        if (!id) return fail('missing-id');

        const [original] = await sql`SELECT * FROM ${sql(definition.base)} WHERE id = ${id}`;
        if (!original) return fail('not-found');

        // Copy every column but the primary key and let the default mint a new
        // id. Unique columns get a suffix so the copy does not collide.
        const copy: Record<string, unknown> = { ...original };
        delete copy.id;
        const suffix = Date.now().toString(36);
        if (typeof copy.slug === 'string') copy.slug = `${copy.slug}-kopie-${suffix}`;
        if (typeof copy.tier_key === 'string') copy.tier_key = `${copy.tier_key}-kopie-${suffix}`;
        if (typeof copy.key === 'string') copy.key = `${copy.key}-kopie-${suffix}`;
        if (typeof copy.sort === 'number') copy.sort = copy.sort + 1;

        const inserted = await sql`INSERT INTO ${sql(definition.base)} ${sql(copy)} RETURNING id`;
        const newId = inserted[0]?.id as string | undefined;
        if (!newId) return fail('write-failed');

        // Both locales come along, so a duplicate is complete in each language.
        const translations =
          await sql`SELECT * FROM ${sql(definition.translations)} WHERE ${sql(definition.fk)} = ${id}`;
        for (const translation of translations) {
          const translationCopy: Record<string, unknown> = { ...translation };
          translationCopy[definition.fk] = newId;
          await sql`
            INSERT INTO ${sql(definition.translations)} ${sql(translationCopy)}
            ON CONFLICT DO NOTHING
          `;
        }

        await audit(session.userId, 'duplicate', entity, newId, { from: id });
        revalidateTag(definition.tag);
        return { ok: true, id: newId };
      }

      case 'delete': {
        if (!id) return fail('missing-id');

        // Never leave a list empty: the page would have nothing to render and
        // no handle to add a new entry from.
        const [countRow] =
          definition.parentColumn && parentId
            ? await sql`SELECT COUNT(*)::int AS count FROM ${sql(definition.base)} WHERE ${sql(definition.parentColumn)} = ${parentId}`
            : await sql`SELECT COUNT(*)::int AS count FROM ${sql(definition.base)}`;
        if ((countRow?.count ?? 0) <= 1) return fail('last-entry');

        // The translations go with it: every FK is ON DELETE CASCADE.
        await sql`DELETE FROM ${sql(definition.base)} WHERE id = ${id}`;
        await audit(session.userId, 'delete', entity, id, {});
        revalidateTag(definition.tag);
        return { ok: true };
      }

      case 'moveUp':
      case 'moveDown': {
        if (!id) return fail('missing-id');
        if (!definition.sortable) return fail('not-sortable');

        const direction = op === 'moveUp' ? -1 : 1;
        const [current] = await sql`SELECT id, sort FROM ${sql(definition.base)} WHERE id = ${id}`;
        if (!current) return fail('not-found');

        // The neighbour in the chosen direction, scoped to the parent when the
        // list is nested.
        const neighbours =
          definition.parentColumn && parentId
            ? await sql`
              SELECT id, sort FROM ${sql(definition.base)}
              WHERE ${sql(definition.parentColumn)} = ${parentId}
                AND sort ${direction < 0 ? sql`<` : sql`>`} ${current.sort}
              ORDER BY sort ${direction < 0 ? sql`DESC` : sql`ASC`}
              LIMIT 1
            `
            : await sql`
              SELECT id, sort FROM ${sql(definition.base)}
              WHERE sort ${direction < 0 ? sql`<` : sql`>`} ${current.sort}
              ORDER BY sort ${direction < 0 ? sql`DESC` : sql`ASC`}
              LIMIT 1
            `;

        const neighbour = neighbours[0];
        if (!neighbour) return { ok: true }; // already at the end

        // Swap in a transaction so a half-applied reorder cannot be observed.
        await sql.begin(async (tx) => {
          await tx`UPDATE ${tx(definition.base)} SET sort = ${neighbour.sort} WHERE id = ${current.id}`;
          await tx`UPDATE ${tx(definition.base)} SET sort = ${current.sort} WHERE id = ${neighbour.id}`;
        });

        await audit(session.userId, op, entity, id, { swappedWith: neighbour.id });
        revalidateTag(definition.tag);
        return { ok: true };
      }

      default:
        return fail('unknown-op');
    }
  } catch (error) {
    console.error('[content] listOperation failed', { entity, op, id, error });
    return fail('write-failed');
  }
}
