import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db } from '../index';
import type { Locale } from '../../i18n/config';
import * as s from '../schema';

/**
 * Public read queries.
 *
 * Every one of these resolves a base row together with its translation for one
 * locale, so a page component receives flat, ready-to-render objects and never
 * has to know about the two-table pattern. Results are cached with a tag per
 * area; a content write calls `revalidateTag` for that tag, which is what
 * makes the pages statically rendered but instantly correct after an edit.
 */

export const CACHE_TAGS = {
  settings: 'settings',
  pages: 'pages',
  blocks: 'blocks',
  offers: 'offers',
  courses: 'courses',
  events: 'events',
  sports: 'sports',
  culture: 'culture',
  community: 'community',
  values: 'values',
  week: 'week',
  duas: 'duas',
  occasions: 'occasions',
  gallery: 'gallery',
  memberships: 'memberships',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Wrap a query so it is cached under one tag and keyed by its arguments.
 *
 * The signature is deliberately pass-through: the wrapped function keeps its
 * own parameter and return types. Inferring them through a generic tuple would
 * contextually type the callback's own annotations away, which is how `limit`
 * ends up `unknown`.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function cached<T extends (...args: any[]) => Promise<unknown>>(
  keyParts: string[],
  tag: CacheTag,
  fn: T,
): T {
  return unstable_cache(fn, keyParts, { tags: [tag], revalidate: 3600 }) as T;
}

/* ─── Settings ───────────────────────────────────────────────────────────── */

export interface SiteSettings {
  defaultLocale: Locale;
  defaultTheme: 'light' | 'dark';
  showOpeningEvent: boolean;
  contactEmail: string;
  phone: string;
  address: string;
  iban: string;
  mapUrl: string;
}

export const FALLBACK_SETTINGS: SiteSettings = {
  defaultLocale: 'fa',
  defaultTheme: 'light',
  showOpeningEvent: true,
  contactEmail: '',
  phone: '',
  address: 'Sautergasse 34–38, 1170 Wien',
  iban: '',
  mapUrl: '',
};

export const getSettings = cached(['settings'], CACHE_TAGS.settings, async (): Promise<SiteSettings> => {
  try {
    const [row] = await db.select().from(s.siteSettings).limit(1);
    if (!row) return FALLBACK_SETTINGS;
    return {
      defaultLocale: row.defaultLocale,
      defaultTheme: row.defaultTheme,
      showOpeningEvent: row.showOpeningEvent,
      contactEmail: row.contactEmail,
      phone: row.phone,
      address: row.address,
      iban: row.iban,
      mapUrl: row.mapUrl,
    };
  } catch {
    // The site must render before the database exists — the first `next build`
    // runs against an empty environment.
    return FALLBACK_SETTINGS;
  }
});

/* ─── Pages & blocks ─────────────────────────────────────────────────────── */

export interface PageHeader {
  id: string;
  key: string;
  kicker: string;
  title: string;
  lead: string;
}

export const getPageHeader = cached(
  ['page-header'],
  CACHE_TAGS.pages,
  async (key: string, locale: Locale): Promise<PageHeader | null> => {
    const [row] = await db
      .select({
        id: s.pages.id,
        key: s.pages.key,
        kicker: s.pageTranslations.kicker,
        title: s.pageTranslations.title,
        lead: s.pageTranslations.lead,
      })
      .from(s.pages)
      .leftJoin(
        s.pageTranslations,
        and(eq(s.pageTranslations.pageId, s.pages.id), eq(s.pageTranslations.locale, locale)),
      )
      .where(eq(s.pages.key, key))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      key: row.key,
      kicker: row.kicker ?? '',
      title: row.title ?? '',
      lead: row.lead ?? '',
    };
  },
);

export interface Block {
  id: string;
  blockKey: string;
  kind: 'text' | 'richtext' | 'list';
  text: string;
  items: string[];
}

function readBlockValue(kind: Block['kind'], value: unknown): { text: string; items: string[] } {
  if (kind === 'list') {
    const items = (value as { items?: unknown })?.items;
    return { text: '', items: Array.isArray(items) ? items.map(String) : [] };
  }
  const text = (value as { text?: unknown })?.text;
  return { text: typeof text === 'string' ? text : '', items: [] };
}

