/**
 * Locale-correct formatting. Persian pages use Persian-Indic digits for every
 * date, time and count; German pages use Latin digits and de-AT conventions.
 */
import { intlLocale, type Locale } from './config';
import { toPersianDigits } from '../hijri';

const TZ = 'Europe/Vienna';

/** Apply the locale's numeral system to an already-formatted Latin string. */
export function digits(value: string | number, locale: Locale): string {
  const s = String(value);
  return locale === 'fa' ? toPersianDigits(s) : s;
}

/**
 * Arabic-Indic numerals, whatever the page's language. The numbers set
 * *inside* an Arabic text belong to that text and not to the interface
 * around it: a verse-end sign is an Arabic glyph that encloses the numeral
 * following it, and a Latin digit neither fits inside it nor sits the right
 * way round in a line that runs right to left.
 */
export function arabicIndic(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
  }).format(value);
}

export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TZ,
    numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
    ...options,
  }).format(date);
}

export function formatTime(date: Date, locale: Locale): string {
  return formatDate(date, locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "HH:MM" from minutes after midnight, in the locale's digits. */
export function formatClock(minutes: number | null, locale: Locale): string {
  if (minutes === null) return '—';
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const text = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return digits(text, locale);
}

/** The day/month plate used on event cards. */
export function formatDayPlate(date: Date, locale: Locale): { day: string; month: string } {
  return {
    day: formatDate(date, locale, { day: 'numeric' }),
    month: formatDate(date, locale, { month: 'short' }),
  };
}

/** A distance for display: rounded to the kilometre, with a grouping mark. */
export function formatDistanceKm(km: number, locale: Locale): string {
  return formatNumber(Math.round(km), locale);
}

/** A bearing in degrees, one decimal. */
export function formatBearing(deg: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(deg);
}

/** Countdown as "H:MM:SS", or "MM:SS" under an hour. */
export function formatCountdown(totalSeconds: number, locale: Locale): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  return digits(text, locale);
}

/**
 * Isolate a Latin run inside bidirectional prose.
 *
 * `<span dir="ltr">` is the right tool in JSX, but a string built for
 * interpolation has no element to hang that on — so this uses the Unicode
 * characters that exist for exactly this: FIRST STRONG ISOLATE opens a run
 * whose direction is taken from its own first strong character, and POP
 * DIRECTIONAL ISOLATE closes it. Without them an address like
 * "Sautergasse 34–38, 1170 Wien" has its digits and punctuation reordered
 * when it lands in a Persian sentence.
 */
export function isolate(value: string): string {
  if (!value) return value;
  return `\u2068${value}\u2069`;
}

export type DayStyle =
  /** شنبه ۲۵ مهر ۱۴۰۵ · Samstag, 17. Oktober 2026 */
  | 'full'
  /** شنبه ۲۵ مهر · Samstag, 17. Oktober */
  | 'weekday'
  /** ۲۵ مهر ۱۴۰۵ · 17. Oktober 2026 */
  | 'date'
  /** ۲۵ مهر · 17. Oktober */
  | 'dayMonth'
  /** شنبه ۲۵ مهر، ۱۸:۰۰ · Samstag, 17. Oktober, 18:00 */
  | 'weekdayTime'
  /** مهر ۱۴۰۵ · Oktober 2026 */
  | 'monthYear';

/**
 * The one date formatter for prose and labels.
 *
 * ICU's Persian patterns put the year first and join with a Latin comma
 * ("۱۴۰۵ مهر ۲۳, پنجشنبه"), and the German day takes a period that has no
 * place in Persian. So the parts are taken from ICU and laid out here:
 * weekday · day · month · year, spaces between, and the Persian comma before
 * a time. Persian pages read the solar calendar unless `calendar: 'gregory'`
 * asks for the Gregorian date (used beside it on event badges).
 */
export function formatDay(
  locale: Locale,
  date: Date,
  style: DayStyle = 'full',
  { calendar }: { calendar?: 'gregory' } = {},
): string {
  const withWeekday = style === 'full' || style === 'weekday' || style === 'weekdayTime';
  const withDay = style !== 'monthYear';
  const withYear = style === 'full' || style === 'date' || style === 'monthYear';
  const parts = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TZ,
    numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
    ...(calendar ? { calendar } : {}),
    weekday: withWeekday ? 'long' : undefined,
    day: withDay ? 'numeric' : undefined,
    month: 'long',
    year: withYear ? 'numeric' : undefined,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  let text: string;
  if (locale === 'fa') {
    text = [
      withWeekday && part('weekday'),
      withDay && part('day'),
      part('month'),
      withYear && part('year'),
    ]
      .filter(Boolean)
      .join(' ');
  } else {
    const day = withDay ? `${part('day')}. ${part('month')}` : part('month');
    text = [withWeekday && part('weekday'), withYear ? `${day} ${part('year')}` : day]
      .filter(Boolean)
      .join(', ');
  }
  if (style === 'weekdayTime')
    text += `${locale === 'fa' ? '، ' : ', '}${formatTime(date, locale)}`;
  return text;
}

/** "۲ ساعت و ۱۴ دقیقه" · "2 Std. 14 Min." — a countdown in words, to the minute. */
export function formatDuration(totalSeconds: number, locale: Locale): string {
  const minutesLeft = Math.ceil(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  if (locale === 'fa') {
    if (h === 0) return m === 0 ? 'کمتر از یک دقیقه' : `${digits(m, locale)} دقیقه`;
    return m === 0
      ? `${digits(h, locale)} ساعت`
      : `${digits(h, locale)} ساعت و ${digits(m, locale)} دقیقه`;
  }
  if (h === 0) return m === 0 ? 'unter 1 Min.' : `${m} Min.`;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}

/**
 * A span of clock times. Persian reads "۱۶:۰۰ تا ۲۰:۰۰": an en dash between
 * two digit runs in a right-to-left line is reordered by the bidi algorithm
 * and came out as "۲۰:۰۰–۱۶:۰۰".
 */
export function timeRange(start: string, end: string | null | undefined, locale: Locale): string {
  if (!end) return digits(start, locale);
  return locale === 'fa' ? `${digits(start, locale)} تا ${digits(end, locale)}` : `${start}–${end}`;
}
