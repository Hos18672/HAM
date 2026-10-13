import 'server-only';
import type { Locale } from './i18n/config';
import {
  getBlocks,
  getCommunityCards,
  getCourses,
  getCultureCards,
  getDuas,
  getGallery,
  getMemberships,
  getPageHeader,
  getPastEvents,
  getSettings,
  getSports,
  getUpcomingEvents,
  getValues,
  getWeekSchedule,
  type Block,
  type EventEntry,
} from './db/queries/content';
import { BOARD, FACTS, HISTORY, houseMapUrl, known } from './site-facts';

/**
 * Everything the native Android app shows of the house's own content, in one
 * language: events, courses, sport, culture, community, the gallery, the
 * membership tiers, the weekly schedule, the du'a catalogue and the house's
 * facts. The app keeps the last copy it fetched and ships one from its build,
 * so it opens with content even offline.
 *
 * At an address with a file name rather than under /api, so the static
 * preview saves it at the same path (`scripts/preview-snapshot.mjs`) and the
 * app asks one URL wherever the site is served from. Public content only.
 */

const PAGE_KEYS = ['home', 'about', 'culture', 'community', 'support', 'courses', 'sport'] as const;

const event = (e: EventEntry) => ({
  slug: e.slug,
  start: e.startsAt.toISOString(),
  end: e.endsAt ? e.endsAt.toISOString() : null,
  category: e.category,
  featured: e.featured,
  title: e.title,
  body: e.body,
  location: e.location,
  image: e.imageUrl,
  imageAlt: e.imageAlt,
  programme: e.programme.map((p) => ({ time: p.timeLabel, title: p.title })),
});

const blocks = (all: Record<string, Block>) =>
  Object.fromEntries(
    Object.values(all).map((b) => [b.blockKey, b.kind === 'list' ? b.items : b.text]),
  );

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.warn('[app-data]', error);
    return fallback;
  }
}

export async function appData(locale: Locale) {
  const [
    settings,
    upcoming,
    past,
    courses,
    sports,
    culture,
    community,
    values,
    week,
    duas,
    gallery,
    memberships,
    headers,
    pageBlocks,
  ] = await Promise.all([
    getSettings(),
    safe(() => getUpcomingEvents(locale, 50), []),
    safe(() => getPastEvents(locale, 20), []),
    safe(() => getCourses(locale), []),
    safe(() => getSports(locale), []),
    safe(() => getCultureCards(locale), []),
    safe(() => getCommunityCards(locale), []),
    safe(() => getValues(locale), []),
    safe(() => getWeekSchedule(locale), []),
    safe(() => getDuas(locale), []),
    safe(() => getGallery(locale), []),
    safe(() => getMemberships(locale), []),
    Promise.all(PAGE_KEYS.map((key) => safe(() => getPageHeader(key, locale), null))),
    Promise.all(PAGE_KEYS.map((key) => safe(() => getBlocks(key, locale), {}))),
  ]);

  return {
    version: 1,
    generated: new Date().toISOString(),
    locale,
    house: {
      name: locale === 'fa' ? FACTS.nameFa : FACTS.nameDe,
      address: settings.address || `${FACTS.street}, ${FACTS.postcode} ${FACTS.city}`,
      email: settings.contactEmail || FACTS.email,
      phone: known(settings.phone) || FACTS.phone,
      iban: known(settings.iban) || FACTS.iban,
      bic: FACTS.bic,
      instagram: FACTS.instagram,
      mapUrl: houseMapUrl(settings.mapUrl),
      latitude: FACTS.latitude,
      longitude: FACTS.longitude,
      openingHours: settings.openingHours,
      history: HISTORY.map((h) => ({ year: h.year, text: h[locale] })),
      board: BOARD.map((b) => ({ name: b.name, role: b[locale] })),
    },
    pages: Object.fromEntries(
      PAGE_KEYS.map((key, i) => [
        key,
        {
          title: headers[i]?.title ?? '',
          lead: headers[i]?.lead ?? '',
          blocks: blocks(pageBlocks[i] ?? {}),
        },
      ]),
    ),
    events: upcoming.map(event),
    pastEvents: past.map(event),
    courses: courses.map((c) => ({
      slug: c.slug,
      category: c.category,
      title: c.title,
      body: c.body,
      level: c.level,
      fee: c.fee,
      targetGroup: c.targetGroup,
      languages: c.languages,
      schedule: c.schedule,
      days: c.days,
      start: c.startTime,
      end: c.endTime,
    })),
    sports: sports.map((s) => ({
      title: s.activity,
      audience: s.audience,
      schedule: s.schedule,
      days: s.days,
      start: s.startTime,
      end: s.endTime,
    })),
    culture: culture.map((c) => ({ title: c.title, body: c.body })),
    community: community.map((c) => ({ title: c.title, body: c.body })),
    values: values.map((c) => ({ title: c.title, body: c.body })),
    week: week.map((w) => ({
      weekday: w.weekday,
      start: w.startTime,
      end: w.endTime,
      label: w.label,
      detail: w.detail,
    })),
    duas: duas.map((d) => ({
      slug: d.slug,
      category: d.category,
      arabicTitle: d.arabicTitle,
      title: d.title,
      summary: d.summary,
      whenToRead: d.whenToRead,
      source: d.source,
    })),
    gallery: gallery.map((g) => ({
      url: g.url,
      width: g.width,
      height: g.height,
      category: g.category,
      alt: g.alt,
      caption: g.caption,
    })),
    memberships: memberships.map((m) => ({
      title: m.title,
      price: m.priceLabel,
      benefits: m.benefits,
    })),
  };
}
