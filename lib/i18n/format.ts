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
