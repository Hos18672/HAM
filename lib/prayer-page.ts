import 'server-only';
import {
  getPrayerTimes,
  getNextPrayer,
  localMinutes,
  VIENNA,
  PRAYER_KEYS,
  type PrayerKey,
  type PrayerTimes,
} from './prayer-times';
import { toHijri, type HijriDate } from './hijri';
import { getOccasions, type Occasion } from './db/queries/content';
import type { Locale } from './i18n/config';

/**
 * Everything the prayer page needs, assembled on the server.
 *
 * The times are computed here rather than in the browser so the first paint is
 * already correct — the countdown then only has to tick, not to work out where
 * it should start from.
 */

export interface PrayerDay {
  /** Minutes after local midnight, or null where the event does not occur. */
  times: PrayerTimes;
  /** The prayer the countdown is running towards. */
  next: { key: PrayerKey; minutes: number; tomorrow: boolean } | null;
  /** Server time when this was computed, so the client can reconcile drift. */
  computedAtIso: string;
  /** Minutes after midnight at the moment of computation. */
  nowMinutes: number;
  gregorianIso: string;
  hijri: HijriDate;
}

export const DISPLAY_ORDER = PRAYER_KEYS;

export async function getPrayerDay(now = new Date()): Promise<PrayerDay> {
  const times = getPrayerTimes(now, { timeZone: VIENNA.timeZone });

  // Tomorrow's Fajr, so the countdown can roll over after Isha rather than
  // showing nothing for the rest of the night. Anchored at noon of the next
  // civil day in Vienna rather than "now plus 24 hours": on the night the
  // clocks go forward the latter lands on the day *after* tomorrow when it is
  // read late in the evening.
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number) as [number, number, number];
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12));
  const tomorrowTimes = getPrayerTimes(tomorrow, { timeZone: VIENNA.timeZone });

  const nowMinutes = localMinutes(now, VIENNA.timeZone);
  const next = getNextPrayer(times, nowMinutes, tomorrowTimes.fajr);

  return {
    times,
    next,
    computedAtIso: now.toISOString(),
    nowMinutes,
    gregorianIso: now.toISOString(),
    hijri: toHijri(now, VIENNA.timeZone),
  };
}

/* ─── Month calendar ─────────────────────────────────────────────────────── */

export interface CalendarCell {
  /** ISO date of the day, or null for the leading blanks of the first week. */
  iso: string | null;
  gregorianDay: number;
  hijri: HijriDate | null;
  isToday: boolean;
  occasions: Occasion[];
}

export interface CalendarMonth {
  year: number;
  /** 1–12. */
  month: number;
  cells: CalendarCell[];
  /** Occasions falling anywhere in this Gregorian month. */
  occasions: (Occasion & { iso: string; gregorianDay: number })[];
}

/**
 * Build one Gregorian month with the Hijri day alongside each date.
 *
 * Occasions are matched on the Hijri date, so a commemoration lands on the day
 * the Hijri calendar puts it on — which is the whole point of showing both.
 */
export async function getCalendarMonth(
  year: number,
  month: number,
  locale: Locale,
  today = new Date(),
): Promise<CalendarMonth> {
  const allOccasions = await getOccasions(locale);

  const byHijri = new Map<string, Occasion[]>();
  for (const occasion of allOccasions) {
    const key = `${occasion.hijriMonth}-${occasion.hijriDay}`;
    byHijri.set(key, [...(byHijri.get(key) ?? []), occasion]);
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();

  // getUTCDay() is 0 = Sunday, which is the column order the weekday labels use.
  const leadingBlanks = firstOfMonth.getUTCDay();

  const todayHijri = toHijri(today, VIENNA.timeZone);
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today);

  const cells: CalendarCell[] = [];
  const monthOccasions: (Occasion & { iso: string; gregorianDay: number })[] = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ iso: null, gregorianDay: 0, hijri: null, isToday: false, occasions: [] });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    // Noon UTC keeps the date stable against any timezone offset.
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const hijri = toHijri(date, VIENNA.timeZone);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOccasions = byHijri.get(`${hijri.month}-${hijri.day}`) ?? [];

    for (const occasion of dayOccasions) {
      monthOccasions.push({ ...occasion, iso, gregorianDay: day });
    }

    cells.push({
      iso,
      gregorianDay: day,
      hijri,
      isToday: iso === todayKey,
      occasions: dayOccasions,
    });
  }

  void todayHijri;

  return { year, month, cells, occasions: monthOccasions };
}