export const getBlocks = cached(
  ['blocks'],
  CACHE_TAGS.blocks,
  async (pageKey: string, locale: Locale): Promise<Record<string, Block>> => {
    const rows = await db
      .select({
        id: s.contentBlocks.id,
        blockKey: s.contentBlocks.blockKey,
        kind: s.contentBlocks.kind,
        value: s.blockTranslations.value,
      })
      .from(s.contentBlocks)
      .leftJoin(
        s.blockTranslations,
        and(
          eq(s.blockTranslations.blockId, s.contentBlocks.id),
          eq(s.blockTranslations.locale, locale),
        ),
      )
      .where(eq(s.contentBlocks.pageKey, pageKey))
      .orderBy(asc(s.contentBlocks.sort));

    const out: Record<string, Block> = {};
    for (const row of rows) {
      const parsed = readBlockValue(row.kind, row.value);
      out[row.blockKey] = { id: row.id, blockKey: row.blockKey, kind: row.kind, ...parsed };
    }
    return out;
  },
);

/* ─── Offers ─────────────────────────────────────────────────────────────── */

export interface Offer {
  id: string;
  icon: string;
  title: string;
  body: string;
}

export const getOffers = cached(
  ['offers'],
  CACHE_TAGS.offers,
  async (locale: Locale, limit?: number): Promise<Offer[]> => {
    const q = db
      .select({
        id: s.offers.id,
        icon: s.offers.icon,
        title: s.offerTranslations.title,
        body: s.offerTranslations.body,
      })
      .from(s.offers)
      .leftJoin(
        s.offerTranslations,
        and(eq(s.offerTranslations.offerId, s.offers.id), eq(s.offerTranslations.locale, locale)),
      )
      .where(eq(s.offers.published, true))
      .orderBy(asc(s.offers.sort));
    const rows = limit ? await q.limit(limit) : await q;
    return rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title ?? '', body: r.body ?? '' }));
  },
);

/* ─── Courses ────────────────────────────────────────────────────────────── */

export interface Course {
  id: string;
  slug: string;
  category: string;
  level: string;
  title: string;
  body: string;
  targetGroup: string;
  schedule: string;
  languages: string;
}

export const getCourses = cached(
  ['courses'],
  CACHE_TAGS.courses,
  async (locale: Locale, limit?: number): Promise<Course[]> => {
    const q = db
      .select({
        id: s.courses.id,
        slug: s.courses.slug,
        category: s.courses.category,
        level: s.courses.level,
        title: s.courseTranslations.title,
        body: s.courseTranslations.body,
        targetGroup: s.courseTranslations.targetGroup,
        schedule: s.courseTranslations.schedule,
        languages: s.courseTranslations.languages,
      })
      .from(s.courses)
      .leftJoin(
        s.courseTranslations,
        and(
          eq(s.courseTranslations.courseId, s.courses.id),
          eq(s.courseTranslations.locale, locale),
        ),
      )
      .where(eq(s.courses.published, true))
      .orderBy(asc(s.courses.sort));
    const rows = limit ? await q.limit(limit) : await q;
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      category: r.category,
      level: r.level,
      title: r.title ?? '',
      body: r.body ?? '',
      targetGroup: r.targetGroup ?? '',
      schedule: r.schedule ?? '',
      languages: r.languages ?? '',
    }));
  },
);

/* ─── Events ─────────────────────────────────────────────────────────────── */

export interface ProgrammeItem {
  id: string;
  timeLabel: string;
  title: string;
}

/**
 * An event as a page renders it.
 *
 * Note the dates: `unstable_cache` stores its result as JSON, so a `Date`
 * that goes into the cache comes back out as a string. Rather than let that
 * surprise a component at render time, the cached layer below deals in ISO
 * strings (`CachedEvent`) and a thin uncached wrapper revives them here.
 */
export interface EventEntry {
  id: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  category: string;
  featured: boolean;
  title: string;
  body: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string;
  programme: ProgrammeItem[];
}

async function loadProgramme(
  eventIds: string[],
  locale: Locale,
): Promise<Map<string, ProgrammeItem[]>> {
  const out = new Map<string, ProgrammeItem[]>();
  if (eventIds.length === 0) return out;
  const rows = await db
    .select({
      id: s.programmeItems.id,
      eventId: s.programmeItems.eventId,
      timeLabel: s.programmeTranslations.timeLabel,
      title: s.programmeTranslations.title,
    })
    .from(s.programmeItems)
    .leftJoin(
      s.programmeTranslations,
      and(
        eq(s.programmeTranslations.itemId, s.programmeItems.id),
        eq(s.programmeTranslations.locale, locale),
      ),
    )
    .where(inArray(s.programmeItems.eventId, eventIds))
    .orderBy(asc(s.programmeItems.sort));

  for (const row of rows) {
    const list = out.get(row.eventId) ?? [];
    list.push({ id: row.id, timeLabel: row.timeLabel ?? '', title: row.title ?? '' });
    out.set(row.eventId, list);
  }
  return out;
}

