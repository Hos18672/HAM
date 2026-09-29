import { describe, it, expect } from 'vitest';
import {
  toHijri,
  toUmmAlQura,
  ummAlQuraFromDayNumber,
  formatHijri,
  toPersianDigits,
  isSameHijriDay,
  HIJRI_MONTHS,
} from '@/lib/hijri';
import { FIRST_DAY, LAST_DAY, hijriFromDayNumber, dayNumberOfHijri } from '@/lib/hijri-iran';

/**
 * The anchors are the days Iran actually kept, taken from the published
 * Iranian calendar for those years — the commemorations the house marks, so
 * a wrong answer here is a wrong answer on the wall. Umm al-Qura puts four
 * of these five a day earlier, which is the error being pinned down.
 */
const IRANIAN_DATES: [iso: string, year: number, month: number, day: number, what: string][] = [
  ['2025-07-06', 1447, 1, 10, 'Ashura 1447'],
  ['2026-06-25', 1448, 1, 10, 'Ashura 1448'],
  ['2026-08-04', 1448, 2, 20, 'Arbaʿin 1448'],
  ['2026-08-30', 1448, 3, 17, "the Prophet's birthday 1448"],
  ['2026-09-22', 1448, 4, 10, 'the death of Fatima Masuma 1448'],
  ['2024-03-12', 1445, 9, 1, '1 Ramadan 1445'],
  ['2025-03-02', 1446, 9, 1, '1 Ramadan 1446'],
  ['2026-02-19', 1447, 9, 1, '1 Ramadan 1447'],
];

describe('Hijri conversion', () => {
  it.each(IRANIAN_DATES)('puts %s at %i-%i-%i (%s)', (iso, year, month, day) => {
    expect(toHijri(new Date(`${iso}T12:00:00Z`))).toEqual({ year, month, day });
  });

  it('is not the Umm al-Qura calendar', () => {
    // The whole point of the table. On the day Iran keeps as the tenth of
    // Rabi ath-thani — the death of Fatima Masuma, whose shrine is at Ghom —
    // the Saudi reckoning is already at the eleventh. Reading that one put
    // the commemoration on the 21st of September, a day before it falls.
    const masuma = new Date('2026-09-22T12:00:00Z');
    expect(toHijri(masuma)).toEqual({ year: 1448, month: 4, day: 10 });
    expect(toUmmAlQura(masuma)).toEqual({ year: 1448, month: 4, day: 11 });
  });

  it('never begins a month before Umm al-Qura does', () => {
    // A sighting cannot happen before the calculation allows it, so an
    // Iranian month begins on the Saudi day or after it — never before, and
    // never by more than two days. On the day the table calls the first of a
    // month, the Saudi table therefore reads the 1st, 2nd or 3rd.
    for (let day = FIRST_DAY; day <= LAST_DAY; day += 1) {
      const iran = hijriFromDayNumber(day)!;
      if (iran.day !== 1) continue;
      const saudi = ummAlQuraFromDayNumber(day);
      expect(saudi.day, `${iran.year}-${iran.month} starts on day ${day}`).toBeLessThanOrEqual(3);
    }
  });

  it('rolls over on the local day, not the UTC day', () => {
    // 23:30 Vienna time on one day is still that day, even though it is
    // already the next day in UTC+3.
    const late = new Date('2024-03-10T22:30:00Z'); // 23:30 CET
    expect(toHijri(late, 'Europe/Vienna').day).toBe(toHijri(new Date('2024-03-10T12:00:00Z')).day);
  });

  it('produces a month between 1 and 12 and a day between 1 and 30', () => {
    for (let offset = 0; offset < 800; offset += 17) {
      const date = new Date(Date.UTC(2024, 0, 1 + offset, 12));
      const hijri = toHijri(date);
      expect(hijri.month).toBeGreaterThanOrEqual(1);
      expect(hijri.month).toBeLessThanOrEqual(12);
      expect(hijri.day).toBeGreaterThanOrEqual(1);
      expect(hijri.day).toBeLessThanOrEqual(30);
    }
  });

  it('advances by exactly one Hijri day per Gregorian day', () => {
    let previous = toHijri(new Date(Date.UTC(2024, 5, 1, 12)));
    for (let offset = 1; offset < 120; offset += 1) {
      const current = toHijri(new Date(Date.UTC(2024, 5, 1 + offset, 12)));
      const advanced =
        current.day === previous.day + 1 ||
        // A month boundary: the day resets to 1.
        (current.day === 1 && current.month !== previous.month);
      expect(advanced, `${JSON.stringify(previous)} → ${JSON.stringify(current)}`).toBe(true);
      previous = current;
    }
  });

  it('keeps advancing by one day across the end of the table', () => {
    // The seam between the published calendar and the fallback is the one
    // place a day could be repeated or skipped.
    let previous = hijriFromDayNumber(LAST_DAY - 3)!;
    for (let day = LAST_DAY - 2; day <= LAST_DAY + 40; day += 1) {
      const current = toHijri(new Date(day * 86_400_000 + 43_200_000), 'UTC');
      const advanced =
        current.day === previous.day + 1 || (current.day === 1 && current.month !== previous.month);
      expect(advanced, `day ${day}: ${JSON.stringify(previous)} → ${JSON.stringify(current)}`).toBe(
        true,
      );
      previous = current;
    }
  });

  it('names the months in both languages', () => {
    expect(HIJRI_MONTHS.de[1]).toBe('Muharram');
    expect(HIJRI_MONTHS.de[9]).toBe('Ramadan');
    expect(HIJRI_MONTHS.fa[1]).toBe('محرم');
    expect(HIJRI_MONTHS.fa[9]).toBe('رمضان');
    // Index 0 is a deliberate blank so months can be addressed 1–12.
    expect(HIJRI_MONTHS.de[0]).toBe('');
  });

  it('formats a Hijri date per locale', () => {
    const date = new Date('2024-03-12T12:00:00Z');
    expect(formatHijri(date, 'de')).toBe('1. Ramadan 1445');
    // Persian uses Persian-Indic digits.
    expect(formatHijri(date, 'fa')).toBe('۱ رمضان ۱۴۴۵');
  });

  it('compares two Hijri dates', () => {
    const a = { year: 1445, month: 9, day: 1 };
    expect(isSameHijriDay(a, { year: 1445, month: 9, day: 1 })).toBe(true);
    expect(isSameHijriDay(a, { year: 1445, month: 9, day: 2 })).toBe(false);
    expect(isSameHijriDay(a, { year: 1446, month: 9, day: 1 })).toBe(false);
  });
});

