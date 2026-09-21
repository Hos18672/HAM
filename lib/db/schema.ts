/**
 * Drizzle schema — Haus aller Menschen.
 *
 * Every content entity follows one pattern: a base row holding the stable,
 * language-independent fields (slug, sort order, dates, image refs, publish
 * flag) plus a `*_translations` table keyed by (entity_id, locale) holding all
 * human-readable text. That split is what makes the admin's side-by-side
 * FA/DE editing possible and keeps the two languages from drifting: adding or
 * reordering an entry touches the base row only, so it applies to both locales
 * at once.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/* ─── Enums ──────────────────────────────────────────────────────────────── */

export const localeEnum = pgEnum('locale', ['fa', 'de']);
export const roleEnum = pgEnum('user_role', ['admin', 'editor']);
export const themeEnum = pgEnum('theme', ['light', 'dark']);
export const blockKindEnum = pgEnum('block_kind', ['text', 'richtext', 'list']);
export const duaCategoryEnum = pgEnum('dua_category', ['dua', 'ziyara', 'taqib']);
export const submissionKindEnum = pgEnum('submission_kind', [
  'contact',
  'membership',
  'donation',
  'volunteer',
]);
export const submissionStatusEnum = pgEnum('submission_status', ['new', 'read', 'archived']);

export const LOCALES = ['fa', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

/* Shared column builders. `sort` and `published` appear on every list entity
   and are always indexed — the public queries filter and order on them. */
const id = () => uuid('id').primaryKey().defaultRandom();
const sort = () => integer('sort').notNull().default(0);
const published = () => boolean('published').notNull().default(true);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/* ─── Users & auth ───────────────────────────────────────────────────────── */

export const users = pgTable(
  'users',
  {
    id: id(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    role: roleEnum('role').notNull().default('editor'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_uq').on(sql`lower(${t.email})`)],
);

/** Auth.js adapter table. The JWT strategy does not require it, but keeping it
 *  means switching to database sessions later is a config change, not a
 *  migration. */
export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/* ─── Settings ───────────────────────────────────────────────────────────── */

/** Singleton. Enforced by a check on a fixed id in the seed, not by a
 *  constraint, so a restore can rewrite the row in place. */
export const siteSettings = pgTable('site_settings', {
  id: integer('id').primaryKey().default(1),
  defaultLocale: localeEnum('default_locale').notNull().default('fa'),
  defaultTheme: themeEnum('default_theme').notNull().default('light'),
  showOpeningEvent: boolean('show_opening_event').notNull().default(true),
  contactEmail: varchar('contact_email', { length: 255 }).notNull().default(''),
  phone: varchar('phone', { length: 64 }).notNull().default(''),
  address: text('address').notNull().default(''),
  iban: varchar('iban', { length: 64 }).notNull().default(''),
  mapUrl: text('map_url').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

/* ─── Pages & free-form content blocks ───────────────────────────────────── */

export const pages = pgTable(
  'pages',
  {
    id: id(),
    key: varchar('key', { length: 64 }).notNull().unique(),
    sort: sort(),
    published: published(),
  },
  (t) => [index('pages_published_sort_idx').on(t.published, t.sort)],
);

export const pageTranslations = pgTable(
  'page_translations',
  {
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    kicker: text('kicker').notNull().default(''),
    title: text('title').notNull().default(''),
    lead: text('lead').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.locale] })],
);

export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: id(),
    pageKey: varchar('page_key', { length: 64 }).notNull(),
    blockKey: varchar('block_key', { length: 96 }).notNull(),
    kind: blockKindEnum('kind').notNull().default('text'),
    sort: sort(),
  },
  (t) => [
    uniqueIndex('content_blocks_page_block_uq').on(t.pageKey, t.blockKey),
    index('content_blocks_page_sort_idx').on(t.pageKey, t.sort),
  ],
);

/** `value` is jsonb so one table can carry a paragraph, a rich-text document
 *  and a string list without three near-identical tables. `kind` says how to
 *  read it: text/richtext → { text }, list → { items: string[] }. */
export const blockTranslations = pgTable(
  'block_translations',
  {
    blockId: uuid('block_id')
      .notNull()
      .references(() => contentBlocks.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    value: jsonb('value').notNull().default({}),
  },
  (t) => [primaryKey({ columns: [t.blockId, t.locale] })],
);

/* ─── Media ──────────────────────────────────────────────────────────────── */

export const media = pgTable(
  'media',
  {
    id: id(),
    url: text('url').notNull(),
    key: text('key').notNull(),
    width: integer('width').notNull().default(0),
    height: integer('height').notNull().default(0),
    mime: varchar('mime', { length: 128 }).notNull(),
    blurDataUrl: text('blur_data_url'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('media_created_idx').on(t.createdAt)],
);

export const mediaTranslations = pgTable(
  'media_translations',
  {
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    alt: text('alt').notNull().default(''),
    caption: text('caption').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.locale] })],
);

