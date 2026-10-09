import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { getDayTimes, PRAYER_KEYS } from '@/lib/prayer-times';

/**
 * `public/widgets/prayer.js` is a hand port of `lib/prayer-times.ts` for the
 * service worker. These hold it to the original, so the widget on the
 * desktop never disagrees with the page.
 */
type Port = {
  dayTimes: (date: Date, place?: unknown) => Record<string, number | null>;
  widgetData: (now: Date) => {
    nextTime: string;
    nextName: string;
    rows: { time: string; next: boolean }[];
  };
};

const sandbox: { self: { HamPrayer?: Port }; Intl: typeof Intl; Date: typeof Date } = {
  self: {},
  Intl,
  Date,
};
runInNewContext(readFileSync('public/widgets/prayer.js', 'utf8'), sandbox);
const port = sandbox.self.HamPrayer as Port;

describe('widget prayer port', () => {
  it('matches lib/prayer-times for every day of a year, in Vienna and further north', () => {
    const places = [
      undefined,
      { latitude: 59.33, longitude: 18.07, timeZone: 'Europe/Stockholm' },
      { latitude: 35.69, longitude: 51.39, timeZone: 'Asia/Tehran' },
    ];
    for (const place of places) {
      for (let day = 0; day < 366; day++) {
        const date = new Date(Date.UTC(2026, 0, 1 + day, 10));
        const expected = getDayTimes(
          date,
          place ? { coordinates: place, timeZone: place.timeZone } : {},
        ).times;
        const actual = port.dayTimes(date, place);
        for (const key of PRAYER_KEYS)
          expect(actual[key], `${key} ${date.toISOString()}`).toBe(expected[key]);
      }
    }
  });

  it('marks the next prayer, and rolls over to tomorrow after Isha', () => {
    // 14:00 in Vienna, October: Dhuhr has passed and Asr is next.
    const noon = port.widgetData(new Date('2026-10-09T12:00:00Z'));
    expect(noon.nextName).toContain('Asr');
    expect(noon.rows.filter((r) => r.next)).toHaveLength(1);
    // 23:30 in Vienna: tomorrow's Fajr, and nothing in today's list is marked.
    const late = port.widgetData(new Date('2026-10-09T21:30:00Z'));
    expect(late.nextName).toContain('Fadschr');
    expect(late.rows.some((r) => r.next)).toBe(false);
    expect(late.nextTime).toMatch(/^0[4-6]:\d\d$/);
  });
});
