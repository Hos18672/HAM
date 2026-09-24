import { toHijri, type HijriDate } from './hijri';
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
 * @param todayIso The current date in Vienna as `YYYY-MM-DD`. Passed in rather
 *   than read from the clock so the server and the browser agree on which cell
 *   is today, and so a page rendered just before midnight does not disagree
 *   with itself after hydration.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  occasions: Occasion[],
  todayIso: string,
): CalendarMonth {
  const byHijri = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    const key = `${occasion.hijriMonth}-${occasion.hijriDay}`;
    byHijri.set(key, [...(byHijri.get(key) ?? []), occasion]);
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();

  // getUTCDay() is 0 = Sunday, which is the column order the weekday labels use.
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells: CalendarCell[] = [];
  const monthOccasions: (Occasion & { iso: string; gregorianDay: number })[] = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ iso: null, gregorianDay: 0, hijri: null, isToday: false, occasions: [] });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    // Noon UTC keeps the date stable against any timezone offset.
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const hijri = toHijri(date);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOccasions = byHijri.get(`${hijri.month}-${hijri.day}`) ?? [];

    for (const occasion of dayOccasions) {
      monthOccasions.push({ ...occasion, iso, gregorianDay: day });
    }

    cells.push({
      iso,
      gregorianDay: day,
      hijri,
      isToday: iso === todayIso,
      occasions: dayOccasions,
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
