/**
 * Database seed.
 *
 * Idempotent by construction: it truncates the content tables and writes them
 * again from `seed-data.ts`, so running it twice leaves the same database.
 * User accounts are the exception — an existing admin is updated, never
 * replaced, so re-seeding does not silently reset a changed password.
 *
 *   pnpm db:push && pnpm db:seed
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { eq, sql as raw } from 'drizzle-orm';
import { db, sql } from './index';
import * as s from './schema';
import { hashPassword } from '../password';
import * as data from './seed-data';

type Locale = 'fa' | 'de';
const LOCALES: Locale[] = ['fa', 'de'];

/**
 * A stable UUID for a seeded row, derived from its natural key.
 *
 * Re-seeding used to mint fresh ids for everything, which quietly broke more
 * than it looked like: the in-place editor emits `data-field="page.<id>.title"`,
 * and any cached or prerendered page kept pointing at rows that no longer
 * existed — so saving failed with a foreign-key violation and the editor just
 * said "Nicht gespeichert". Deriving the id from something that does not
 * change (a page key, a course slug, a Hijri date) makes the seed idempotent
 * in identity as well as in content.
 *
 * This is RFC 4122 v5 in shape: SHA-1 over a fixed namespace plus the key,
 * with the version and variant bits set.
 */
const SEED_NAMESPACE = 'haus-aller-menschen.at/seed/';

