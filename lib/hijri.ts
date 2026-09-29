/**
 * Hijri dates, in the reckoning Iran keeps and this house reads.
 *
 * The month starts come from the table in `lib/hijri-iran`, which is the
 * published Iranian calendar. Umm al-Qura — the Saudi table ICU ships, and
 * what this module used to return — is a day earlier in two months out of
 * three, and that is what put every commemoration on the wrong day.
 *
 * Past the end of the published table there is nothing to read, so the Saudi
 * table is used and moved on by a day: the likelier of the two answers, and
 * the same one the table itself gives about two thirds of the time. There is
 * no third source to ask; an API would only be somebody else's table, and off
 * the air besides.
 */

import { hijriFromDayNumber } from './hijri-iran';

export interface HijriDate {
  year: number;
  /** 1 = Muharram … 12 = Dhu al-Hijja. */
  month: number;
  day: number;
}

const CALENDAR = 'islamic-umalqura';
const DAY_MS = 86_400_000;

/** Month names, indexed 1–12. Kept here rather than in the message catalogue
 *  because they are calendar data, not interface chrome. */
export const HIJRI_MONTHS: Record<'fa' | 'de', readonly string[]> = {
  fa: [
    '',
    'محرم',
    'صفر',
    'ربیع‌الاول',
    'ربیع‌الثانی',
    'جمادی‌الاول',
    'جمادی‌الثانی',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذی‌القعده',
    'ذی‌الحجه',
  ],
  de: [
    '',
    'Muharram',
    'Safar',
    'Rabi al-auwal',
    'Rabi ath-thani',
    'Dschumada l-ula',
    'Dschumada th-thaniya',
    'Radschab',
    'Schaban',
    'Ramadan',
    'Schauwal',
    'Dhu l-qada',
    'Dhu l-hiddscha',
  ],
};

/**
 * Which civil day an instant falls on, as whole days since 1970-01-01 UTC.
 *
 * The timezone matters — a date rolls over at local midnight, not UTC
 * midnight — so the civil date is read out in the place first and only then
 * turned into a number, rather than dividing the instant by a day's worth of
 * milliseconds and hoping.
 */
function civilDayNumber(date: Date, timeZone: string): number {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number) as [number, number, number];

  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/**
 * The Umm al-Qura date of a day number — the Saudi table, kept for the
 * fallback and for anything that wants to compare the two reckonings.
 *
 * `en-u-ca-islamic-umalqura-nu-latn` is deliberate: asking for a Latin-digit
 * English locale means the parts come back as plain integers, so no digit
 * shaping has to be undone before parsing.
 */
export function ummAlQuraFromDayNumber(dayNumber: number): HijriDate {
  // Noon, so the reading cannot slip either way across the UTC midnight.
  const parts = new Intl.DateTimeFormat(`en-u-ca-${CALENDAR}-nu-latn`, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(dayNumber * DAY_MS + DAY_MS / 2));

  const get = (type: string) => {
    const raw = parts.find((p) => p.type === type)?.value ?? '0';
    // The year part can carry an era suffix ("1447 AH") in some ICU versions.
    return Number.parseInt(raw.replace(/[^0-9-]/g, ''), 10);
  };

  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Convert a Gregorian instant to its Hijri date, as Iran reckons it. */
export function toHijri(date: Date, timeZone = 'Europe/Vienna'): HijriDate {
  const dayNumber = civilDayNumber(date, timeZone);
  // Past the table: the Saudi reading of the day before, which is the
  // Iranian reading of this day whenever the month began a day later there.
  return hijriFromDayNumber(dayNumber) ?? ummAlQuraFromDayNumber(dayNumber - 1);
}

/** The same instant in the Umm al-Qura reckoning, for comparison. */
export function toUmmAlQura(date: Date, timeZone = 'Europe/Vienna'): HijriDate {
  return ummAlQuraFromDayNumber(civilDayNumber(date, timeZone));
}

export function formatHijri(date: Date, locale: 'fa' | 'de', timeZone = 'Europe/Vienna'): string {
  const h = toHijri(date, timeZone);
  const monthName = HIJRI_MONTHS[locale][h.month] ?? '';
  const digits = locale === 'fa' ? toPersianDigits : (s: string) => s;
  return locale === 'fa'
    ? `${digits(String(h.day))} ${monthName} ${digits(String(h.year))}`
    : `${h.day}. ${monthName} ${h.year}`;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Latin digits → Persian-Indic. Non-digits pass through untouched. */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function isSameHijriDay(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
