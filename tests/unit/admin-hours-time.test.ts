import { describe, it, expect } from 'vitest';
import { toViennaInput, fromViennaInput, viennaTomorrowAt } from '@/lib/vienna-time';
import {
  OPENING_HOURS,
  expandOpeningDays,
  groupOpeningDays,
  houseStatus,
  isOpenAt,
} from '@/lib/site-facts';
import { openingHoursSchema } from '@/lib/validation/content';
import { accountUpdateSchema } from '@/lib/validation/auth';

describe('Vienna wall time for the admin date fields', () => {
  it('reads and writes winter and summer times', () => {
    expect(fromViennaInput('2026-12-20T18:00')).toBe('2026-12-20T17:00:00.000Z');
    expect(fromViennaInput('2026-07-01T18:00')).toBe('2026-07-01T16:00:00.000Z');
    expect(toViennaInput('2026-12-20T17:00:00.000Z')).toBe('2026-12-20T18:00');
    expect(toViennaInput(new Date('2026-07-01T16:00:00.000Z'))).toBe('2026-07-01T18:00');
  });

  it('round-trips across the autumn change', () => {
    expect(toViennaInput(fromViennaInput('2026-10-25T02:30'))).toBe('2026-10-25T02:30');
  });

  it('treats an empty or broken value as no date', () => {
    expect(fromViennaInput('')).toBeNull();
    expect(toViennaInput(null)).toBe('');
    expect(toViennaInput('not a date')).toBe('');
  });

  it('puts a new event at 18:00 Vienna tomorrow', () => {
    // 01:30 in Vienna on the 14th, still the 13th in UTC.
    expect(viennaTomorrowAt(18, new Date('2026-10-13T23:30:00Z'))).toBe('2026-10-15T16:00:00.000Z');
  });
});

describe('opening hours from the settings', () => {
  it('groups days with the same hours and spreads them back out', () => {
    const days = expandOpeningDays(OPENING_HOURS).map((day) => ({
      open: day.open,
      close: day.close,
      closed: day.closed,
    }));
    // Sunday runs by programme, not closed.
    expect(days[6]).toEqual({ open: null, close: null, closed: false });
    expect(groupOpeningDays(days)).toEqual(OPENING_HOURS);
  });

  it('marks a closed day and never calls it open', () => {
    const hours = groupOpeningDays([
      { open: '16:00', close: '20:00' },
      { open: '16:00', close: '20:00' },
      { open: null, close: null, closed: true },
      { open: '16:00', close: '20:00' },
      { open: '14:00', close: '22:00' },
      { open: null, close: null, closed: true },
      { open: null, close: null },
    ]);
    expect(hours.map((w) => w.days)).toEqual([[1, 2], [3], [4], [5], [6], [7]]);
    expect(hours[1]).toMatchObject({ closed: true });
    // Wednesday 17:00 in Vienna.
    const wednesday = new Date('2026-10-14T15:00:00Z');
    expect(isOpenAt(wednesday, hours)).toBe(false);
    expect(houseStatus(wednesday, hours)).toMatchObject({
      state: 'closed',
      opensDay: 4,
      opensAt: '16:00',
    });
  });

  it('validates what the form sends', () => {
    expect(openingHoursSchema.safeParse(OPENING_HOURS).success).toBe(true);
    expect(
      openingHoursSchema.safeParse([{ days: [1], open: '20:00', close: '16:00' }]).success,
    ).toBe(false);
    expect(openingHoursSchema.safeParse([{ days: [1], open: '16:00', close: null }]).success).toBe(
      false,
    );
    expect(
      openingHoursSchema.safeParse([
        { days: [1, 2], open: null, close: null },
        { days: [2], open: null, close: null },
      ]).success,
    ).toBe(false);
  });
});

describe('own account', () => {
  it('asks for the current password before a new one', () => {
    expect(accountUpdateSchema.safeParse({ name: 'A' }).success).toBe(true);
    expect(
      accountUpdateSchema.safeParse({ name: 'A', newPassword: 'ein-langes-passwort' }).success,
    ).toBe(false);
    expect(
      accountUpdateSchema.safeParse({
        name: 'A',
        currentPassword: 'alt',
        newPassword: 'kurz',
      }).success,
    ).toBe(false);
  });
});
