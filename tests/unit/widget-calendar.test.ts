import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

/**
 * `public/widgets/calendar.js` turns the calendar feed into the Windows
 * widget's card. These pin what it picks and in which order.
 */
type Row = { date: string; de: string; fa: string; time: string; event: boolean };
type Port = {
  widgetData: (
    feed: unknown,
    now: Date,
  ) => { today: string; others: string; empty: boolean; rows: Row[] };
};

const sandbox: {
  self: { HamCalendar?: Port };
  Intl: typeof Intl;
  Date: typeof Date;
  Math: typeof Math;
} = {
  self: {},
  Intl,
  Date,
  Math,
};
runInNewContext(readFileSync('public/widgets/calendar.js', 'utf8'), sandbox);
const port = sandbox.self.HamCalendar as Port;

const feed = {
  from: '2026-10-09',
  days: [
    [27, 4, 1448, 17, 7, 1405],
    [28, 4, 1448, 18, 7, 1405],
  ],
  hijriMonths: { de: ['M1', 'M2', 'M3', 'Rabi ath-thani'], fa: [] },
  persianMonths: { de: [], fa: ['', '', '', '', '', '', 'مهر'] },
  events: [
    // Over already: left out.
    {
      slug: 'gone',
      start: '2026-10-08T16:00:00Z',
      end: '2026-10-08T18:00:00Z',
      de: { title: 'Gone' },
      fa: { title: 'رفت' },
    },
    {
      slug: 'later',
      start: '2026-10-20T16:00:00Z',
      end: null,
      de: { title: 'Later' },
      fa: { title: 'بعد' },
    },
    {
      slug: 'same',
      start: '2026-10-16T16:00:00Z',
      end: null,
      de: { title: 'Same day' },
      fa: { title: 'همان روز' },
    },
  ],
  occasions: [
    { date: '2026-10-01', off: false, de: 'Past', fa: 'گذشته' },
    { date: '2026-10-16', off: false, de: 'Occasion', fa: 'مناسبت' },
    { date: '2026-10-26', off: true, de: 'Nationalfeiertag', fa: 'روز ملی' },
  ],
};

describe('widget calendar', () => {
  const now = new Date('2026-10-09T10:00:00Z');
  const data = port.widgetData(feed, now);

  it('dates today in the three calendars', () => {
    expect(data.today).toContain('9. Oktober 2026');
    expect(data.others).toContain('27. Rabi ath-thani 1448');
    expect(data.others).toContain('۱۷ مهر ۱۴۰۵');
  });

  it('lists what is still ahead, soonest first, events before occasions on a day', () => {
    expect(data.rows.map((r) => r.de)).toEqual([
      'Same day',
      'Occasion',
      'Later',
      'Nationalfeiertag',
    ]);
    expect(data.rows[0]!.time).toBe('18:00');
    expect(data.rows[3]!.time).toBe('Feiertag');
  });

  it('copes with no feed at all', () => {
    const none = port.widgetData(null, now);
    expect(none.empty).toBe(true);
    expect(none.others).toBe('');
  });
});
