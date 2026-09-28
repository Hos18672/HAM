/**
 * The Solar Hijri date — the calendar Iran and Afghanistan keep.
 *
 * There are public APIs for this. None of them is needed, and none of them
 * would be better: every runtime this site touches ships ICU, and ICU knows
 * the Persian calendar exactly. `Intl` with `ca-persian` is the same
 * arithmetic Tehran uses, computed offline, identical on the server and in
 * the browser, and it cannot be down, rate-limited or wrong about a leap
 * year. An API would only add a way for the date to be missing.
 *
 * Read in `Asia/Tehran` by default rather than in the reader's own zone,
 * because the question the page answers is what the date is *in Iran*: in
 * Vienna's evening Tehran is already two and a half hours into the next day,
 * and for a page that exists to say what day it is, that matters.
 */

export interface PersianDate {
  /** The Solar Hijri year, e.g. 1405. */
  year: number;
  /** 1 = Farvardin … 12 = Esfand. */
  month: number;
  day: number;
}

export const IRAN_TIME_ZONE = 'Asia/Tehran';

export const PERSIAN_MONTHS: Record<'de' | 'fa', readonly string[]> = {
  // Transliterated the way the rest of the German on this site is.
  de: [
    'Farwardin',
    'Ordibehescht',
    'Chordad',
    'Tir',
    'Mordad',
    'Schahriwar',
    'Mehr',
    'Aban',
    'Azar',
    'Dey',
    'Bahman',
    'Esfand',
  ],
  fa: [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ],
};

/**
 * `en-u-ca-persian` rather than `fa-IR`: the parts come back in Latin digits
 * whatever the reader's language, so they parse as numbers. The digits a
 * reader actually sees are the caller's business — this returns the date,
 * not a string.
 */
export function toPersianDate(date: Date, timeZone: string = IRAN_TIME_ZONE): PersianDate {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const value = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return { year: value('year'), month: value('month'), day: value('day') };
}

/** The month's name in the reader's language, 1-based. */
export function persianMonthName(month: number, locale: 'de' | 'fa'): string {
  return PERSIAN_MONTHS[locale][month - 1] ?? '';
}
