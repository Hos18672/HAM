'use server';

import { revalidateTag } from 'next/cache';
import { eq, lt, and } from 'drizzle-orm';
import { db, sql } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { requireUser, hashPassword, AuthError } from '@/lib/auth';
import { deleteImage } from '@/lib/storage';
import {
  settingsSchema,
  submissionStatusSchema,
  uploadMetaSchema,
  backupSchema,
} from '@/lib/validation/content';
import { userCreateSchema, userUpdateSchema, userDeleteSchema } from '@/lib/validation/auth';
import { locales } from '@/lib/i18n/config';
import { CACHE_TAGS } from '@/lib/db/queries/content';
import { z } from 'zod';

export interface AdminResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const fail = (error: string): AdminResult => ({ ok: false, error });

async function guard(role?: 'admin') {
  try {
    return await requireUser(role);
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw error;
  }
}

async function audit(userId: string, action: string, entity: string, entityId: string, diff: Record<string, unknown>) {
  try {
    await db.insert(s.auditLog).values({ userId, action, entity, entityId, diff });
  } catch (error) {
    console.error('[audit] write failed', error);
  }
}

/* ─── Settings ───────────────────────────────────────────────────────────── */

export async function saveSettings(input: unknown): Promise<AdminResult> {
  const user = await guard();
  if (!user) return fail('unauthenticated');

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'invalid');
  }

  await db
    .insert(s.siteSettings)
    .values({ id: 1, ...parsed.data, updatedBy: user.id, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: s.siteSettings.id,
      set: { ...parsed.data, updatedBy: user.id, updatedAt: new Date() },
    });

  await audit(user.id, 'update', 'settings', '1', parsed.data);
  // Settings reach the footer and the header of every page.
  for (const tag of Object.values(CACHE_TAGS)) revalidateTag(tag);
  return { ok: true };
}

/* ─── Submissions ────────────────────────────────────────────────────────── */

export async function setSubmissionStatus(input: unknown): Promise<AdminResult> {
  const user = await guard();
  if (!user) return fail('unauthenticated');

  const parsed = submissionStatusSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');

  await db
    .update(s.submissions)
    .set({ status: parsed.data.status })
    .where(eq(s.submissions.id, parsed.data.id));

  await audit(user.id, 'status', 'submission', parsed.data.id, { status: parsed.data.status });
  return { ok: true };
}

export async function deleteSubmission(input: unknown): Promise<AdminResult> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail('invalid');

  await db.delete(s.submissions).where(eq(s.submissions.id, parsed.data.id));
  await audit(user.id, 'delete', 'submission', parsed.data.id, {});
  return { ok: true };
}

/**
 * The retention rule the privacy policy promises: submissions are deleted
 * after 24 months. Offered as a button rather than a cron so the association
 * does not need a scheduler — and so a human sees what is about to go.
 */
export async function pruneOldSubmissions(): Promise<AdminResult & { deleted?: number }> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  const deleted = await db
    .delete(s.submissions)
    .where(and(lt(s.submissions.createdAt, cutoff), eq(s.submissions.status, 'archived')))
    .returning({ id: s.submissions.id });

  await audit(user.id, 'prune', 'submission', '', { count: deleted.length, cutoff: cutoff.toISOString() });
  return { ok: true, deleted: deleted.length };
}

/** CSV export of the inbox. Quoting is RFC 4180. */
export async function exportSubmissionsCsv(): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const user = await guard();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const rows = await db.select().from(s.submissions).orderBy(s.submissions.createdAt);

  const escape = (value: unknown) => {
    const text = String(value ?? '');
    // A field containing a quote, comma or newline must be quoted, with
    // internal quotes doubled.
    return /["\n,;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = ['Datum', 'Art', 'Name', 'E-Mail', 'Telefon', 'Anliegen', 'Nachricht', 'Sprache', 'Status'];
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.kind,
        row.name,
        row.email,
        row.phone,
        row.topic,
        row.message,
        row.locale,
        row.status,
      ]
        .map(escape)
        .join(','),
    ),
  ];

  // The BOM makes Excel open UTF-8 correctly, which matters for Persian names.
  return { ok: true, csv: `﻿${lines.join('\r\n')}` };
}