describe('The Iranian month table', () => {
  it('answers for every day it covers, and for none outside', () => {
    expect(hijriFromDayNumber(FIRST_DAY)).toEqual({ year: 1423, month: 1, day: 1 });
    expect(hijriFromDayNumber(FIRST_DAY - 1)).toBeNull();
    expect(hijriFromDayNumber(LAST_DAY)).not.toBeNull();
    expect(hijriFromDayNumber(LAST_DAY + 1)).toBeNull();
  });

  it('round-trips every day it covers', () => {
    for (let day = FIRST_DAY; day <= LAST_DAY; day += 1) {
      const hijri = hijriFromDayNumber(day)!;
      expect(dayNumberOfHijri(hijri.year, hijri.month, hijri.day), `day ${day}`).toBe(day);
    }
  });

  it('holds only months of 29 or 30 days', () => {
    let previous = hijriFromDayNumber(FIRST_DAY)!;
    let length = 1;
    for (let day = FIRST_DAY + 1; day <= LAST_DAY; day += 1) {
      const current = hijriFromDayNumber(day)!;
      if (current.month === previous.month && current.year === previous.year) {
        length += 1;
      } else {
        expect(length, `${previous.year}-${previous.month}`).toBeGreaterThanOrEqual(29);
        expect(length, `${previous.year}-${previous.month}`).toBeLessThanOrEqual(30);
        length = 1;
      }
      previous = current;
    }
  });
});

describe('Persian digits', () => {
  it('converts Latin digits and leaves everything else alone', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(toPersianDigits('12:45')).toBe('۱۲:۴۵');
    expect(toPersianDigits('Sautergasse 34–38')).toBe('Sautergasse ۳۴–۳۸');
    expect(toPersianDigits('')).toBe('');
    expect(toPersianDigits('بدون عدد')).toBe('بدون عدد');
  });
});