export const galleryItems = pgTable(
  'gallery_items',
  {
    id: id(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 64 }).notNull().default('general'),
    sort: sort(),
    published: published(),
  },
  (t) => [
    index('gallery_published_sort_idx').on(t.published, t.sort),
    index('gallery_category_idx').on(t.category),
  ],
);

/* ─── Offers (areas of work) ─────────────────────────────────────────────── */

export const offers = pgTable(
  'offers',
  {
    id: id(),
    icon: varchar('icon', { length: 64 }).notNull().default('Sparkle'),
    sort: sort(),
    published: published(),
  },
  (t) => [index('offers_published_sort_idx').on(t.published, t.sort)],
);

export const offerTranslations = pgTable(
  'offer_translations',
  {
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.offerId, t.locale] })],
);

/* ─── Courses ────────────────────────────────────────────────────────────── */

export const courses = pgTable(
  'courses',
  {
    id: id(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    category: varchar('category', { length: 64 }).notNull().default('language'),
    level: varchar('level', { length: 64 }).notNull().default(''),
    sort: sort(),
    published: published(),
  },
  (t) => [
    index('courses_published_sort_idx').on(t.published, t.sort),
    index('courses_category_idx').on(t.category),
  ],
);

export const courseTranslations = pgTable(
  'course_translations',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    targetGroup: text('target_group').notNull().default(''),
    schedule: text('schedule').notNull().default(''),
    languages: text('languages').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.locale] })],
);

/* ─── Events ─────────────────────────────────────────────────────────────── */

export const events = pgTable(
  'events',
  {
    id: id(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    category: varchar('category', { length: 64 }).notNull().default('general'),
    imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
    featured: boolean('featured').notNull().default(false),
    published: published(),
  },
  (t) => [
    index('events_starts_at_idx').on(t.startsAt),
    index('events_published_starts_idx').on(t.published, t.startsAt),
    index('events_featured_idx').on(t.featured),
  ],
);

export const eventTranslations = pgTable(
  'event_translations',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    location: text('location').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.locale] })],
);

export const programmeItems = pgTable(
  'programme_items',
  {
    id: id(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    sort: sort(),
  },
  (t) => [index('programme_event_sort_idx').on(t.eventId, t.sort)],
);

export const programmeTranslations = pgTable(
  'programme_translations',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => programmeItems.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    timeLabel: text('time_label').notNull().default(''),
    title: text('title').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.locale] })],
);

/* ─── Sport ──────────────────────────────────────────────────────────────── */

export const sports = pgTable(
  'sports',
  {
    id: id(),
    sort: sort(),
    published: published(),
  },
  (t) => [index('sports_published_sort_idx').on(t.published, t.sort)],
);

export const sportTranslations = pgTable(
  'sport_translations',
  {
    sportId: uuid('sport_id')
      .notNull()
      .references(() => sports.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    activity: text('activity').notNull().default(''),
    audience: text('audience').notNull().default(''),
    schedule: text('schedule').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.sportId, t.locale] })],
);

/* ─── Culture / community / values / weekly schedule ─────────────────────── */

export const cultureCards = pgTable(
  'culture_cards',
  {
    id: id(),
    sort: sort(),
    published: published(),
  },
  (t) => [index('culture_published_sort_idx').on(t.published, t.sort)],
);

export const cultureTranslations = pgTable(
  'culture_translations',
  {
    cardId: uuid('card_id')
      .notNull()
      .references(() => cultureCards.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.locale] })],
);

export const communityCards = pgTable(
  'community_cards',
  {
    id: id(),
    sort: sort(),
    published: published(),
  },
  (t) => [index('community_published_sort_idx').on(t.published, t.sort)],
);

export const communityTranslations = pgTable(
  'community_translations',
  {
    cardId: uuid('card_id')
      .notNull()
      .references(() => communityCards.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.locale] })],
);

export const valuesItems = pgTable(
  'values_items',
  {
    id: id(),
    sort: sort(),
  },
  (t) => [index('values_sort_idx').on(t.sort)],
);

export const valuesTranslations = pgTable(
  'values_translations',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => valuesItems.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.locale] })],
);

export const weekSchedule = pgTable(
  'week_schedule',
  {
    id: id(),
    /** 0 = Sunday … 6 = Saturday, matching Date#getDay(). */
    weekday: smallint('weekday').notNull().default(0),
    sort: sort(),
  },
  (t) => [index('week_schedule_sort_idx').on(t.weekday, t.sort)],
);

