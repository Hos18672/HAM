import { toHijri, type HijriDate } from './hijri';
import { civilDaysOn, type CivilKey, type Country } from './civil-days';
import type { Occasion } from './db/queries/content';

/**
 * Building one month of the calendar.
 *
 * Pure, and deliberately in its own module with no server imports: the same
 * function runs on the server for the first paint and in the browser every
 * time the reader moves a month. Everything it needs is either arithmetic or
 * `Intl` — the occasions are matched on the Hijri date, and the whole list of
 * them is small and month-independent, so it is handed over once and reused.
 */

/**
 * Anything named on a day: an occasion, or one of Austria's or Iran's civil
 * days (`lib/civil-days`), which carry the country and whether the day is
 * off.
 */
export interface DayEntry extends Occasion {
  country?: Country;
  off?: boolean;
}

export interface CalendarCell {
  /** ISO date of the day, or null for the leading blanks of the first week. */
  iso: string | null;
  gregorianDay: number;
  hijri: HijriDate | null;
  isToday: boolean;
  occasions: DayEntry[];
  /** The countries in which this day is a public holiday. */
  off: Country[];
}

export interface CalendarMonth {
  year: number;
  /** 1–12. */
  month: number;
  cells: CalendarCell[];
  /** Occasions falling anywhere in this Gregorian month. */
  occasions: (DayEntry & { iso: string; gregorianDay: number })[];
}

/**
 * @param todayIso The current date in Vienna as `YYYY-MM-DD`. Passed in rather
 *   than read from the clock so the server and the browser agree on which cell
 *   is today, and so a page rendered just before midnight does not disagree
 *   with itself after hydration.
 * @param fallback Occasions the site keeps outside the database — the days
 *   in `lib/holidays`. Matched on the Hijri date exactly as the editors'
 *   are, and only used for a Hijri date the editors have nothing for.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  occasions: Occasion[],
  todayIso: string,
  fallback: Occasion[] = [],
  civilText?: (key: CivilKey) => { name: string; note: string },
): CalendarMonth {
  const byHijri = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    const key = `${occasion.hijriMonth}-${occasion.hijriDay}`;
    byHijri.set(key, [...(byHijri.get(key) ?? []), occasion]);
  }

  const fallbackByHijri = new Map<string, Occasion[]>();
  for (const occasion of fallback) {
    const key = `${occasion.hijriMonth}-${occasion.hijriDay}`;
    if (byHijri.has(key)) continue;
    fallbackByHijri.set(key, [...(fallbackByHijri.get(key) ?? []), occasion]);
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();

  // The week starts on Monday, everywhere on the site. getUTCDay() counts
  // from Sunday = 0, so Monday's column is 0 and Sunday's 6.
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  const monthOccasions: (DayEntry & { iso: string; gregorianDay: number })[] = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({
      iso: null,
      gregorianDay: 0,
      hijri: null,
      isToday: false,
      occasions: [],
      off: [],
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    // Noon UTC keeps the date stable against any timezone offset.
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const hijri = toHijri(date);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${hijri.month}-${hijri.day}`;
    const own = byHijri.get(key) ?? [];
    // A copy: the civil days are added to it, and the lists in the maps serve
    // every day with the same Hijri date.
    const dayOccasions: DayEntry[] = [...(own.length > 0 ? own : (fallbackByHijri.get(key) ?? []))];
    const off: Country[] = [];

    if (civilText) {
      // The house's own days first, then Austria's, then Iran's.
      const civil = civilDaysOn(year, month, day);
      for (const entry of civil) {
        if (entry.off && !off.includes(entry.country)) off.push(entry.country);
      }
      for (const entry of civil) {
        if (!entry.key) continue;
        dayOccasions.push({
          id: `civil-${entry.key}`,
          hijriMonth: hijri.month,
          hijriDay: hijri.day,
          ...civilText(entry.key),
          country: entry.country,
          off: entry.off,
        });
      }
    }

    for (const occasion of dayOccasions) {
      monthOccasions.push({ ...occasion, iso, gregorianDay: day });
    }

    cells.push({
      iso,
      gregorianDay: day,
      hijri,
      isToday: iso === todayIso,
      occasions: dayOccasions,
      off,
    });
  }

  return { year, month, cells, occasions: monthOccasions };
}

/** The month before, wrapping the year. */
export function previousMonth({ year, month }: { year: number; month: number }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** The month after, wrapping the year. */
export function nextMonth({ year, month }: { year: number; month: number }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}