function baseEventSelect() {
  return db
    .select({
      id: s.events.id,
      slug: s.events.slug,
      startsAt: s.events.startsAt,
      endsAt: s.events.endsAt,
      category: s.events.category,
      featured: s.events.featured,
      title: s.eventTranslations.title,
      body: s.eventTranslations.body,
      location: s.eventTranslations.location,
      imageUrl: s.media.url,
      imageAlt: s.mediaTranslations.alt,
    })
    .from(s.events);
}

function joinEvent<T extends ReturnType<typeof baseEventSelect>>(q: T, locale: Locale) {
  return q
    .leftJoin(
      s.eventTranslations,
      and(eq(s.eventTranslations.eventId, s.events.id), eq(s.eventTranslations.locale, locale)),
    )
    .leftJoin(s.media, eq(s.media.id, s.events.imageId))
    .leftJoin(
      s.mediaTranslations,
      and(eq(s.mediaTranslations.mediaId, s.media.id), eq(s.mediaTranslations.locale, locale)),
    );
}

/** The same event, as it survives a trip through the JSON cache. */
export type CachedEvent = Omit<EventEntry, 'startsAt' | 'endsAt'> & {
  startsAt: string;
  endsAt: string | null;
};

/** Revive the ISO strings the cache hands back into real Dates. */
function reviveEvent(event: CachedEvent): EventEntry {
  return {
    ...event,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
  };
}

/**
 * The shape one event row comes back in. Written out rather than derived from
 * the select builder: before the left joins are applied the joined columns are
 * typed `never`, which is not what the query actually returns.
 */
interface RawEventRow {
  id: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  category: string;
  featured: boolean;
  title: string | null;
  body: string | null;
  location: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

async function hydrateEvents(rows: RawEventRow[], locale: Locale): Promise<CachedEvent[]> {
  const programme = await loadProgramme(
    rows.map((r) => r.id),
    locale,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
    category: r.category,
    featured: r.featured,
    title: r.title ?? '',
    body: r.body ?? '',
    location: r.location ?? '',
    imageUrl: r.imageUrl ?? null,
    imageAlt: r.imageAlt ?? '',
    programme: programme.get(r.id) ?? [],
  }));
}

const getUpcomingEventsCached = cached(
  ['events-upcoming'],
  CACHE_TAGS.events,
  async (locale: Locale, limit: number = 20): Promise<CachedEvent[]> => {
    const rows = await joinEvent(baseEventSelect(), locale)
      .where(and(eq(s.events.published, true), gte(s.events.startsAt, new Date())))
      .orderBy(asc(s.events.startsAt))
      .limit(limit);
    return hydrateEvents(rows, locale);
  },
);

const getPastEventsCached = cached(
  ['events-past'],
  CACHE_TAGS.events,
  async (locale: Locale, limit: number = 20): Promise<CachedEvent[]> => {
    const rows = await joinEvent(baseEventSelect(), locale)
      .where(and(eq(s.events.published, true), lt(s.events.startsAt, new Date())))
      .orderBy(desc(s.events.startsAt))
      .limit(limit);
    return hydrateEvents(rows, locale);
  },
);

const getFeaturedEventCached = cached(
  ['event-featured'],
  CACHE_TAGS.events,
  async (locale: Locale): Promise<CachedEvent | null> => {
    const rows = await joinEvent(baseEventSelect(), locale)
      .where(and(eq(s.events.published, true), eq(s.events.featured, true)))
      .orderBy(asc(s.events.startsAt))
      .limit(1);
    const hydrated = await hydrateEvents(rows, locale);
    return hydrated[0] ?? null;
  },
);

export async function getUpcomingEvents(locale: Locale, limit = 20): Promise<EventEntry[]> {
  return (await getUpcomingEventsCached(locale, limit)).map(reviveEvent);
}

export async function getPastEvents(locale: Locale, limit = 20): Promise<EventEntry[]> {
  return (await getPastEventsCached(locale, limit)).map(reviveEvent);
}

/** The highlighted opening event, if the admin has one marked and visible. */
export async function getFeaturedEvent(locale: Locale): Promise<EventEntry | null> {
  const event = await getFeaturedEventCached(locale);
  return event ? reviveEvent(event) : null;
}

/* ─── Simple card collections ────────────────────────────────────────────── */

export interface SportEntry {
  id: string;
  activity: string;
  audience: string;
  schedule: string;
}

