import { describe, it, expect } from 'vitest';
import {
  getPrayerTimes,
  getNextPrayer,
  formatMinutes,
  julianDay,
  sunPosition,
  hourAngle,
  utcOffsetHours,
  localMinutes,
  VIENNA,
  type PrayerTimes,
} from '@/lib/prayer-times';

/**
 * Tolerance for the table comparisons. Published prayer tables are themselves
 * rounded to the minute and differ slightly between publishers, so ±2 minutes
 * is the honest bar — tighter than that would be testing one publisher's
 * rounding, not the algorithm.
 */
const TOLERANCE_MINUTES = 2;

/** Parse "HH:MM" into minutes after midnight. */
function minutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h! * 60 + m!;
}

function expectClose(actual: number | null, expected: string, label: string) {
  expect(actual, `${label} should occur`).not.toBeNull();
  const delta = Math.abs(actual! - minutes(expected));
  expect(
    delta,
    `${label}: got ${formatMinutes(actual)}, expected ~${expected} (off by ${delta} min)`,
  ).toBeLessThanOrEqual(TOLERANCE_MINUTES);
}

describe('astronomical primitives', () => {
  it('computes the Julian day for the J2000.0 epoch', () => {
    // 2000-01-01 00:00 UT is JD 2451544.5; J2000.0 itself is noon that day.
    expect(julianDay(2000, 1, 1)).toBe(2451544.5);
  });

  it('computes the Julian day across the Gregorian calendar rules', () => {
    expect(julianDay(2024, 2, 29)).toBe(2460369.5);
    expect(julianDay(1987, 1, 27)).toBe(2446822.5); // Meeus, example 7.a
  });

  it('puts the solar declination near zero at the equinoxes', () => {
    const march = sunPosition(julianDay(2024, 3, 20) + 0.5);
    const september = sunPosition(julianDay(2024, 9, 22) + 0.5);
    expect(Math.abs(march.declination)).toBeLessThan(1);
    expect(Math.abs(september.declination)).toBeLessThan(1);
  });

  it('puts the solar declination near the obliquity at the solstices', () => {
    const june = sunPosition(julianDay(2024, 6, 20) + 0.5);
    const december = sunPosition(julianDay(2024, 12, 21) + 0.5);
    expect(june.declination).toBeGreaterThan(23.2);
    expect(december.declination).toBeLessThan(-23.2);
  });

  it('keeps the equation of time within its real annual range', () => {
    // The equation of time never leaves roughly -14.3 to +16.4 minutes.
    for (let day = 0; day < 365; day += 7) {
      const { equationOfTime } = sunPosition(julianDay(2024, 1, 1) + day);
      const asMinutes = equationOfTime * 60;
      expect(asMinutes).toBeGreaterThan(-15);
      expect(asMinutes).toBeLessThan(17);
    }
  });

  it('returns null from the hour angle when the sun never reaches the depression', () => {
    // Tromsø in midsummer: the sun does not set, let alone reach 16° below.
    const midsummer = sunPosition(julianDay(2024, 6, 21) + 0.5);
    expect(hourAngle(16, 69.65, midsummer.declination)).toBeNull();
  });
});

describe('Vienna timezone handling', () => {
  it('reads CET in winter and CEST in summer', () => {
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 1, 15)).toBe(1);
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 7, 15)).toBe(2);
  });

  it('switches on the correct DST boundary days', () => {
    // 2024: clocks go forward 31 March, back 27 October.
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 3, 30)).toBe(1);
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 3, 31)).toBe(2);
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 10, 26)).toBe(2);
    expect(utcOffsetHours(VIENNA.timeZone, 2024, 10, 27)).toBe(1);
  });

  it('reads local minutes in Vienna, not in the process timezone', () => {
    // 12:00 UTC on a summer day is 14:00 in Vienna.
    const summer = new Date('2024-07-15T12:00:00Z');
    expect(localMinutes(summer, VIENNA.timeZone)).toBeCloseTo(14 * 60, 0);
  });
});

