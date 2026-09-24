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
import { buildCalendarMonth, type CalendarMonth } from './calendar';
import { getOccasions } from './db/queries/content';
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

/**
 * Build one Gregorian month with the Hijri day alongside each date.
 *
 * The work itself lives in `lib/calendar`, which has no server imports: the
 * browser runs the same builder when the reader moves a month, so changing
 * month costs nothing but arithmetic. All this does is fetch the occasions
 * and settle on what "today" is.
 */
export async function getCalendarMonth(
  year: number,
  month: number,
  locale: Locale,
  today = new Date(),
): Promise<CalendarMonth> {
  const occasions = await getOccasions(locale);
  return buildCalendarMonth(year, month, occasions, viennaIso(today));
}

/** The date in Vienna, as `YYYY-MM-DD`. */
export function viennaIso(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export type { CalendarCell, CalendarMonth } from './calendar';
