import 'server-only';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';
import { db, sql } from '../index';
import * as s from '../schema';
import type { Locale } from '../../i18n/config';

/**
 * Admin reads.
 *
 * Deliberately uncached: an editor must see what they have just written, not
 * what the public cache still holds. These are the only queries in the app
 * that bypass `unstable_cache`.
 */

/* ─── Dashboard ──────────────────────────────────────────────────────────── */

export interface AreaTile {
  key: string;
  /** German label — the admin is German-only. */
  label: string;
  group: 'Website' | 'Startseite' | 'Programm' | 'Verein';
  href: string;
  /** How many editable fields the area holds, across both languages. */
  fieldCount: number;
  entryCount: number;
}

/** Count rows in a base table and multiply by its translatable fields. */
async function tally(table: string, fieldsPerEntry: number): Promise<{ entries: number; fields: number }> {
  try {
    const [row] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM ${sql(table)}`;
    const entries = row?.n ?? 0;
    // Both languages, hence the ×2.
    return { entries, fields: entries * fieldsPerEntry * 2 };
  } catch {
    return { entries: 0, fields: 0 };
  }
}

export async function getAreaTiles(): Promise<AreaTile[]> {
  const [pages, blocks, offers, courses, events, sports, culture, community, values, week, duas, occasions, gallery, memberships] =
    await Promise.all([
      tally('pages', 3),
      tally('content_blocks', 1),
      tally('offers', 2),
      tally('courses', 5),
      tally('events', 3),
      tally('sports', 3),
      tally('culture_cards', 2),
      tally('community_cards', 2),
      tally('values_items', 2),
      tally('week_schedule', 2),
      tally('duas', 4),
      tally('occasions', 2),
      tally('gallery_items', 2),
      tally('memberships', 2),
    ]);

  return [
    { key: 'pages', label: 'Seitenköpfe', group: 'Website', href: '/admin/content/pages', ...pick(pages) },
    { key: 'blocks', label: 'Textbausteine', group: 'Startseite', href: '/admin/content/blocks', ...pick(blocks) },
    { key: 'offers', label: 'Angebote', group: 'Startseite', href: '/admin/content/offers', ...pick(offers) },
    { key: 'courses', label: 'Kurse', group: 'Programm', href: '/admin/content/courses', ...pick(courses) },
    { key: 'events', label: 'Termine', group: 'Programm', href: '/admin/content/events', ...pick(events) },
    { key: 'sports', label: 'Sport', group: 'Programm', href: '/admin/content/sports', ...pick(sports) },
    { key: 'culture', label: 'Kultur', group: 'Programm', href: '/admin/content/culture', ...pick(culture) },
    { key: 'duas', label: 'Bittgebete', group: 'Programm', href: '/admin/content/duas', ...pick(duas) },
    { key: 'occasions', label: 'Gedenktage', group: 'Programm', href: '/admin/content/occasions', ...pick(occasions) },
    { key: 'gallery', label: 'Galerie', group: 'Programm', href: '/admin/media', ...pick(gallery) },
    { key: 'community', label: 'Gemeinschaft', group: 'Verein', href: '/admin/content/community', ...pick(community) },
    { key: 'values', label: 'Werte', group: 'Verein', href: '/admin/content/values', ...pick(values) },
    { key: 'week', label: 'Wochenplan', group: 'Verein', href: '/admin/content/week', ...pick(week) },
    { key: 'memberships', label: 'Mitgliedsbeiträge', group: 'Verein', href: '/admin/content/memberships', ...pick(memberships) },
  ];
}

function pick(t: { entries: number; fields: number }) {
  return { entryCount: t.entries, fieldCount: t.fields };
}

/* ─── Submissions inbox ──────────────────────────────────────────────────── */

export type SubmissionRow = typeof s.submissions.$inferSelect;

export async function getSubmissions(
  status?: 'new' | 'read' | 'archived',
  limit = 100,
): Promise<SubmissionRow[]> {
  const query = db.select().from(s.submissions).orderBy(desc(s.submissions.createdAt)).limit(limit);
  return status ? query.where(eq(s.submissions.status, status)) : query;
}

export async function getSubmissionCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: s.submissions.status, n: count() })
    .from(s.submissions)
    .groupBy(s.submissions.status);
  const out: Record<string, number> = { new: 0, read: 0, archived: 0 };
  for (const row of rows) out[row.status] = Number(row.n);
  return out;
}

/** The next event, for the dashboard's at-a-glance line. */
export async function getNextEvent(locale: Locale) {
  const [row] = await db
    .select({
      id: s.events.id,
      startsAt: s.events.startsAt,
      title: s.eventTranslations.title,
    })
    .from(s.events)
    .leftJoin(
      s.eventTranslations,
      and(eq(s.eventTranslations.eventId, s.events.id), eq(s.eventTranslations.locale, locale)),
    )
    .where(and(eq(s.events.published, true), gte(s.events.startsAt, new Date())))
    .orderBy(asc(s.events.startsAt))
    .limit(1);
  return row ?? null;
}

/* ─── Audit log ──────────────────────────────────────────────────────────── */

export async function getAuditLog(limit = 200) {
  return db
    .select({
      id: s.auditLog.id,
      action: s.auditLog.action,
      entity: s.auditLog.entity,
      entityId: s.auditLog.entityId,
      diff: s.auditLog.diff,
      createdAt: s.auditLog.createdAt,
      userName: s.users.name,
      userEmail: s.users.email,
    })
    .from(s.auditLog)
    .leftJoin(s.users, eq(s.users.id, s.auditLog.userId))
    .orderBy(desc(s.auditLog.createdAt))
    .limit(limit);
}

/* ─── Users ──────────────────────────────────────────────────────────────── */

export async function getUsers() {
  return db
    .select({
      id: s.users.id,
      email: s.users.email,
      name: s.users.name,
      role: s.users.role,
      createdAt: s.users.createdAt,
    })
    .from(s.users)
    .orderBy(asc(s.users.createdAt));
}

/* ─── Media library ──────────────────────────────────────────────────────── */

export interface MediaRow {
  id: string;
  url: string;
  key: string;
  width: number;
  height: number;
  mime: string;
  createdAt: Date;
  alt: Record<Locale, string>;
  caption: Record<Locale, string>;
  /** How many places reference this image — shown before a delete. */
  usageCount: number;
  galleryItemId: string | null;
  category: string | null;
}

export async function getMediaLibrary(): Promise<MediaRow[]> {
  const rows = await db
    .select({
      id: s.media.id,
      url: s.media.url,
      key: s.media.key,
      width: s.media.width,
      height: s.media.height,
      mime: s.media.mime,
      createdAt: s.media.createdAt,
      galleryItemId: s.galleryItems.id,
      category: s.galleryItems.category,
    })
    .from(s.media)
    .leftJoin(s.galleryItems, eq(s.galleryItems.mediaId, s.media.id))
    .orderBy(desc(s.media.createdAt));

  if (rows.length === 0) return [];

  const translations = await db.select().from(s.mediaTranslations);
  const byMedia = new Map<string, { alt: Record<string, string>; caption: Record<string, string> }>();
  for (const translation of translations) {
    const entry = byMedia.get(translation.mediaId) ?? { alt: {}, caption: {} };
    entry.alt[translation.locale] = translation.alt;
    entry.caption[translation.locale] = translation.caption;
    byMedia.set(translation.mediaId, entry);
  }

  // Usage: gallery listings plus any event pointing at the image.
  const eventUsage = await db
    .select({ imageId: s.events.imageId, n: count() })
    .from(s.events)
    .groupBy(s.events.imageId);
  const eventCounts = new Map(
    eventUsage.filter((row) => row.imageId).map((row) => [row.imageId!, Number(row.n)]),
  );

  return rows.map((row) => {
    const translation = byMedia.get(row.id) ?? { alt: {}, caption: {} };
    return {
      ...row,
      alt: { fa: translation.alt.fa ?? '', de: translation.alt.de ?? '' },
      caption: { fa: translation.caption.fa ?? '', de: translation.caption.de ?? '' },
      usageCount: (row.galleryItemId ? 1 : 0) + (eventCounts.get(row.id) ?? 0),
    };
  });
}

/* ─── Global search across all content fields ────────────────────────────── */

export interface AdminHit {
  entity: string;
  id: string;
  locale: string;
  field: string;
  value: string;
  href: string;
}

/**
 * The admin's own search. Unlike the public one this looks in *both*
 * languages and in unpublished rows, because an editor is looking for a
 * string they remember typing, wherever it ended up.
 */
export async function adminSearch(term: string, limit = 50): Promise<AdminHit[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];
  const pattern = `%${trimmed}%`;

  const rows = await sql<{ entity: string; id: string; locale: string; field: string; value: string }[]>`
    SELECT 'page' AS entity, page_id::text AS id, locale::text, 'title' AS field, title AS value
      FROM page_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'page', page_id::text, locale::text, 'lead', lead
      FROM page_translations WHERE lead ILIKE ${pattern}
    UNION ALL
    SELECT 'offer', offer_id::text, locale::text, 'title', title
      FROM offer_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'offer', offer_id::text, locale::text, 'body', body
      FROM offer_translations WHERE body ILIKE ${pattern}
    UNION ALL
    SELECT 'course', course_id::text, locale::text, 'title', title
      FROM course_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'course', course_id::text, locale::text, 'body', body
      FROM course_translations WHERE body ILIKE ${pattern}
    UNION ALL
    SELECT 'event', event_id::text, locale::text, 'title', title
      FROM event_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'event', event_id::text, locale::text, 'body', body
      FROM event_translations WHERE body ILIKE ${pattern}
    UNION ALL
    SELECT 'dua', dua_id::text, locale::text, 'title', title
      FROM dua_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'dua', dua_id::text, locale::text, 'summary', summary
      FROM dua_translations WHERE summary ILIKE ${pattern}
    UNION ALL
    SELECT 'sport', sport_id::text, locale::text, 'activity', activity
      FROM sport_translations WHERE activity ILIKE ${pattern}
    UNION ALL
    SELECT 'culture', card_id::text, locale::text, 'title', title
      FROM culture_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'community', card_id::text, locale::text, 'title', title
      FROM community_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'values', item_id::text, locale::text, 'title', title
      FROM values_translations WHERE title ILIKE ${pattern}
    UNION ALL
    SELECT 'occasion', occasion_id::text, locale::text, 'name', name
      FROM occasion_translations WHERE name ILIKE ${pattern}
    UNION ALL
    SELECT 'membership', membership_id::text, locale::text, 'title', title
      FROM membership_translations WHERE title ILIKE ${pattern}
    LIMIT ${limit}
  `;

  const AREA: Record<string, string> = {
    page: 'pages',
    offer: 'offers',
    course: 'courses',
    event: 'events',
    dua: 'duas',
    sport: 'sports',
    culture: 'culture',
    community: 'community',
    values: 'values',
    occasion: 'occasions',
    membership: 'memberships',
  };

  return rows.map((row) => ({
    ...row,
    href: `/admin/content/${AREA[row.entity] ?? 'pages'}#${row.entity}-${row.id}`,
  }));
}