export const getSports = cached(
  ['sports'],
  CACHE_TAGS.sports,
  async (locale: Locale): Promise<SportEntry[]> => {
    const rows = await db
      .select({
        id: s.sports.id,
        activity: s.sportTranslations.activity,
        audience: s.sportTranslations.audience,
        schedule: s.sportTranslations.schedule,
      })
      .from(s.sports)
      .leftJoin(
        s.sportTranslations,
        and(eq(s.sportTranslations.sportId, s.sports.id), eq(s.sportTranslations.locale, locale)),
      )
      .where(eq(s.sports.published, true))
      .orderBy(asc(s.sports.sort));
    return rows.map((r) => ({
      id: r.id,
      activity: r.activity ?? '',
      audience: r.audience ?? '',
      schedule: r.schedule ?? '',
    }));
  },
);

export interface TitledCard {
  id: string;
  title: string;
  body: string;
}

export const getCultureCards = cached(
  ['culture'],
  CACHE_TAGS.culture,
  async (locale: Locale): Promise<TitledCard[]> => {
    const rows = await db
      .select({
        id: s.cultureCards.id,
        title: s.cultureTranslations.title,
        body: s.cultureTranslations.body,
      })
      .from(s.cultureCards)
      .leftJoin(
        s.cultureTranslations,
        and(
          eq(s.cultureTranslations.cardId, s.cultureCards.id),
          eq(s.cultureTranslations.locale, locale),
        ),
      )
      .where(eq(s.cultureCards.published, true))
      .orderBy(asc(s.cultureCards.sort));
    return rows.map((r) => ({ id: r.id, title: r.title ?? '', body: r.body ?? '' }));
  },
);

export const getCommunityCards = cached(
  ['community'],
  CACHE_TAGS.community,
  async (locale: Locale): Promise<TitledCard[]> => {
    const rows = await db
      .select({
        id: s.communityCards.id,
        title: s.communityTranslations.title,
        body: s.communityTranslations.body,
      })
      .from(s.communityCards)
      .leftJoin(
        s.communityTranslations,
        and(
          eq(s.communityTranslations.cardId, s.communityCards.id),
          eq(s.communityTranslations.locale, locale),
        ),
      )
      .where(eq(s.communityCards.published, true))
      .orderBy(asc(s.communityCards.sort));
    return rows.map((r) => ({ id: r.id, title: r.title ?? '', body: r.body ?? '' }));
  },
);

export const getValues = cached(
  ['values'],
  CACHE_TAGS.values,
  async (locale: Locale): Promise<TitledCard[]> => {
    const rows = await db
      .select({
        id: s.valuesItems.id,
        title: s.valuesTranslations.title,
        body: s.valuesTranslations.body,
      })
      .from(s.valuesItems)
      .leftJoin(
        s.valuesTranslations,
        and(
          eq(s.valuesTranslations.itemId, s.valuesItems.id),
          eq(s.valuesTranslations.locale, locale),
        ),
      )
      .orderBy(asc(s.valuesItems.sort));
    return rows.map((r) => ({ id: r.id, title: r.title ?? '', body: r.body ?? '' }));
  },
);

export interface WeekRow {
  id: string;
  weekday: number;
  label: string;
  detail: string;
}

export const getWeekSchedule = cached(
  ['week'],
  CACHE_TAGS.week,
  async (locale: Locale): Promise<WeekRow[]> => {
    const rows = await db
      .select({
        id: s.weekSchedule.id,
        weekday: s.weekSchedule.weekday,
        label: s.weekTranslations.label,
        detail: s.weekTranslations.detail,
      })
      .from(s.weekSchedule)
      .leftJoin(
        s.weekTranslations,
        and(
          eq(s.weekTranslations.rowId, s.weekSchedule.id),
          eq(s.weekTranslations.locale, locale),
        ),
      )
      .orderBy(asc(s.weekSchedule.sort));
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      label: r.label ?? '',
      detail: r.detail ?? '',
    }));
  },
);

/* ─── Du'as ──────────────────────────────────────────────────────────────── */

export interface DuaEntry {
  id: string;
  slug: string;
  category: 'dua' | 'ziyara' | 'taqib';
  arabicTitle: string;
  title: string;
  summary: string;
  whenToRead: string;
  source: string;
}