export function stableId(kind: string, key: string): string {
  const hash = createHash('sha1').update(`${SEED_NAMESPACE}${kind}:${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function log(step: string, count?: number) {
  console.log(`  ✓ ${step}${count === undefined ? '' : ` (${count})`}`);
}

/**
 * Wipe the content tables. Ordered so that nothing depends on a table already
 * emptied — although the CASCADE on every translation FK means the base tables
 * alone would do. `submissions`, `audit_log`, `users` and `rate_limits` are
 * deliberately left alone: they are records, not content.
 */
async function truncateContent() {
  await sql`
    TRUNCATE TABLE
      page_translations, pages,
      block_translations, content_blocks,
      offer_translations, offers,
      course_translations, courses,
      programme_translations, programme_items,
      event_translations, events,
      sport_translations, sports,
      culture_translations, culture_cards,
      community_translations, community_cards,
      values_translations, values_items,
      week_translations, week_schedule,
      dua_translations, duas,
      occasion_translations, occasions,
      membership_translations, memberships,
      gallery_items
    RESTART IDENTITY CASCADE
  `;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '  ! ADMIN_EMAIL / ADMIN_PASSWORD are not set — no admin account was created.\n' +
        '    Set them in .env and run `pnpm db:seed` again to be able to log in.',
    );
    return;
  }

  const [existing] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(raw`lower(${s.users.email})`, email))
    .limit(1);

  if (existing) {
    log(`admin account already exists (${email}) — left unchanged`);
    return;
  }

  await db.insert(s.users).values({
    email,
    name: 'Redaktion',
    role: 'admin',
    passwordHash: await hashPassword(password),
  });
  log(`admin account created (${email})`);
}

async function seedSettings() {
  await db
    .insert(s.siteSettings)
    .values({
      id: 1,
      defaultLocale: 'fa',
      defaultTheme: 'light',
      showOpeningEvent: true,
      contactEmail: data.ASSOCIATION.email,
      phone: data.ASSOCIATION.phone,
      address: `${data.ASSOCIATION.street}, ${data.ASSOCIATION.postcode} ${data.ASSOCIATION.city}`,
      iban: data.ASSOCIATION.iban,
      mapUrl: data.ASSOCIATION.mapUrl,
    })
    .onConflictDoUpdate({
      target: s.siteSettings.id,
      set: {
        contactEmail: data.ASSOCIATION.email,
        phone: data.ASSOCIATION.phone,
        address: `${data.ASSOCIATION.street}, ${data.ASSOCIATION.postcode} ${data.ASSOCIATION.city}`,
        iban: data.ASSOCIATION.iban,
        mapUrl: data.ASSOCIATION.mapUrl,
        updatedAt: new Date(),
      },
    });
  log('site settings');
}

async function seedPages() {
  for (const page of data.PAGES) {
    const [row] = await db
      .insert(s.pages)
      .values({ id: stableId('page', page.key), key: page.key, sort: page.sort, published: true })
      .returning({ id: s.pages.id });
    if (!row) continue;
    await db.insert(s.pageTranslations).values(
      LOCALES.map((locale) => ({
        pageId: row.id,
        locale,
        kicker: page[locale].kicker,
        title: page[locale].title,
        lead: page[locale].lead,
      })),
    );
  }
  log('pages', data.PAGES.length);
}

async function seedBlocks() {
  for (const block of data.BLOCKS) {
    const [row] = await db
      .insert(s.contentBlocks)
      .values({
        id: stableId('block', `${block.pageKey}/${block.blockKey}`),
        pageKey: block.pageKey,
        blockKey: block.blockKey,
        kind: block.kind,
        sort: block.sort,
      })
      .returning({ id: s.contentBlocks.id });
    if (!row) continue;
    await db.insert(s.blockTranslations).values(
      LOCALES.map((locale) => ({
        blockId: row.id,
        locale,
        value:
          block.kind === 'list'
            ? { items: block[locale].items ?? [] }
            : { text: block[locale].text ?? '' },
      })),
    );
  }
  log('content blocks', data.BLOCKS.length);
}

async function seedOffers() {
  for (const offer of data.OFFERS) {
    const [row] = await db
      .insert(s.offers)
      .values({
        id: stableId('offer', String(offer.sort)),
        icon: offer.icon,
        sort: offer.sort,
        published: true,
      })
      .returning({ id: s.offers.id });
    if (!row) continue;
    await db.insert(s.offerTranslations).values(
      LOCALES.map((locale) => ({
        offerId: row.id,
        locale,
        title: offer[locale].title,
        body: offer[locale].body,
      })),
    );
  }
  log('offers', data.OFFERS.length);
}

async function seedCourses() {
  for (const course of data.COURSES) {
    const [row] = await db
      .insert(s.courses)
      .values({
        id: stableId('course', course.slug),
        slug: course.slug,
        category: course.category,
        level: course.level,
        sort: course.sort,
        published: true,
      })
      .returning({ id: s.courses.id });
    if (!row) continue;
    await db.insert(s.courseTranslations).values(
      LOCALES.map((locale) => ({
        courseId: row.id,
        locale,
        title: course[locale].title,
        body: course[locale].body,
        targetGroup: course[locale].targetGroup,
        schedule: course[locale].schedule,
        languages: course[locale].languages,
      })),
    );
  }
  log('courses', data.COURSES.length);
}

async function seedEvents() {
  const events = data.eventSeed();
  for (const event of events) {
    const [row] = await db
      .insert(s.events)
      .values({
        id: stableId('event', event.slug),
        slug: event.slug,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        category: event.category,
        featured: event.featured,
        published: true,
      })
      .returning({ id: s.events.id });
    if (!row) continue;

    await db.insert(s.eventTranslations).values(
      LOCALES.map((locale) => ({
        eventId: row.id,
        locale,
        title: event[locale].title,
        body: event[locale].body,
        location: event[locale].location,
      })),
    );

    for (const [index, item] of event.programme.entries()) {
      const [itemRow] = await db
        .insert(s.programmeItems)
        .values({
          id: stableId('programme', `${event.slug}/${index}`),
          eventId: row.id,
          sort: index,
        })
        .returning({ id: s.programmeItems.id });
      if (!itemRow) continue;
      await db.insert(s.programmeTranslations).values(
        LOCALES.map((locale) => ({
          itemId: itemRow.id,
          locale,
          timeLabel: item[locale].timeLabel,
          title: item[locale].title,
        })),
      );
    }
  }
  log('events', events.length);
}

async function seedSports() {
  for (const sport of data.SPORTS) {
    const [row] = await db
      .insert(s.sports)
      .values({ id: stableId('sport', String(sport.sort)), sort: sport.sort, published: true })
      .returning({ id: s.sports.id });
    if (!row) continue;
    await db.insert(s.sportTranslations).values(
      LOCALES.map((locale) => ({
        sportId: row.id,
        locale,
        activity: sport[locale].activity,
        audience: sport[locale].audience,
        schedule: sport[locale].schedule,
      })),
    );
  }
  log('sport offerings', data.SPORTS.length);
}

async function seedCulture() {
  for (const card of data.CULTURE) {
    const [row] = await db
      .insert(s.cultureCards)
      .values({ id: stableId('culture', String(card.sort)), sort: card.sort, published: true })
      .returning({ id: s.cultureCards.id });
    if (!row) continue;
    await db.insert(s.cultureTranslations).values(
      LOCALES.map((locale) => ({
        cardId: row.id,
        locale,
        title: card[locale].title,
        body: card[locale].body,
      })),
    );
  }
  log('culture cards', data.CULTURE.length);
}

async function seedCommunity() {
  for (const card of data.COMMUNITY) {
    const [row] = await db
      .insert(s.communityCards)
      .values({ id: stableId('community', String(card.sort)), sort: card.sort, published: true })
      .returning({ id: s.communityCards.id });
    if (!row) continue;
    await db.insert(s.communityTranslations).values(
      LOCALES.map((locale) => ({
        cardId: row.id,
        locale,
        title: card[locale].title,
        body: card[locale].body,
      })),
    );
  }
  log('community cards', data.COMMUNITY.length);
}

async function seedValues() {
  for (const item of data.VALUES) {
    const [row] = await db
      .insert(s.valuesItems)
      .values({ id: stableId('values', String(item.sort)), sort: item.sort })
      .returning({ id: s.valuesItems.id });
    if (!row) continue;
    await db.insert(s.valuesTranslations).values(
      LOCALES.map((locale) => ({
        itemId: row.id,
        locale,
        title: item[locale].title,
        body: item[locale].body,
      })),
    );
  }
  log('values', data.VALUES.length);
}

async function seedWeek() {
  for (const row of data.WEEK) {
    const [inserted] = await db
      .insert(s.weekSchedule)
      .values({ id: stableId('week', String(row.weekday)), weekday: row.weekday, sort: row.sort })
      .returning({ id: s.weekSchedule.id });
    if (!inserted) continue;
    await db.insert(s.weekTranslations).values(
      LOCALES.map((locale) => ({
        rowId: inserted.id,
        locale,
        label: row[locale].label,
        detail: row[locale].detail,
      })),
    );
  }
  log('weekly schedule', data.WEEK.length);
}

async function seedDuas() {
  for (const dua of data.DUAS) {
    const [row] = await db
      .insert(s.duas)
      .values({
        id: stableId('dua', dua.slug),
        slug: dua.slug,
        category: dua.category,
        arabicTitle: dua.arabicTitle,
        sort: dua.sort,
        published: true,
      })
      .returning({ id: s.duas.id });
    if (!row) continue;
    await db.insert(s.duaTranslations).values(
      LOCALES.map((locale) => ({
        duaId: row.id,
        locale,
        title: dua[locale].title,
        summary: dua[locale].summary,
        whenToRead: dua[locale].whenToRead,
        source: dua[locale].source,
      })),
    );
  }
  log("du'as, ziyarat and taqibat", data.DUAS.length);
}

async function seedOccasions() {
  for (const occasion of data.OCCASIONS) {
    const [row] = await db
      .insert(s.occasions)
      .values({
        id: stableId('occasion', `${occasion.hijriMonth}-${occasion.hijriDay}`),
        hijriMonth: occasion.hijriMonth,
        hijriDay: occasion.hijriDay,
        sort: occasion.sort,
      })
      .returning({ id: s.occasions.id });
    if (!row) continue;
    await db.insert(s.occasionTranslations).values(
      LOCALES.map((locale) => ({
        occasionId: row.id,
        locale,
        name: occasion[locale].name,
        note: occasion[locale].note,
      })),
    );
  }
  log('occasions', data.OCCASIONS.length);
}

async function seedMemberships() {
  for (const tier of data.MEMBERSHIPS) {
    const [row] = await db
      .insert(s.memberships)
      .values({ id: stableId('membership', tier.tierKey), tierKey: tier.tierKey, sort: tier.sort })
      .returning({ id: s.memberships.id });
    if (!row) continue;
    await db.insert(s.membershipTranslations).values(
      LOCALES.map((locale) => ({
        membershipId: row.id,
        locale,
        title: tier[locale].title,
        priceLabel: tier[locale].priceLabel,
        benefits: tier[locale].benefits,
      })),
    );
  }
  log('membership tiers', data.MEMBERSHIPS.length);
}

export async function seed() {
  console.log('Seeding Haus aller Menschen …');
  await truncateContent();
  await seedSettings();
  await seedPages();
  await seedBlocks();
  await seedOffers();
  await seedCourses();
  await seedEvents();
  await seedSports();
  await seedCulture();
  await seedCommunity();
  await seedValues();
  await seedWeek();
  await seedDuas();
  await seedOccasions();
  await seedMemberships();
  await seedAdmin();
  console.log('Done.');
}

// Run when invoked directly (`pnpm db:seed`), not when imported by a test.
const invokedDirectly = process.argv[1] !== undefined && process.argv[1].includes('seed');

if (invokedDirectly) {
  seed()
    .then(async () => {
      await sql.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Seed failed:', error);
      await sql.end();
      process.exit(1);
    });
}
