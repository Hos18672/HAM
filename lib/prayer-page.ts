import 'server-only';
import {
  getNextPrayer,
  localMinutes,
  VIENNA,
  PRAYER_KEYS,
  type ExtraTimes,
  type PrayerKey,
  type PrayerTimes,
} from './prayer-times';
import { dayTimes, monthTimes, VIENNA_PLACE, type Place, type Source } from './aladhan';
import { toHijri, type HijriDate } from './hijri';
import { buildCalendarMonth, type CalendarMonth } from './calendar';
import { getOccasions } from './db/queries/content';
import type { Locale } from './i18n/config';

/**
 * Everything the prayer page needs, assembled on the server.
 *
 * The times are fetched here rather than in the browser so the first paint is
 * already correct — the countdown then only has to tick, not to work out where
 * it should start from. They come from the Aladhan API, or from the site's own
 * calculation when the API cannot be reached (see `lib/aladhan`).
 */

export interface PrayerDay {
  /** Minutes after local midnight, or null where the event does not occur. */
  times: PrayerTimes;
  /** Imsak, sunset and the thirds of the night. */
  extras: ExtraTimes;
  /** The prayer the countdown is running towards. */
  next: { key: PrayerKey; minutes: number; tomorrow: boolean } | null;
  /** Server time when this was computed, so the client can reconcile drift. */
  computedAtIso: string;
  /** Minutes after midnight at the moment of computation. */
  nowMinutes: number;
  gregorianIso: string;
  hijri: HijriDate;
  /** Where the times are for. */
  place: Place & { vienna: boolean };
  source: Source;
}

export const DISPLAY_ORDER = PRAYER_KEYS;

export async function getPrayerDay(
  now = new Date(),
  place: Place = VIENNA_PLACE,
): Promise<PrayerDay> {
  const todayIso = isoIn(now, place.timeZone);

  // Tomorrow's Fajr, so the countdown can roll over after Isha rather than
  // showing nothing for the rest of the night. Tomorrow is the next civil day
  // in that place rather than "now plus 24 hours": on the night the clocks go
  // forward the latter lands on the day *after* tomorrow when it is read late
  // in the evening.
  const [y, m, d] = todayIso.split('-').map(Number) as [number, number, number];
  const tomorrowIso = new Date(Date.UTC(y, m - 1, d + 1, 12)).toISOString().slice(0, 10);

  const [today, tomorrow] = await Promise.all([
    dayTimes(todayIso, place),
    dayTimes(tomorrowIso, place),
  ]);

  const nowMinutes = localMinutes(now, place.timeZone);
  const next = getNextPrayer(today.times, nowMinutes, tomorrow.times.fajr);

  return {
    times: today.times,
    extras: today.extras,
    next,
    computedAtIso: now.toISOString(),
    nowMinutes,
    gregorianIso: now.toISOString(),
    hijri: toHijri(now, place.timeZone),
    place: { ...place, vienna: place === VIENNA_PLACE },
    source: today.source,
  };
}

/* ─── Month timetable ────────────────────────────────────────────────────── */

export interface TimetableDay {
  iso: string;
  times: PrayerTimes;
  extras: ExtraTimes;
}

export interface Timetable {
  year: number;
  month: number;
  days: TimetableDay[];
  source: Source;
}

/** One month of Vienna's times. */
export async function getTimetable(year: number, month: number): Promise<Timetable> {
  const { days, source } = await monthTimes(year, month, VIENNA_PLACE);
  return {
    year,
    month,
    source,
    days: days.map((day) => ({ iso: day.iso, times: day.times, extras: day.extras })),
  };
}

/** The date in a timezone, as `YYYY-MM-DD`. */
function isoIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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
