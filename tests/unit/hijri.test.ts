import { describe, it, expect } from 'vitest';
import { toHijri, formatHijri, toPersianDigits, isSameHijriDay, HIJRI_MONTHS } from '@/lib/hijri';

describe('Hijri conversion', () => {
  it('converts known Gregorian dates to the Umm al-Qura calendar', () => {
    // 1 Muharram 1445 fell on 19 July 2023.
    expect(toHijri(new Date('2023-07-19T12:00:00Z'))).toEqual({ year: 1445, month: 1, day: 1 });
    // 1 Ramadan 1445 fell on 11 March 2024.
    expect(toHijri(new Date('2024-03-11T12:00:00Z'))).toEqual({ year: 1445, month: 9, day: 1 });
    // 1 Muharram 1446 fell on 7 July 2024.
    expect(toHijri(new Date('2024-07-07T12:00:00Z'))).toEqual({ year: 1446, month: 1, day: 1 });
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

  it('names the months in both languages', () => {
    expect(HIJRI_MONTHS.de[1]).toBe('Muharram');
    expect(HIJRI_MONTHS.de[9]).toBe('Ramadan');
    expect(HIJRI_MONTHS.fa[1]).toBe('محرم');
    expect(HIJRI_MONTHS.fa[9]).toBe('رمضان');
    // Index 0 is a deliberate blank so months can be addressed 1–12.
    expect(HIJRI_MONTHS.de[0]).toBe('');
  });

  it('formats a Hijri date per locale', () => {
    const date = new Date('2024-03-11T12:00:00Z');
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

describe('Persian digits', () => {
  it('converts Latin digits and leaves everything else alone', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(toPersianDigits('12:45')).toBe('۱۲:۴۵');
    expect(toPersianDigits('Sautergasse 34–38')).toBe('Sautergasse ۳۴–۳۸');
    expect(toPersianDigits('')).toBe('');
    expect(toPersianDigits('بدون عدد')).toBe('بدون عدد');
  });
});