export const getDuas = cached(
  ['duas'],
  CACHE_TAGS.duas,
  async (locale: Locale): Promise<DuaEntry[]> => {
    const rows = await db
      .select({
        id: s.duas.id,
        slug: s.duas.slug,
        category: s.duas.category,
        arabicTitle: s.duas.arabicTitle,
        title: s.duaTranslations.title,
        summary: s.duaTranslations.summary,
        whenToRead: s.duaTranslations.whenToRead,
        source: s.duaTranslations.source,
      })
      .from(s.duas)
      .leftJoin(
        s.duaTranslations,
        and(eq(s.duaTranslations.duaId, s.duas.id), eq(s.duaTranslations.locale, locale)),
      )
      .where(eq(s.duas.published, true))
      .orderBy(asc(s.duas.sort));
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      category: r.category,
      arabicTitle: r.arabicTitle,
      title: r.title ?? '',
      summary: r.summary ?? '',
      whenToRead: r.whenToRead ?? '',
      source: r.source ?? '',
    }));
  },
);

/* ─── Occasions ──────────────────────────────────────────────────────────── */

export interface Occasion {
  id: string;
  hijriMonth: number;
  hijriDay: number;
  name: string;
  note: string;
}

export const getOccasions = cached(
  ['occasions'],
  CACHE_TAGS.occasions,
  async (locale: Locale): Promise<Occasion[]> => {
    const rows = await db
      .select({
        id: s.occasions.id,
        hijriMonth: s.occasions.hijriMonth,
        hijriDay: s.occasions.hijriDay,
        name: s.occasionTranslations.name,
        note: s.occasionTranslations.note,
      })
      .from(s.occasions)
      .leftJoin(
        s.occasionTranslations,
        and(
          eq(s.occasionTranslations.occasionId, s.occasions.id),
          eq(s.occasionTranslations.locale, locale),
        ),
      )
      .orderBy(asc(s.occasions.hijriMonth), asc(s.occasions.hijriDay));
    return rows.map((r) => ({
      id: r.id,
      hijriMonth: r.hijriMonth,
      hijriDay: r.hijriDay,
      name: r.name ?? '',
      note: r.note ?? '',
    }));
  },
);

/* ─── Gallery ────────────────────────────────────────────────────────────── */

export interface GalleryEntry {
  id: string;
  mediaId: string;
  category: string;
  url: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
  alt: string;
  caption: string;
}

export const getGallery = cached(
  ['gallery'],
  CACHE_TAGS.gallery,
  async (locale: Locale): Promise<GalleryEntry[]> => {
    const rows = await db
      .select({
        id: s.galleryItems.id,
        mediaId: s.media.id,
        category: s.galleryItems.category,
        url: s.media.url,
        width: s.media.width,
        height: s.media.height,
        blurDataUrl: s.media.blurDataUrl,
        alt: s.mediaTranslations.alt,
        caption: s.mediaTranslations.caption,
      })
      .from(s.galleryItems)
      .innerJoin(s.media, eq(s.media.id, s.galleryItems.mediaId))
      .leftJoin(
        s.mediaTranslations,
        and(eq(s.mediaTranslations.mediaId, s.media.id), eq(s.mediaTranslations.locale, locale)),
      )
      .where(eq(s.galleryItems.published, true))
      .orderBy(asc(s.galleryItems.sort));
    return rows.map((r) => ({
      id: r.id,
      mediaId: r.mediaId,
      category: r.category,
      url: r.url,
      width: r.width,
      height: r.height,
      blurDataUrl: r.blurDataUrl,
      alt: r.alt ?? '',
      caption: r.caption ?? '',
    }));
  },
);

/* ─── Membership tiers ───────────────────────────────────────────────────── */

export interface MembershipTier {
  id: string;
  tierKey: string;
  title: string;
  priceLabel: string;
  benefits: string[];
}

export const getMemberships = cached(
  ['memberships'],
  CACHE_TAGS.memberships,
  async (locale: Locale): Promise<MembershipTier[]> => {
    const rows = await db
      .select({
        id: s.memberships.id,
        tierKey: s.memberships.tierKey,
        title: s.membershipTranslations.title,
        priceLabel: s.membershipTranslations.priceLabel,
        benefits: s.membershipTranslations.benefits,
      })
      .from(s.memberships)
      .leftJoin(
        s.membershipTranslations,
        and(
          eq(s.membershipTranslations.membershipId, s.memberships.id),
          eq(s.membershipTranslations.locale, locale),
        ),
      )
      .orderBy(asc(s.memberships.sort));
    return rows.map((r) => ({
      id: r.id,
      tierKey: r.tierKey,
      title: r.title ?? '',
      priceLabel: r.priceLabel ?? '',
      benefits: Array.isArray(r.benefits) ? (r.benefits as unknown[]).map(String) : [],
    }));
  },
);
