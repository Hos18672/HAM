import type { HijriDate } from './hijri';

/**
 * The lunar calendar as Iran keeps it — the one this house's community reads.
 *
 * Every runtime ships ICU, and ICU's `islamic-umalqura` is the Umm al-Qura
 * table Saudi Arabia publishes. That table is not the calendar meant here.
 * Umm al-Qura is *calculated*: a month begins when, at Mecca, the moon sets
 * after the sun on the evening of the conjunction. The Iranian calendar asks
 * for the crescent to be *seen* from Iran, which as a rule takes one more
 * evening — but not always, and the difference cannot be had by shifting a
 * date by a constant. Over the 310 months tabulated below, Iran begins the
 * month a day after Umm al-Qura 200 times, on the same day 109 times, and
 * two days later once. That is why the calendar showed the commemorations on
 * the wrong day: it was reading a Saudi table for an Iranian date.
 *
 * So the month starts are data, not arithmetic. What follows is the length of
 * every lunar month since 1 Muharram 1423 in the Iranian official calendar
 * (Institute of Geophysics, University of Tehran, which fixes the calendar
 * each year), in the tabulation kept by the starcal project. Month lengths
 * are facts about the sky and the announcements made under it; they are
 * recorded here rather than computed because no closed formula reproduces a
 * sighting.
 *
 * The table ends when the published calendar does — see `LAST_DAY`. Past that
 * edge `lib/hijri` falls back to Umm al-Qura moved on by a day, which is the
 * likelier of the two readings, and says so. Extending the table is one line
 * per year.
 */

/** The first year the table covers. Rows run from here without a gap. */
const FIRST_YEAR = 1423;

/**
 * Days since 1970-01-01 UTC of 1 Muharram 1423 — 16 March 2002. The whole
 * table hangs off this one anchor, so it is the one number to check first if
 * every date is out by the same amount.
 */
const EPOCH_DAY = 11762;

/**
 * The length of each month, 29 or 30 days, twelve to the year from
 * `FIRST_YEAR`. The final row is short: the calendar has not been published
 * further than that.
 */
const MONTH_LENGTHS: readonly (readonly number[])[] = [
  [29, 30, 30, 29, 29, 30, 29, 30, 29, 30, 29, 30], // 1423
  [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29], // 1424
  [30, 29, 30, 30, 29, 30, 30, 29, 29, 30, 29, 30], // 1425
  [29, 29, 30, 29, 30, 30, 30, 29, 30, 30, 29, 29], // 1426
  [30, 29, 29, 30, 29, 30, 30, 30, 29, 30, 29, 30], // 1427
  [29, 30, 29, 29, 29, 30, 30, 29, 30, 30, 30, 29], // 1428
  [30, 29, 30, 29, 29, 29, 30, 30, 29, 30, 30, 29], // 1429
  [30, 30, 29, 29, 30, 29, 30, 29, 29, 30, 30, 29], // 1430
  [30, 30, 29, 30, 29, 30, 29, 30, 29, 29, 30, 29], // 1431
  [30, 30, 29, 30, 30, 30, 29, 30, 29, 29, 30, 29], // 1432
  [29, 30, 29, 30, 30, 30, 29, 30, 29, 30, 29, 30], // 1433
  [29, 29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29], // 1434
  [29, 30, 29, 30, 29, 30, 29, 30, 30, 30, 29, 30], // 1435
  [29, 30, 29, 29, 30, 29, 30, 29, 30, 29, 30, 30], // 1436
  [29, 30, 30, 29, 30, 29, 29, 30, 29, 29, 30, 30], // 1437
  [29, 30, 30, 30, 29, 30, 29, 29, 30, 29, 29, 30], // 1438
  [29, 30, 30, 30, 30, 29, 30, 29, 29, 30, 29, 29], // 1439
  [30, 29, 30, 30, 30, 29, 30, 30, 29, 29, 30, 29], // 1440
  [29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 30], // 1441
  [29, 29, 30, 29, 30, 29, 30, 30, 29, 30, 30, 29], // 1442
  [29, 30, 30, 29, 29, 30, 29, 30, 29, 30, 30, 29], // 1443
  [30, 30, 29, 30, 29, 29, 30, 29, 30, 29, 30, 29], // 1444
  [30, 30, 30, 29, 30, 29, 29, 30, 29, 30, 29, 29], // 1445
  [30, 30, 30, 29, 30, 30, 29, 30, 29, 29, 29, 30], // 1446
  [29, 30, 30, 29, 30, 30, 30, 29, 30, 29, 29, 29], // 1447
  [30, 29, 30, 29, 30, 30, 30, 29, 30, 29], // 1448 — published this far
];

/** Day number of the first of each month, laid out flat and in order. */
const MONTH_STARTS: number[] = (() => {
  const starts: number[] = [];
  let day = EPOCH_DAY;
  for (const year of MONTH_LENGTHS) {
    for (const length of year) {
      starts.push(day);
      day += length;
    }
  }
  return starts;
})();

/** The first day the table can answer for, as days since 1970-01-01 UTC. */
export const FIRST_DAY = EPOCH_DAY;

/** The last day the table can answer for. Past this the caller must guess. */
export const LAST_DAY =
  MONTH_STARTS[MONTH_STARTS.length - 1]! +
  MONTH_LENGTHS[MONTH_LENGTHS.length - 1]![MONTH_LENGTHS[MONTH_LENGTHS.length - 1]!.length - 1]! -
  1;

/** Where a month sits in the flat list, or -1 if the table does not hold it. */
function indexOfMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return -1;
  const yearIndex = year - FIRST_YEAR;
  if (yearIndex < 0 || yearIndex >= MONTH_LENGTHS.length) return -1;
  if (month > MONTH_LENGTHS[yearIndex]!.length) return -1;
  let index = 0;
  for (let i = 0; i < yearIndex; i += 1) index += MONTH_LENGTHS[i]!.length;
  return index + month - 1;
}

/**
 * The Iranian Hijri date of a day, or `null` where the table runs out.
 *
 * `dayNumber` is whole days since 1970-01-01 UTC — the civil date somewhere,
 * already resolved, so no time zone enters here.
 */
export function hijriFromDayNumber(dayNumber: number): HijriDate | null {
  if (!Number.isInteger(dayNumber) || dayNumber < FIRST_DAY || dayNumber > LAST_DAY) return null;

  // Binary search for the last month that began on or before this day.
  let low = 0;
  let high = MONTH_STARTS.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (MONTH_STARTS[middle]! <= dayNumber) low = middle;
    else high = middle - 1;
  }

  let index = low;
  let year = FIRST_YEAR;
  while (index >= MONTH_LENGTHS[year - FIRST_YEAR]!.length) {
    index -= MONTH_LENGTHS[year - FIRST_YEAR]!.length;
    year += 1;
  }

  return { year, month: index + 1, day: dayNumber - MONTH_STARTS[low]! + 1 };
}

/** The other way: a Hijri date to its day number, or `null` if out of range. */
export function dayNumberOfHijri(year: number, month: number, day: number): number | null {
  const index = indexOfMonth(year, month);
  if (index < 0) return null;
  const length = MONTH_LENGTHS[year - FIRST_YEAR]![month - 1]!;
  if (day < 1 || day > length) return null;
  return MONTH_STARTS[index]! + day - 1;
}