/* ─── Generic area loader for the list editors ───────────────────────────── */

export interface EditableRow {
  id: string;
  sort: number | null;
  /** Base-row fields the editor exposes (category, level, published …). */
  base: Record<string, unknown>;
  /** field → locale → value */
  fields: Record<string, Record<string, string>>;
}

/**
 * Load one content area in *both* languages at once.
 *
 * Returning field → locale → value is what lets the editor render German and
 * Persian side by side without the page knowing which tables are behind it.
 */
export async function getEditableRows(
  base: string,
  translations: string,
  fk: string,
  fields: Record<string, string>,
  sortable: boolean,
): Promise<EditableRow[]> {
  const baseRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM ${sql(base)} ORDER BY ${sortable ? sql`sort ASC` : sql`1`}
  `;
  if (baseRows.length === 0) return [];

  const translationRows = await sql<Record<string, unknown>[]>`
    SELECT * FROM ${sql(translations)}
  `;

  const byId = new Map<string, Record<string, Record<string, string>>>();
  for (const row of translationRows) {
    const id = String(row[fk]);
    const locale = String(row.locale);
    const entry = byId.get(id) ?? {};
    for (const [name, column] of Object.entries(fields)) {
      entry[name] = entry[name] ?? {};
      entry[name]![locale] = String(row[column] ?? '');
    }
    byId.set(id, entry);
  }

  return baseRows.map((row) => ({
    id: String(row.id),
    sort: typeof row.sort === 'number' ? row.sort : null,
    base: row,
    fields: byId.get(String(row.id)) ?? {},
  }));
}
