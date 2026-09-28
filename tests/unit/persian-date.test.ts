import { describe, it, expect } from 'vitest';
import { toPersianDate, persianMonthName, IRAN_TIME_ZONE } from '@/lib/persian-date';

describe('Solar Hijri conversion', () => {
  it('puts Nowruz on the first of Farvardin', () => {
    // Nowruz is the vernal equinox as Tehran sees it, so the Gregorian date
    // it lands on moves between the 20th and the 21st of March. Three years
    // including a Gregorian leap year, which is where a naive conversion
    // slips by a day.
    expect(toPersianDate(new Date('2024-03-20T09:00:00Z'))).toEqual({
      year: 1403,
      month: 1,
      day: 1,
    });
    expect(toPersianDate(new Date('2025-03-21T09:00:00Z'))).toEqual({
      year: 1404,
      month: 1,
      day: 1,
    });
    expect(toPersianDate(new Date('2026-03-21T09:00:00Z'))).toEqual({
      year: 1405,
      month: 1,
      day: 1,
    });
  });

  it('reads the date in Iran, not wherever the reader is', () => {
    // Half past ten at night in Vienna is one in the morning in Tehran, and
    // the point of showing this date at all is to say what day it is there.
    const viennaEvening = new Date('2026-09-28T20:30:00Z');
    expect(toPersianDate(viennaEvening, IRAN_TIME_ZONE).day).toBe(7);
    expect(toPersianDate(viennaEvening, 'Europe/Vienna').day).toBe(6);
  });

  it('names the months in both languages', () => {
    expect(persianMonthName(1, 'fa')).toBe('فروردین');
    expect(persianMonthName(1, 'de')).toBe('Farwardin');
    expect(persianMonthName(12, 'fa')).toBe('اسفند');
    expect(persianMonthName(7, 'de')).toBe('Mehr');
  });
});