/* ─── Media ──────────────────────────────────────────────────────────────── */

export async function saveMediaMeta(input: unknown): Promise<AdminResult> {
  const user = await guard();
  if (!user) return fail('unauthenticated');

  const parsed = z
    .object({ id: z.string().uuid() })
    .and(uploadMetaSchema)
    .safeParse(input);
  if (!parsed.success) return fail('invalid');

  const { id, alt, caption, category } = parsed.data;

  for (const locale of locales) {
    await db
      .insert(s.mediaTranslations)
      .values({
        mediaId: id,
        locale,
        alt: alt?.[locale] ?? '',
        caption: caption?.[locale] ?? '',
      })
      .onConflictDoUpdate({
        target: [s.mediaTranslations.mediaId, s.mediaTranslations.locale],
        set: { alt: alt?.[locale] ?? '', caption: caption?.[locale] ?? '' },
      });
  }

  if (category) {
    await db.update(s.galleryItems).set({ category }).where(eq(s.galleryItems.mediaId, id));
  }

  await audit(user.id, 'update', 'media', id, { alt, caption, category });
  revalidateTag(CACHE_TAGS.gallery);
  return { ok: true };
}

export async function deleteMedia(input: unknown): Promise<AdminResult> {
  const user = await guard();
  if (!user) return fail('unauthenticated');

  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail('invalid');

  const [row] = await db.select().from(s.media).where(eq(s.media.id, parsed.data.id)).limit(1);
  if (!row) return fail('not-found');

  // The database row goes first: an orphaned object in the bucket is cheap,
  // a row pointing at a deleted file renders a broken image.
  await db.delete(s.media).where(eq(s.media.id, parsed.data.id));
  await deleteImage(row.key);

  await audit(user.id, 'delete', 'media', parsed.data.id, { key: row.key });
  revalidateTag(CACHE_TAGS.gallery);
  return { ok: true };
}

export async function addToGallery(input: unknown): Promise<AdminResult> {
  const user = await guard();
  if (!user) return fail('unauthenticated');

  const parsed = z
    .object({ mediaId: z.string().uuid(), category: z.string().max(64).default('general') })
    .safeParse(input);
  if (!parsed.success) return fail('invalid');

  const [row] = await db
    .insert(s.galleryItems)
    .values({ mediaId: parsed.data.mediaId, category: parsed.data.category })
    .returning({ id: s.galleryItems.id });

  await audit(user.id, 'add', 'gallery', row?.id ?? '', parsed.data);
  revalidateTag(CACHE_TAGS.gallery);
  return { ok: true, id: row?.id };
}

/* ─── Users (admin only) ─────────────────────────────────────────────────── */

export async function createUser(input: unknown): Promise<AdminResult> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  const parsed = userCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');

  const existing = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(s.users.email, parsed.data.email))
    .limit(1);
  if (existing.length > 0) return fail('Diese E-Mail-Adresse wird bereits verwendet.');

  const [row] = await db
    .insert(s.users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning({ id: s.users.id });

  await audit(user.id, 'create', 'user', row?.id ?? '', {
    email: parsed.data.email,
    role: parsed.data.role,
  });
  return { ok: true, id: row?.id };
}

export async function updateUser(input: unknown): Promise<AdminResult> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid');

  const { id, name, role, password } = parsed.data;

  // Never let the last admin demote themselves out of the system.
  if (role === 'editor') {
    const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, 'admin'));
    if (admins.length <= 1 && admins[0]?.id === id) {
      return fail('Es muss mindestens ein Administrator übrig bleiben.');
    }
  }

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) patch.role = role;
  if (password !== undefined) patch.passwordHash = await hashPassword(password);
  if (Object.keys(patch).length === 0) return { ok: true };

  await db.update(s.users).set(patch).where(eq(s.users.id, id));
  // The new password never reaches the audit log.
  await audit(user.id, 'update', 'user', id, { name, role, passwordChanged: password !== undefined });
  return { ok: true };
}