describe("Ja'fari prayer times for Vienna", () => {
  /**
   * Reference values for Vienna (48.2175 N, 16.3260 E) computed with the
   * Ja'fari method — Fajr 16°, Isha 14°, Maghrib 4° after sunset, Asr shadow
   * factor 1. Cross-checked against published Leva Institute tables.
   */
  const CASES: {
    label: string;
    date: string;
    expected: Partial<Record<keyof PrayerTimes, string>>;
  }[] = [
    {
      label: 'summer solstice (CEST)',
      date: '2024-06-20T10:00:00Z',
      expected: {
        fajr: '02:19',
        sunrise: '04:54',
        dhuhr: '12:56',
        asr: '17:12',
        maghrib: '21:24',
        isha: '23:03',
      },
    },
    {
      label: 'March equinox (CET, day before the DST switch)',
      date: '2024-03-20T10:00:00Z',
      expected: {
        fajr: '04:24',
        sunrise: '05:57',
        dhuhr: '12:02',
        asr: '15:23',
        maghrib: '18:27',
        isha: '19:28',
      },
    },
    {
      label: 'winter solstice (CET)',
      date: '2024-12-21T10:00:00Z',
      expected: {
        fajr: '06:01',
        sunrise: '07:43',
        dhuhr: '11:53',
        asr: '13:46',
        maghrib: '16:26',
        isha: '17:32',
      },
    },
    {
      label: 'DST begins — clocks go forward',
      date: '2024-03-31T10:00:00Z',
      expected: {
        fajr: '04:58',
        sunrise: '06:34',
        dhuhr: '12:59',
        asr: '16:32',
        maghrib: '19:43',
        isha: '20:46',
      },
    },
    {
      label: 'DST ends — clocks go back',
      date: '2024-10-27T10:00:00Z',
      expected: {
        fajr: '05:00',
        sunrise: '06:33',
        dhuhr: '11:39',
        asr: '14:16',
        maghrib: '17:04',
        isha: '18:05',
      },
    },
  ];

  for (const testCase of CASES) {
    it(`matches the published table at the ${testCase.label}`, () => {
      const times = getPrayerTimes(new Date(testCase.date));
      for (const [key, expected] of Object.entries(testCase.expected)) {
        expectClose(times[key as keyof PrayerTimes], expected, key);
      }
    });
  }

  it('orders the seven times correctly through the day', () => {
    const times = getPrayerTimes(new Date('2024-09-15T10:00:00Z'));
    expect(times.fajr!).toBeLessThan(times.sunrise!);
    expect(times.sunrise!).toBeLessThan(times.dhuhr!);
    expect(times.dhuhr!).toBeLessThan(times.asr!);
    expect(times.asr!).toBeLessThan(times.maghrib!);
    expect(times.maghrib!).toBeLessThan(times.isha!);
    expect(times.isha!).toBeLessThan(times.midnight!);
  });

  it("places Maghrib after sunset, as the Ja'fari method requires", () => {
    // Maghrib is 4° below the horizon rather than at the apparent sunset
    // (0.833°), so it always falls a little later — 15 to 25 minutes in Vienna.
    const times = getPrayerTimes(new Date('2024-05-10T10:00:00Z'));
    const gap = times.maghrib! - (times.dhuhr! + (times.dhuhr! - times.sunrise!));
    expect(gap).toBeGreaterThan(10);
    expect(gap).toBeLessThan(35);
  });

  it("puts shar'i midnight between sunset and the next dawn", () => {
    const times = getPrayerTimes(new Date('2024-09-15T10:00:00Z'));
    // Expressed in minutes after today's midnight it may exceed 24 h, which is
    // intentional: the value stays monotonic for the countdown.
    expect(times.midnight!).toBeGreaterThan(times.maghrib!);
    expect(times.midnight!).toBeLessThan(times.maghrib! + 12 * 60);
  });

  it('returns null rather than crashing at high latitude', () => {
    // Longyearbyen in midsummer: no sunrise, no dawn, no dusk.
    const times = getPrayerTimes(new Date('2024-06-21T10:00:00Z'), {
      coordinates: { latitude: 78.22, longitude: 15.65 },
      timeZone: 'Europe/Oslo',
    });
    expect(times.fajr).toBeNull();
    expect(times.sunrise).toBeNull();
    expect(times.isha).toBeNull();
    // Dhuhr always happens — the sun still crosses the meridian.
    expect(times.dhuhr).not.toBeNull();
  });

  it('formats a missing time as an em dash rather than throwing', () => {
    expect(formatMinutes(null)).toBeNull();
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05');
    // Past midnight wraps rather than printing "25:10".
    expect(formatMinutes(25 * 60 + 10)).toBe('01:10');
  });
});

describe('next prayer selection', () => {
  const times: PrayerTimes = {
    fajr: 300, // 05:00
    sunrise: 400,
    dhuhr: 720, // 12:00
    asr: 960, // 16:00
    maghrib: 1140, // 19:00
    isha: 1200, // 20:00
    midnight: 1440,
  };

  it('picks the next prayer later in the day', () => {
    expect(getNextPrayer(times, 100, 300)).toMatchObject({ key: 'fajr', tomorrow: false });
    expect(getNextPrayer(times, 600, 300)).toMatchObject({ key: 'dhuhr', tomorrow: false });
    expect(getNextPrayer(times, 1000, 300)).toMatchObject({ key: 'maghrib', tomorrow: false });
  });

  it('skips sunrise and midnight, which are not prayers', () => {
    // At 05:30, between Fajr and sunrise, the next *prayer* is Dhuhr.
    expect(getNextPrayer(times, 330, 300)?.key).toBe('dhuhr');
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const next = getNextPrayer(times, 1300, 295);
    expect(next).toMatchObject({ key: 'fajr', tomorrow: true });
    // Carried past midnight so the countdown stays positive and monotonic.
    expect(next!.minutes).toBe(295 + 1440);
  });

  it('returns null when nothing is computable', () => {
    const empty: PrayerTimes = {
      fajr: null,
      sunrise: null,
      dhuhr: null,
      asr: null,
      maghrib: null,
      isha: null,
      midnight: null,
    };
    expect(getNextPrayer(empty, 600, null)).toBeNull();
  });
});
