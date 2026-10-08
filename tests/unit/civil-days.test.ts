import { describe, expect, it } from 'vitest';
import { civilDaysOn, easterSunday } from '@/lib/civil-days';
import { buildCalendarMonth } from '@/lib/calendar';

const keysOn = (y: number, m: number, d: number) =>
  civilDaysOn(y, m, d)
    .map((entry) => entry.key)
    .filter(Boolean);

describe('Easter', () => {
  it('matches the published dates', () => {
    expect(easterSunday(2024)).toEqual({ month: 3, day: 31 });
    expect(easterSunday(2025)).toEqual({ month: 4, day: 20 });
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
  });
});

describe('Austria', () => {
  it('has the fixed public holidays', () => {
    expect(keysOn(2026, 10, 26)).toContain('atNationalDay');
    expect(keysOn(2026, 12, 8)).toContain('atImmaculate');
    expect(civilDaysOn(2026, 12, 25)).toContainEqual({
      key: 'atChristmas',
      off: true,
      country: 'at',
    });
  });

  it('moves with Easter', () => {
    expect(keysOn(2026, 4, 6)).toContain('atEasterMonday');
    expect(keysOn(2026, 5, 14)).toContain('atAscension');
    expect(keysOn(2026, 5, 25)).toContain('atWhitMonday');
    expect(keysOn(2026, 6, 4)).toContain('atCorpusChristi');
  });

  it('keeps Good Friday and Christmas Eve as days to know, not days off', () => {
    expect(civilDaysOn(2026, 4, 3)).toContainEqual({
      key: 'atGoodFriday',
      off: false,
      country: 'at',
    });
    expect(civilDaysOn(2026, 12, 24)).toContainEqual({
      key: 'atChristmasEve',
      off: false,
      country: 'at',
    });
  });

  it('marks the clock changes', () => {
    expect(keysOn(2026, 3, 29)).toContain('atSummerTime');
    expect(keysOn(2026, 10, 25)).toContain('atWinterTime');
    expect(keysOn(2026, 10, 18)).not.toContain('atWinterTime');
  });
});

describe('Iran', () => {
  it('has Nowruz and the national days', () => {
    expect(keysOn(2026, 3, 21)).toContain('irNowruz');
    expect(keysOn(2026, 4, 2)).toContain('irNatureDay');
    expect(keysOn(2026, 2, 11)).toContain('irRevolution');
    expect(keysOn(2026, 12, 21)).toContain('irYalda');
  });

  it('puts Chaharshanbe Suri on the last Tuesday evening of the year', () => {
    expect(keysOn(2026, 3, 17)).toContain('irChaharshanbeSuri');
    expect(keysOn(2026, 3, 10)).not.toContain('irChaharshanbeSuri');
  });

  it('flags the religious holidays as days off', () => {
    // Ashura 1448 — 10 Muharram — falls in late June 2026.
    const june = buildCalendarMonth(2026, 6, [], '2026-06-01', [], (key) => ({
      name: key,
      note: '',
    }));
    const ashura = june.cells.find((cell) => cell.hijri?.month === 1 && cell.hijri.day === 10);
    expect(ashura?.off).toEqual(['ir']);
  });
});

describe('the month', () => {
  const text = (key: string) => ({ name: key, note: '' });

  it('lists the civil days with the occasions and marks the days off', () => {
    const month = buildCalendarMonth(2026, 10, [], '2026-10-01', [], text);
    const national = month.cells.find((cell) => cell.iso === '2026-10-26');
    expect(national?.off).toContain('at');
    expect(month.occasions.map((o) => o.name)).toEqual(
      expect.arrayContaining(['atNationalDay', 'atWinterTime']),
    );
  });

  it('leaves them out without the words for them', () => {
    const month = buildCalendarMonth(2026, 10, [], '2026-10-01');
    expect(month.occasions).toEqual([]);
    expect(month.cells.every((cell) => cell.off.length === 0)).toBe(true);
  });

  it('does not leak a civil day into the occasions it is matched with', () => {
    const occasion = { id: 'x', hijriMonth: 1, hijriDay: 10, name: 'Ashura', note: '' };
    buildCalendarMonth(2026, 6, [occasion], '2026-06-01', [], text);
    const again = buildCalendarMonth(2026, 6, [occasion], '2026-06-01', [], text);
    const day = again.cells.find((cell) => cell.hijri?.month === 1 && cell.hijri.day === 10);
    expect(day?.occasions.map((o) => o.name)).toEqual(['Ashura']);
  });
});
