import * as s from './schema';
import type { EntityKind } from '../validation/content';

/**
 * The map from an `entity` name in a request to the real tables behind it.
 *
 * Everything generic — the in-place editor, the list editors, the reordering
 * buttons — goes through this table. Two properties make it safe: the entity
 * name is a closed enum, and the field name is looked up in `fields` rather
 * than interpolated, so no request can reach a column that is not listed here.
 */

export interface EntityDefinition {
  /** The base (language-independent) table. */
  base: string;
  /** The translations table, keyed by (fk, locale). */
  translations: string;
  /** Foreign key column on the translations table. */
  fk: string;
  /** Translatable columns, by the name a request may use. */
  fields: Record<string, string>;
  /** Base columns a request may write (sort excluded — it has its own ops). */
  baseFields: Record<string, string>;
  /** Column that scopes a nested list, if any (programme items → event_id). */
  parentColumn?: string;
  /** Whether the base table has a `sort` column to reorder by. */
  sortable: boolean;
  /** Defaults used when adding a blank row. */
  defaults?: Record<string, unknown>;
  /** The cache tag to revalidate after a write. */
  tag: string;
}

export const ENTITIES: Record<EntityKind, EntityDefinition> = {
  page: {
    base: 'pages',
    translations: 'page_translations',
    fk: 'page_id',
    fields: { kicker: 'kicker', title: 'title', lead: 'lead' },
    baseFields: { published: 'published' },
    sortable: true,
    tag: 'pages',
  },
  block: {
    base: 'content_blocks',
    translations: 'block_translations',
    fk: 'block_id',
    // Blocks store a jsonb `value`; `text` and `items` are the two shapes,
    // unwrapped by the action rather than mapped to a column directly.
    fields: { text: 'value', items: 'value' },
    baseFields: {},
    sortable: true,
    tag: 'blocks',
  },
  offer: {
    base: 'offers',
    translations: 'offer_translations',
    fk: 'offer_id',
    fields: { title: 'title', body: 'body' },
    baseFields: { icon: 'icon', published: 'published' },
    sortable: true,
    defaults: { icon: 'Sparkle' },
    tag: 'offers',
  },
  course: {
    base: 'courses',
    translations: 'course_translations',
    fk: 'course_id',
    fields: {
      title: 'title',
      body: 'body',
      targetGroup: 'target_group',
      schedule: 'schedule',
      languages: 'languages',
    },
    baseFields: { category: 'category', level: 'level', published: 'published', slug: 'slug' },
    sortable: true,
    defaults: { category: 'language', level: '' },
    tag: 'courses',
  },
  event: {
    base: 'events',
    translations: 'event_translations',
    fk: 'event_id',
    fields: { title: 'title', body: 'body', location: 'location' },
    baseFields: {
      category: 'category',
      featured: 'featured',
      published: 'published',
      slug: 'slug',
      startsAt: 'starts_at',
      endsAt: 'ends_at',
      imageId: 'image_id',
    },
    // Events are ordered by date, not by a sort column.
    sortable: false,
    defaults: { category: 'general' },
    tag: 'events',
  },
  programme: {
    base: 'programme_items',
    translations: 'programme_translations',
    fk: 'item_id',
    fields: { timeLabel: 'time_label', title: 'title' },
    baseFields: {},
    parentColumn: 'event_id',
    sortable: true,
    tag: 'events',
  },
  sport: {
    base: 'sports',
    translations: 'sport_translations',
    fk: 'sport_id',
    fields: { activity: 'activity', audience: 'audience', schedule: 'schedule' },
    baseFields: { published: 'published' },
    sortable: true,
    tag: 'sports',
  },
  culture: {
    base: 'culture_cards',
    translations: 'culture_translations',
    fk: 'card_id',
    fields: { title: 'title', body: 'body' },
    baseFields: { published: 'published' },
    sortable: true,
    tag: 'culture',
  },
  community: {
    base: 'community_cards',
    translations: 'community_translations',
    fk: 'card_id',
    fields: { title: 'title', body: 'body' },
    baseFields: { published: 'published' },
    sortable: true,
    tag: 'community',
  },
  values: {
    base: 'values_items',
    translations: 'values_translations',
    fk: 'item_id',
    fields: { title: 'title', body: 'body' },
    baseFields: {},
    sortable: true,
    tag: 'values',
  },
  week: {
    base: 'week_schedule',
    translations: 'week_translations',
    fk: 'row_id',
    fields: { label: 'label', detail: 'detail' },
    baseFields: { weekday: 'weekday' },
    sortable: true,
    tag: 'week',
  },
  dua: {
    base: 'duas',
    translations: 'dua_translations',
    fk: 'dua_id',
    fields: {
      title: 'title',
      summary: 'summary',
      whenToRead: 'when_to_read',
      source: 'source',
      translation: 'translation',
    },
    baseFields: {
      category: 'category',
      arabicTitle: 'arabic_title',
      arabicText: 'arabic_text',
      transliteration: 'transliteration',
      published: 'published',
      slug: 'slug',
    },
    sortable: true,
    defaults: { category: 'dua', arabic_title: '' },
    tag: 'duas',
  },
  occasion: {
    base: 'occasions',
    translations: 'occasion_translations',
    fk: 'occasion_id',
    fields: { name: 'name', note: 'note' },
    baseFields: { hijriMonth: 'hijri_month', hijriDay: 'hijri_day' },
    sortable: true,
    defaults: { hijri_month: 1, hijri_day: 1 },
    tag: 'occasions',
  },
  gallery: {
    base: 'gallery_items',
    // Gallery captions live on the media row, shared by every use of the image.
    translations: 'media_translations',
    fk: 'media_id',
    fields: { alt: 'alt', caption: 'caption' },
    baseFields: { category: 'category', published: 'published', mediaId: 'media_id' },
    sortable: true,
    tag: 'gallery',
  },
  media: {
    base: 'media',
    translations: 'media_translations',
    fk: 'media_id',
    fields: { alt: 'alt', caption: 'caption' },
    baseFields: {},
    sortable: false,
    tag: 'gallery',
  },
  membership: {
    base: 'memberships',
    translations: 'membership_translations',
    fk: 'membership_id',
    fields: { title: 'title', priceLabel: 'price_label' },
    baseFields: { tierKey: 'tier_key' },
    sortable: true,
    tag: 'memberships',
  },
};

/** Drizzle table objects, for the queries that are easier written typed. */
export const DRIZZLE_TABLES = {
  page: s.pages,
  block: s.contentBlocks,
  offer: s.offers,
  course: s.courses,
  event: s.events,
  programme: s.programmeItems,
  sport: s.sports,
  culture: s.cultureCards,
  community: s.communityCards,
  values: s.valuesItems,
  week: s.weekSchedule,
  dua: s.duas,
  occasion: s.occasions,
  gallery: s.galleryItems,
  media: s.media,
  membership: s.memberships,
} as const;