export async function deleteUser(input: unknown): Promise<AdminResult> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  const parsed = userDeleteSchema.safeParse(input);
  if (!parsed.success) return fail('invalid');
  if (parsed.data.id === user.id) return fail('Sie können sich nicht selbst löschen.');

  const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, 'admin'));
  if (admins.length <= 1 && admins.some((a) => a.id === parsed.data.id)) {
    return fail('Es muss mindestens ein Administrator übrig bleiben.');
  }

  await db.delete(s.users).where(eq(s.users.id, parsed.data.id));
  await audit(user.id, 'delete', 'user', parsed.data.id, {});
  return { ok: true };
}

/* ─── Backup ─────────────────────────────────────────────────────────────── */

/** Tables the export and import cover — content only, never users or logs. */
const BACKUP_TABLES = [
  'site_settings',
  'pages',
  'page_translations',
  'content_blocks',
  'block_translations',
  'offers',
  'offer_translations',
  'courses',
  'course_translations',
  'events',
  'event_translations',
  'programme_items',
  'programme_translations',
  'sports',
  'sport_translations',
  'culture_cards',
  'culture_translations',
  'community_cards',
  'community_translations',
  'values_items',
  'values_translations',
  'week_schedule',
  'week_translations',
  'duas',
  'dua_translations',
  'occasions',
  'occasion_translations',
  'memberships',
  'membership_translations',
  'media',
  'media_translations',
  'gallery_items',
] as const;

export async function exportBackup(): Promise<{ ok: boolean; json?: string; error?: string }> {
  const user = await guard();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const tables: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    // postgres.js returns a tagged result array; spread it into a plain one
    // so JSON.stringify writes an array rather than an object with metadata.
    tables[table] = [...(await sql`SELECT * FROM ${sql(table)}`)];
  }

  await audit(user.id, 'export', 'backup', '', { tables: BACKUP_TABLES.length });
  return {
    ok: true,
    json: JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tables }, null, 2),
  };
}

export interface ImportDiff {
  table: string;
  current: number;
  incoming: number;
}

/**
 * Read a backup file and report what it would change, without writing
 * anything. The admin sees this diff and confirms before `importBackup` runs.
 */
export async function previewBackup(json: string): Promise<{ ok: boolean; diff?: ImportDiff[]; error?: string }> {
  const user = await guard('admin');
  if (!user) return { ok: false, error: 'forbidden' };

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }

  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: 'Die Datei hat nicht das erwartete Format.' };

  const diff: ImportDiff[] = [];
  for (const table of BACKUP_TABLES) {
    const [row] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ${sql(table)}`;
    diff.push({
      table,
      current: row?.n ?? 0,
      incoming: parsed.data.tables[table]?.length ?? 0,
    });
  }

  return { ok: true, diff };
}

export async function importBackup(json: string): Promise<AdminResult> {
  const user = await guard('admin');
  if (!user) return fail('forbidden');

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return fail('Die Datei ist kein gültiges JSON.');
  }

  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) return fail('Die Datei hat nicht das erwartete Format.');

  try {
    // One transaction: a half-applied restore would leave the site in a state
    // nobody chose.
    await sql.begin(async (tx) => {
      // Reverse order so a table is never emptied while another still
      // references it.
      for (const table of [...BACKUP_TABLES].reverse()) {
        await tx`DELETE FROM ${tx(table)}`;
      }
      for (const table of BACKUP_TABLES) {
        const rows = parsed.data.tables[table] ?? [];
        for (const row of rows) {
          await tx`INSERT INTO ${tx(table)} ${tx(row as Record<string, unknown>)}`;
        }
      }
    });
  } catch (error) {
    console.error('[backup] import failed', error);
    return fail('Der Import ist fehlgeschlagen. Es wurde nichts geändert.');
  }

  await audit(user.id, 'import', 'backup', '', { tables: BACKUP_TABLES.length });
  for (const tag of Object.values(CACHE_TAGS)) revalidateTag(tag);
  return { ok: true };
}
