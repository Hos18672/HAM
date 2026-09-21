/**
 * Hijri dates via the platform's own Umm al-Qura implementation. The ICU data
 * that ships with every modern runtime is the same table Saudi Arabia
 * publishes, so there is nothing to maintain and nothing to fetch.
 */

export interface HijriDate {
  year: number;
  /** 1 = Muharram … 12 = Dhu al-Hijja. */
  month: number;
  day: number;
}

const CALENDAR = 'islamic-umalqura';

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
 * Convert a Gregorian instant to its Hijri date.
 *
 * `en-u-ca-islamic-umalqura` is deliberate: asking for a Latin-digit English
 * locale means the parts come back as plain integers, so no digit shaping has
 * to be undone before parsing. The timezone matters — a date rolls over at
 * local midnight, not UTC midnight.
 */
export function toHijri(date: Date, timeZone = 'Europe/Vienna'): HijriDate {
  const parts = new Intl.DateTimeFormat(`en-u-ca-${CALENDAR}-nu-latn`, {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const get = (type: string) => {
    const raw = parts.find((p) => p.type === type)?.value ?? '0';
    // The year part can carry an era suffix ("1447 AH") in some ICU versions.
    return Number.parseInt(raw.replace(/[^0-9-]/g, ''), 10);
  };

  return { year: get('year'), month: get('month'), day: get('day') };
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