export const weekTranslations = pgTable(
  'week_translations',
  {
    rowId: uuid('row_id')
      .notNull()
      .references(() => weekSchedule.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    label: text('label').notNull().default(''),
    detail: text('detail').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.rowId, t.locale] })],
);

/* ─── Du'as & ziyarat ────────────────────────────────────────────────────── */

export const duas = pgTable(
  'duas',
  {
    id: id(),
    slug: varchar('slug', { length: 128 }).notNull().unique(),
    category: duaCategoryEnum('category').notNull().default('dua'),
    sort: sort(),
    published: published(),
    /** The large ghosted Arabic title behind the card content. */
    arabicTitle: text('arabic_title').notNull().default(''),
    /** Optional full text, so a du'a can be expanded into a reading page later
     *  without a migration. */
    arabicText: text('arabic_text'),
    transliteration: text('transliteration'),
  },
  (t) => [
    index('duas_published_sort_idx').on(t.published, t.sort),
    index('duas_category_idx').on(t.category),
  ],
);

export const duaTranslations = pgTable(
  'dua_translations',
  {
    duaId: uuid('dua_id')
      .notNull()
      .references(() => duas.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    summary: text('summary').notNull().default(''),
    whenToRead: text('when_to_read').notNull().default(''),
    source: text('source').notNull().default(''),
    translation: text('translation'),
  },
  (t) => [primaryKey({ columns: [t.duaId, t.locale] })],
);

/* ─── Islamic occasions ──────────────────────────────────────────────────── */

export const occasions = pgTable(
  'occasions',
  {
    id: id(),
    hijriMonth: smallint('hijri_month').notNull(),
    hijriDay: smallint('hijri_day').notNull(),
    sort: sort(),
  },
  (t) => [index('occasions_hijri_idx').on(t.hijriMonth, t.hijriDay)],
);

export const occasionTranslations = pgTable(
  'occasion_translations',
  {
    occasionId: uuid('occasion_id')
      .notNull()
      .references(() => occasions.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    name: text('name').notNull().default(''),
    note: text('note').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.occasionId, t.locale] })],
);

/* ─── Membership tiers ───────────────────────────────────────────────────── */

export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    tierKey: varchar('tier_key', { length: 64 }).notNull().unique(),
    sort: sort(),
  },
  (t) => [index('memberships_sort_idx').on(t.sort)],
);

export const membershipTranslations = pgTable(
  'membership_translations',
  {
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: text('title').notNull().default(''),
    priceLabel: text('price_label').notNull().default(''),
    benefits: jsonb('benefits').notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.locale] })],
);

/* ─── Submissions ────────────────────────────────────────────────────────── */

export const submissions = pgTable(
  'submissions',
  {
    id: id(),
    kind: submissionKindEnum('kind').notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 64 }).notNull().default(''),
    topic: varchar('topic', { length: 120 }).notNull().default(''),
    message: text('message').notNull().default(''),
    locale: localeEnum('locale').notNull().default('fa'),
    /** Salted SHA-256 of the client IP. We never store the address itself —
     *  it is only needed to correlate abuse, and the hash is enough. */
    ipHash: varchar('ip_hash', { length: 64 }).notNull().default(''),
    status: submissionStatusEnum('status').notNull().default('new'),
    createdAt: createdAt(),
  },
  (t) => [
    index('submissions_status_created_idx').on(t.status, t.createdAt),
    index('submissions_kind_idx').on(t.kind),
  ],
);

/* ─── Audit log ──────────────────────────────────────────────────────────── */

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 64 }).notNull(),
    entity: varchar('entity', { length: 96 }).notNull(),
    entityId: text('entity_id').notNull().default(''),
    diff: jsonb('diff').notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index('audit_created_idx').on(t.createdAt)],
);

/* ─── Rate limiting ──────────────────────────────────────────────────────── */

/** Fixed-window counters. Postgres-backed on purpose: Redis would mean another
 *  account, another bill and another DSGVO disclosure for a site that takes a
 *  handful of form posts a day. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    /** `${bucket}:${identifier}` — e.g. `contact:9f3a…`. */
    key: varchar('key', { length: 255 }).primaryKey(),
    count: integer('count').notNull().default(0),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('rate_limits_window_idx').on(t.windowStart)],
);

/* ─── Relations ──────────────────────────────────────────────────────────── */

export const pagesRelations = relations(pages, ({ many }) => ({
  translations: many(pageTranslations),
}));
export const pageTranslationsRelations = relations(pageTranslations, ({ one }) => ({
  page: one(pages, { fields: [pageTranslations.pageId], references: [pages.id] }),
}));

