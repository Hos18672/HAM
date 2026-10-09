import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getOccasions, getUpcomingEvents, type Occasion } from '@/lib/db/queries/content';
import { HIJRI_MONTHS, toHijri } from '@/lib/hijri';
import { PERSIAN_MONTHS, toPersianDate } from '@/lib/persian-date';
import { HOLIDAYS } from '@/lib/holidays';
import { civilDaysOn } from '@/lib/civil-days';
import { locales, type Locale } from '@/lib/i18n/config';

/**
 * What the calendar widgets show, in both languages at once: the house's
 * coming events, the occasions and Austria's public holidays of the next
 * year, and each day's Hijri and Persian date.
 *
 * At an address with a file name rather than under /api, so the static
 * preview can save it at the very same path (`scripts/preview-snapshot.mjs`)
 * and a widget asks one URL wherever the site is served from. The Android
 * app keeps the last copy it fetched, and ships one from its build.
 *
 * Dates rather than words where it can: the widgets format the day in the
 * language they are showing.
 */
export const revalidate = 3600;

// From the first of last month, so a widget's month view can page back one
// month and has every day of the month it opens on; about a year ahead.
const DAYS = 430;
const DAY_MS = 86_400_000;

type Named = Record<Locale, string>;

function viennaToday(): { year: number; month: number; day: number } {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number) as [number, number, number];
  return { year, month, day };
}

export async function GET() {
  const [events, occasions, texts] = await Promise.all([
    Promise.all(locales.map((locale) => getUpcomingEvents(locale, 12))),
    Promise.all(locales.map((locale) => getOccasions(locale))),
    Promise.all(locales.map((locale) => getTranslations({ locale, namespace: 'prayer' }))),
  ]);
  const at = (locale: Locale) => locales.indexOf(locale);

  // The same event in each language, matched on its id.
  const feedEvents = events[0]!.map((event) => {
    const entry: Record<string, unknown> = {
      slug: event.slug,
      start: event.startsAt.toISOString(),
      end: event.endsAt ? event.endsAt.toISOString() : null,
    };
    for (const locale of locales) {
      const local = events[at(locale)]!.find((e) => e.id === event.id) ?? event;
      entry[locale] = { title: local.title, location: local.location };
    }
    return entry;
  });

  // The editors' occasions, then the site's own days for a Hijri date they
  // have nothing for — the same precedence as the calendar on the prayer page.
  const byHijri = new Map<string, Named[]>();
  const editors = occasions[0]!;
  for (const occasion of editors) {
    const key = `${occasion.hijriMonth}-${occasion.hijriDay}`;
    const named = Object.fromEntries(
      locales.map((locale) => [
        locale,
        (occasions[at(locale)]!.find((o: Occasion) => o.id === occasion.id) ?? occasion).name,
      ]),
    ) as Named;
    byHijri.set(key, [...(byHijri.get(key) ?? []), named]);
  }
  for (const holiday of HOLIDAYS) {
    const key = `${holiday.hijriMonth}-${holiday.hijriDay}`;
    if (editors.some((o) => `${o.hijriMonth}-${o.hijriDay}` === key)) continue;
    const named = Object.fromEntries(
      locales.map((locale) => [locale, texts[at(locale)]!(`holidays.${holiday.key}.name`)]),
    ) as Named;
    byHijri.set(key, [...(byHijri.get(key) ?? []), named]);
  }

  const today = viennaToday();
  const start = Date.UTC(today.year, today.month - 2, 1, 12);
  const first = new Date(start);
  const days: number[][] = [];
  const dayNames: { date: string; off: boolean; names: Named }[] = [];
  for (let i = 0; i < DAYS; i += 1) {
    // Noon UTC keeps the date stable against any timezone offset.
    const date = new Date(start + i * DAY_MS);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hijri = toHijri(date);
    const persian = toPersianDate(date, 'UTC');
    days.push([hijri.day, hijri.month, hijri.year, persian.day, persian.month, persian.year]);

    for (const names of byHijri.get(`${hijri.month}-${hijri.day}`) ?? []) {
      dayNames.push({ date: iso, off: false, names });
    }
    for (const civil of civilDaysOn(y, m, d)) {
      if (civil.country !== 'at' || !civil.off || !civil.key) continue;
      const names = Object.fromEntries(
        locales.map((locale) => [locale, texts[at(locale)]!(`civil.${civil.key}.name`)]),
      ) as Named;
      dayNames.push({ date: iso, off: true, names });
    }
  }

  return NextResponse.json(
    {
      version: 1,
      generated: new Date().toISOString(),
      // Day 0 of `days` is this date; each entry after it the next day:
      // [Hijri day, month, year, Persian day, month, year].
      from: `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-01`,
      days,
      hijriMonths: { fa: HIJRI_MONTHS.fa.slice(1), de: HIJRI_MONTHS.de.slice(1) },
      persianMonths: PERSIAN_MONTHS,
      events: feedEvents,
      occasions: dayNames.map(({ date, off, names }) => ({ date, off, ...names })),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
