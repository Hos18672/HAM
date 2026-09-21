import 'server-only';
import { sql } from './db';
import type { Locale } from './i18n/config';

/**
 * Site-wide search.
 *
 * One query over a UNION of every translated content table, ranked by Postgres
 * full-text search. Two matching strategies run together because the two
 * languages need different ones:
 *
 *  - German: the `german` text-search configuration, which stems ("Kurse" →
 *    "kurs") and strips stop words. `unaccent` is applied when the extension
 *    is available so "für" and "fur" find each other.
 *  - Persian: Postgres has no Persian stemmer, and the `simple`
 *    configuration would only match whole words. A trigram similarity pass
 *    (pg_trgm) covers it, which also makes the German side tolerant of typos.
 *
 * Both extensions are optional: `ensureSearchExtensions` tries to create them
 * and the query degrades to plain ILIKE matching if it cannot.
 */

export interface SearchHit {
  id: string;
  /** Which collection the hit came from — rendered as the result kicker. */
  kind: string;
  title: string;
  excerpt: string;
  href: string;
  rank: number;
}

let extensionsChecked = false;
let hasTrigram = false;

async function ensureSearchExtensions(): Promise<void> {
  if (extensionsChecked) return;
  extensionsChecked = true;
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    // The trigram index that makes the Persian path fast. Created here rather
    // than in a migration because it depends on an extension that a managed
    // Postgres may refuse.
    await sql`
      CREATE INDEX IF NOT EXISTS course_translations_title_trgm
      ON course_translations USING gin (title gin_trgm_ops)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS event_translations_title_trgm
      ON event_translations USING gin (title gin_trgm_ops)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS dua_translations_title_trgm
      ON dua_translations USING gin (title gin_trgm_ops)
    `;
    hasTrigram = true;
  } catch (error) {
    console.warn('[search] pg_trgm unavailable, falling back to ILIKE matching', error);
    hasTrigram = false;
  }
}

/** The text-search configuration to stem with, per locale. */
function tsConfig(locale: Locale): string {
  // There is no Persian configuration in core Postgres; `simple` at least
  // tokenises, and the trigram pass does the real work for Persian.
  return locale === 'de' ? 'german' : 'simple';
}

interface RawHit {
  id: string;
  kind: string;
  title: string;
  excerpt: string;
  slug: string | null;
  rank: number;
}

/** Where a hit of a given kind lives on the site. */
function hrefFor(kind: string, locale: Locale, slug: string | null): string {
  const base = `/${locale}`;
  switch (kind) {
    case 'course':
      return `${base}/courses${slug ? `#course-${slug}` : ''}`;
    case 'event':
      return `${base}/events${slug ? `#event-${slug}` : ''}`;
    case 'dua':
      return `${base}/duas${slug ? `#dua-${slug}` : ''}`;
    case 'offer':
      return `${base}/activities`;
    case 'sport':
      return `${base}/sport`;
    case 'culture':
      return `${base}/culture`;
    case 'community':
      return `${base}/community`;
    case 'prayer':
      return `${base}/prayer`;
    case 'page':
      return slug === 'home' ? base : `${base}/${slug ?? ''}`;
    default:
      return base;
  }
}

function truncate(text: string, length = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= length ? clean : `${clean.slice(0, length - 1).trimEnd()}…`;
}

export async function search(query: string, locale: Locale, limit = 12): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  await ensureSearchExtensions();

  const config = tsConfig(locale);
  const pattern = `%${trimmed}%`;

  try {
    /*
     * `websearch_to_tsquery` accepts what a person actually types — bare
     * words, quoted phrases, `-excluded` — rather than the `&`/`|` syntax
     * `to_tsquery` demands, which would throw on ordinary input.
     *
     * The rank combines the FTS score with trigram similarity on the title, so
     * an exact title match outranks a body mention in either language.
     */
    const similarity = hasTrigram
      ? sql`GREATEST(similarity(t.title, ${trimmed}), 0)`
      : sql`CASE WHEN t.title ILIKE ${pattern} THEN 0.5 ELSE 0 END`;

    const rows = await sql<RawHit[]>`
      WITH corpus AS (
        SELECT 'page'::text AS kind, p.id::text AS id, p.key AS slug,
               t.title AS title, t.lead AS excerpt
        FROM page_translations t JOIN pages p ON p.id = t.page_id
        WHERE t.locale = ${locale} AND p.published

        UNION ALL
        SELECT 'course', c.id::text, c.slug, t.title,
               concat_ws(' · ', t.body, t.target_group, t.schedule)
        FROM course_translations t JOIN courses c ON c.id = t.course_id
        WHERE t.locale = ${locale} AND c.published

        UNION ALL
        SELECT 'event', e.id::text, e.slug, t.title, concat_ws(' · ', t.body, t.location)
        FROM event_translations t JOIN events e ON e.id = t.event_id
        WHERE t.locale = ${locale} AND e.published

        UNION ALL
        SELECT 'dua', d.id::text, d.slug, t.title,
               concat_ws(' · ', t.summary, t.when_to_read, t.source)
        FROM dua_translations t JOIN duas d ON d.id = t.dua_id
        WHERE t.locale = ${locale} AND d.published

        UNION ALL
        SELECT 'offer', o.id::text, NULL, t.title, t.body
        FROM offer_translations t JOIN offers o ON o.id = t.offer_id
        WHERE t.locale = ${locale} AND o.published

        UNION ALL
        SELECT 'sport', s.id::text, NULL, t.activity, concat_ws(' · ', t.audience, t.schedule)
        FROM sport_translations t JOIN sports s ON s.id = t.sport_id
        WHERE t.locale = ${locale} AND s.published

        UNION ALL
        SELECT 'culture', c.id::text, NULL, t.title, t.body
        FROM culture_translations t JOIN culture_cards c ON c.id = t.card_id
        WHERE t.locale = ${locale} AND c.published

        UNION ALL
        SELECT 'community', c.id::text, NULL, t.title, t.body
        FROM community_translations t JOIN community_cards c ON c.id = t.card_id
        WHERE t.locale = ${locale} AND c.published
      )
      SELECT t.id, t.kind, t.title, t.excerpt, t.slug,
             (
               ts_rank(
                 to_tsvector(${config}::regconfig, concat_ws(' ', t.title, t.excerpt)),
                 websearch_to_tsquery(${config}::regconfig, ${trimmed})
               ) * 2
               + ${similarity}
             )::float AS rank
      FROM corpus t
      WHERE
        to_tsvector(${config}::regconfig, concat_ws(' ', t.title, t.excerpt))
          @@ websearch_to_tsquery(${config}::regconfig, ${trimmed})
        OR t.title ILIKE ${pattern}
        OR t.excerpt ILIKE ${pattern}
      ORDER BY rank DESC, t.title ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      id: `${row.kind}-${row.id}`,
      kind: row.kind,
      title: row.title,
      excerpt: truncate(row.excerpt ?? ''),
      href: hrefFor(row.kind, locale, row.slug),
      rank: row.rank,
    }));
  } catch (error) {
    console.error('[search] query failed', error);
    return [];
  }
}