export const contentBlocksRelations = relations(contentBlocks, ({ many }) => ({
  translations: many(blockTranslations),
}));
export const blockTranslationsRelations = relations(blockTranslations, ({ one }) => ({
  block: one(contentBlocks, {
    fields: [blockTranslations.blockId],
    references: [contentBlocks.id],
  }),
}));

export const offersRelations = relations(offers, ({ many }) => ({
  translations: many(offerTranslations),
}));
export const offerTranslationsRelations = relations(offerTranslations, ({ one }) => ({
  offer: one(offers, { fields: [offerTranslations.offerId], references: [offers.id] }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  translations: many(courseTranslations),
}));
export const courseTranslationsRelations = relations(courseTranslations, ({ one }) => ({
  course: one(courses, { fields: [courseTranslations.courseId], references: [courses.id] }),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  translations: many(eventTranslations),
  programme: many(programmeItems),
  image: one(media, { fields: [events.imageId], references: [media.id] }),
}));
export const eventTranslationsRelations = relations(eventTranslations, ({ one }) => ({
  event: one(events, { fields: [eventTranslations.eventId], references: [events.id] }),
}));
export const programmeItemsRelations = relations(programmeItems, ({ many, one }) => ({
  translations: many(programmeTranslations),
  event: one(events, { fields: [programmeItems.eventId], references: [events.id] }),
}));
export const programmeTranslationsRelations = relations(programmeTranslations, ({ one }) => ({
  item: one(programmeItems, {
    fields: [programmeTranslations.itemId],
    references: [programmeItems.id],
  }),
}));

export const sportsRelations = relations(sports, ({ many }) => ({
  translations: many(sportTranslations),
}));
export const sportTranslationsRelations = relations(sportTranslations, ({ one }) => ({
  sport: one(sports, { fields: [sportTranslations.sportId], references: [sports.id] }),
}));

export const cultureCardsRelations = relations(cultureCards, ({ many }) => ({
  translations: many(cultureTranslations),
}));
export const cultureTranslationsRelations = relations(cultureTranslations, ({ one }) => ({
  card: one(cultureCards, { fields: [cultureTranslations.cardId], references: [cultureCards.id] }),
}));

export const communityCardsRelations = relations(communityCards, ({ many }) => ({
  translations: many(communityTranslations),
}));
export const communityTranslationsRelations = relations(communityTranslations, ({ one }) => ({
  card: one(communityCards, {
    fields: [communityTranslations.cardId],
    references: [communityCards.id],
  }),
}));

export const valuesItemsRelations = relations(valuesItems, ({ many }) => ({
  translations: many(valuesTranslations),
}));
export const valuesTranslationsRelations = relations(valuesTranslations, ({ one }) => ({
  item: one(valuesItems, { fields: [valuesTranslations.itemId], references: [valuesItems.id] }),
}));

export const weekScheduleRelations = relations(weekSchedule, ({ many }) => ({
  translations: many(weekTranslations),
}));
export const weekTranslationsRelations = relations(weekTranslations, ({ one }) => ({
  row: one(weekSchedule, { fields: [weekTranslations.rowId], references: [weekSchedule.id] }),
}));

export const duasRelations = relations(duas, ({ many }) => ({
  translations: many(duaTranslations),
}));
export const duaTranslationsRelations = relations(duaTranslations, ({ one }) => ({
  dua: one(duas, { fields: [duaTranslations.duaId], references: [duas.id] }),
}));

export const occasionsRelations = relations(occasions, ({ many }) => ({
  translations: many(occasionTranslations),
}));
export const occasionTranslationsRelations = relations(occasionTranslations, ({ one }) => ({
  occasion: one(occasions, {
    fields: [occasionTranslations.occasionId],
    references: [occasions.id],
  }),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  translations: many(mediaTranslations),
  galleryItems: many(galleryItems),
}));
export const mediaTranslationsRelations = relations(mediaTranslations, ({ one }) => ({
  media: one(media, { fields: [mediaTranslations.mediaId], references: [media.id] }),
}));
export const galleryItemsRelations = relations(galleryItems, ({ one }) => ({
  media: one(media, { fields: [galleryItems.mediaId], references: [media.id] }),
}));

export const membershipsRelations = relations(memberships, ({ many }) => ({
  translations: many(membershipTranslations),
}));
export const membershipTranslationsRelations = relations(membershipTranslations, ({ one }) => ({
  membership: one(memberships, {
    fields: [membershipTranslations.membershipId],
    references: [memberships.id],
  }),
}));
