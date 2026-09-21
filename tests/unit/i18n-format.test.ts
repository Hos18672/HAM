import { describe, it, expect } from 'vitest';
import {
  digits,
  formatNumber,
  formatDate,
  formatTime,
  formatClock,
  formatDayPlate,
  formatDistanceKm,
  formatBearing,
  formatCountdown,
} from '@/lib/i18n/format';
import { locales, localeDirection, intlLocale, isLocale } from '@/lib/i18n/config';
import faMessages from '@/messages/fa.json';
import deMessages from '@/messages/de.json';

describe('locale configuration', () => {
  it('has Persian first and both directions set', () => {
    expect(locales).toEqual(['fa', 'de']);
    expect(localeDirection.fa).toBe('rtl');
    expect(localeDirection.de).toBe('ltr');
  });

  it('uses Austrian German, not German German', () => {
    // de-AT says "Jänner"; de-DE says "Januar".
    expect(intlLocale.de).toBe('de-AT');
    expect(formatDate(new Date('2024-01-15T12:00:00Z'), 'de', { month: 'long' })).toBe('Jänner');
  });

  it('recognises only the two real locales', () => {
    expect(isLocale('fa')).toBe(true);
    expect(isLocale('de')).toBe(true);
    expect(isLocale('en')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});

describe('message catalogues', () => {
  /** Every leaf key, as a dotted path. */
  function keys(object: unknown, prefix = ''): string[] {
    if (object === null || typeof object !== 'object' || Array.isArray(object)) return [prefix];
    return Object.entries(object as Record<string, unknown>).flatMap(([key, value]) =>
      keys(value, prefix ? `${prefix}.${key}` : key),
    );
  }

  it('has exactly the same keys in both languages', () => {
    const fa = keys(faMessages).sort();
    const de = keys(deMessages).sort();
    // A key present in one language and missing in the other is a string that
    // will render as a raw path to somebody.
    expect(fa).toEqual(de);
  });

  it('has no empty strings', () => {
    function walk(object: unknown, path: string): void {
      if (typeof object === 'string') {
        expect(object.length, `${path} is empty`).toBeGreaterThan(0);
        return;
      }
      if (Array.isArray(object)) {
        object.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (object && typeof object === 'object') {
        for (const [key, value] of Object.entries(object)) walk(value, `${path}.${key}`);
      }
    }
    walk(faMessages, 'fa');
    walk(deMessages, 'de');
  });

  it('has seven weekday labels in both languages', () => {
    expect(faMessages.prayer.weekdays).toHaveLength(7);
    expect(deMessages.prayer.weekdays).toHaveLength(7);
  });
});

describe('numerals', () => {
  it('uses Persian-Indic digits for Persian and Latin for German', () => {
    expect(digits('2024', 'fa')).toBe('۲۰۲۴');
    expect(digits('2024', 'de')).toBe('2024');
    expect(digits(42, 'fa')).toBe('۴۲');
  });

  it("formats numbers in the locale's numbering system", () => {
    // Austrian German groups thousands with a no-break space (U+00A0), not
    // with the point German German uses — which is exactly why the app asks
    // for de-AT rather than de.
    expect(formatNumber(3637, 'de')).toBe('3\u00a0637');
    expect(formatNumber(3637, 'fa')).toMatch(/[۰-۹]/);
    expect(formatNumber(3637, 'fa')).not.toMatch(/[0-9]/);
  });

  it('formats a distance, rounded to the kilometre', () => {
    expect(formatDistanceKm(3637.4, 'de')).toBe('3\u00a0637');
    expect(formatDistanceKm(3637.6, 'de')).toBe('3\u00a0638');
    expect(formatDistanceKm(3637.4, 'fa')).toMatch(/[۰-۹]/);
  });

  it('formats a bearing to one decimal', () => {
    expect(formatBearing(136.648, 'de')).toBe('136,6'); // de-AT uses a comma
    expect(formatBearing(136.648, 'fa')).toMatch(/[۰-۹]/);
  });
});

describe('dates and times', () => {
  const date = new Date('2024-07-15T14:30:00Z'); // 16:30 in Vienna

  it('renders times in Vienna, whatever the server timezone', () => {
    expect(formatTime(date, 'de')).toBe('16:30');
  });

  it('renders the day/month plate', () => {
    const plate = formatDayPlate(date, 'de');
    expect(plate.day).toBe('15');
    expect(plate.month).toMatch(/Jul/);

    const persian = formatDayPlate(date, 'fa');
    expect(persian.day).toMatch(/[۰-۹]/);
  });

  it('formats a clock value from minutes after midnight', () => {
    expect(formatClock(0, 'de')).toBe('00:00');
    expect(formatClock(5 * 60 + 7, 'de')).toBe('05:07');
    expect(formatClock(5 * 60 + 7, 'fa')).toBe('۰۵:۰۷');
    // Past midnight wraps.
    expect(formatClock(25 * 60, 'de')).toBe('01:00');
    // A time that does not occur prints an em dash, never a crash.
    expect(formatClock(null, 'de')).toBe('—');
    expect(formatClock(null, 'fa')).toBe('—');
  });

  it('formats a countdown, dropping the hour when there is none', () => {
    expect(formatCountdown(3 * 3600 + 5 * 60 + 9, 'de')).toBe('3:05:09');
    expect(formatCountdown(5 * 60 + 9, 'de')).toBe('05:09');
    expect(formatCountdown(0, 'de')).toBe('00:00');
    // Never counts below zero.
    expect(formatCountdown(-30, 'de')).toBe('00:00');
    expect(formatCountdown(65, 'fa')).toBe('۰۱:۰۵');
  });
});
