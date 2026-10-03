import { describe, it, expect } from 'vitest';
import { isPlaceholder, known, isOpenAt } from '@/lib/site-facts';
import { buildSchedule, formatTiming } from '@/lib/schedule';
import { formatDay, formatDuration, timeRange } from '@/lib/i18n/format';
import { buildCalendarMonth } from '@/lib/calendar';
import { TOPICS, isTopic, contactHref } from '@/lib/topics';
import type { Course, SportEntry, WeekRow } from '@/lib/db/queries/content';

describe('placeholders', () => {
  it('treats zero-filled values as missing', () => {
    expect(isPlaceholder('+43 1 000 00 00')).toBe(true);
    expect(isPlaceholder('AT00 0000 0000 0000 0000')).toBe(true);
    expect(isPlaceholder('000000000')).toBe(true);
    expect(isPlaceholder('')).toBe(true);
    expect(known('+43 1 414930')).toBe('+43 1 414930');
    expect(known('AT61 1904 3002 3457 3201')).toBe('AT61 1904 3002 3457 3201');
  });
});

describe('opening hours', () => {
  // 2026-10-06 is a Tuesday; 15:30 UTC is 17:30 in Vienna (CEST).
  it('is open on a weekday evening and closed at night', () => {
    expect(isOpenAt(new Date('2026-10-06T15:30:00Z'))).toBe(true);
    expect(isOpenAt(new Date('2026-10-06T21:30:00Z'))).toBe(false);
  });
  it('says "by programme" on Sunday', () => {
    expect(isOpenAt(new Date('2026-10-04T10:00:00Z'))).toBeNull();
  });
});

describe('dates and times', () => {
  const d = new Date('2026-10-17T16:00:00Z');
  it('lays Persian dates out weekday · day · month · year, no German period', () => {
    expect(formatDay('fa', d, 'full')).toBe('شنبه ۲۵ مهر ۱۴۰۵');
    expect(formatDay('fa', d, 'weekdayTime')).toBe('شنبه ۲۵ مهر، ۱۸:۰۰');
    expect(formatDay('de', d, 'full')).toBe('Samstag, 17. Oktober 2026');
  });
  it('joins time ranges the way each language reads them', () => {
    expect(timeRange('16:00', '20:00', 'fa')).toBe('۱۶:۰۰ تا ۲۰:۰۰');
    expect(timeRange('16:00', '20:00', 'de')).toBe('16:00–20:00');
  });
  it('counts down in words', () => {
    expect(formatDuration(2 * 3600 + 14 * 60, 'fa')).toBe('۲ ساعت و ۱۴ دقیقه');
    expect(formatDuration(14 * 60, 'de')).toBe('14 Min.');
  });
});

describe('weekly schedule', () => {
  const course = {
    id: 'c1',
    slug: 'deutsch-a1',
    title: 'Deutsch A1',
    days: [1, 3],
    startTime: '17:00',
    endTime: '18:30',
    rhythm: 'weekly',
    group: 'adults',
  } as Course;
  const sport = {
    id: 's1',
    activity: 'Volleyball',
    days: [1],
    startTime: '19:00',
    endTime: '21:00',
    rhythm: 'weekly',
    group: 'women',
  } as SportEntry;
  const prayer = {
    id: 'w1',
    weekday: 0,
    startTime: '',
    endTime: '',
    group: 'all',
    label: 'Gebet',
    detail: 'mittags',
  } as WeekRow;

  it('places every meeting on its day, Monday first, Sunday last', () => {
    const items = buildSchedule([course], [sport], [prayer]);
    expect(items.map((i) => [i.day, i.title])).toEqual([
      [1, 'Deutsch A1'],
      [1, 'Volleyball'],
      [3, 'Deutsch A1'],
      [7, 'Gebet'],
    ]);
  });
  it('describes a timing in words', () => {
    expect(formatTiming(course, 'de')).toBe('Montag & Mittwoch · 17:00–18:30');
    expect(formatTiming({ ...course, days: [5], rhythm: 'biweekly', endTime: '' }, 'fa')).toBe(
      'هر دو هفته، جمعه · ۱۷:۰۰',
    );
  });
});

describe('calendar', () => {
  it('starts the week on Monday', () => {
    // 1 October 2026 is a Thursday: three blank cells before it.
    const month = buildCalendarMonth(2026, 10, [], '2026-10-01');
    expect(month.cells.findIndex((c) => c.iso === '2026-10-01')).toBe(3);
  });
});

describe('topics', () => {
  it('covers every topic the site links to', () => {
    for (const t of ['event', 'volunteer', 'course', 'help', 'membership', 'donation', 'general'])
      expect(isTopic(t)).toBe(true);
    expect(TOPICS).toContain('sport');
    expect(contactHref('de', 'course', 'deutsch-a1')).toBe(
      '/de/contact?topic=course&id=deutsch-a1',
    );
  });
});
