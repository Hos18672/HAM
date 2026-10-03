import type { Course, SportEntry, WeekRow } from './db/queries/content';
import { viennaNow } from './site-facts';
import { timeRange } from './i18n/format';
import type { Locale } from './i18n/config';

/**
 * The weekly schedule, built from the things that actually meet.
 *
 * Courses and sports carry their own days and times; the few recurring
 * activities that are neither (a duʿa evening, the Friday prayer) live in the
 * week table. Nothing here is written twice, so the schedule cannot say one
 * thing while a course card says another.
 */

export interface ScheduleItem {
  key: string;
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  day: number;
  startTime: string;
  endTime: string;
  /** A time in words when there is no clock time ("nachmittags"). */
  timeNote: string;
  title: string;
  group: string;
  rhythm: string;
  kind: 'course' | 'sport' | 'activity';
  /** Page path without locale ("/courses#deutsch-a1"). */
  href: string;
}

/** Monday first — the one week start the whole site uses. */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function buildSchedule(
  courses: Course[],
  sports: SportEntry[],
  activities: WeekRow[],
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const course of courses) {
    for (const day of course.days) {
      items.push({
        key: `course-${course.id}-${day}`,
        day,
        startTime: course.startTime,
        endTime: course.endTime,
        timeNote: '',
        title: course.title,
        group: course.group,
        rhythm: course.rhythm,
        kind: 'course',
        href: `/courses#course-${course.slug}`,
      });
    }
  }
  for (const sport of sports) {
    for (const day of sport.days) {
      items.push({
        key: `sport-${sport.id}-${day}`,
        day,
        startTime: sport.startTime,
        endTime: sport.endTime,
        timeNote: '',
        title: sport.activity,
        group: sport.group,
        rhythm: sport.rhythm,
        kind: 'sport',
        href: `/sport#sport-${sport.id}`,
      });
    }
  }
  for (const row of activities) {
    items.push({
      key: `activity-${row.id}`,
      // The table counts from Sunday = 0, like Date#getDay().
      day: row.weekday === 0 ? 7 : row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      timeNote: row.detail,
      title: row.label,
      group: row.group,
      rhythm: 'weekly',
      kind: 'activity',
      href: '',
    });
  }
  // Untimed items ("afternoon") sort after the timed ones of the same day.
  return items.sort(
    (a, b) =>
      a.day - b.day ||
      (a.startTime || '99').localeCompare(b.startTime || '99') ||
      a.title.localeCompare(b.title),
  );
}

/** Today's ISO weekday in Vienna. */
export function viennaWeekday(now: Date = new Date()): number {
  return viennaNow(now).day;
}

/** A weekday's name for ISO 1 … 7, from a known Monday (1 Jan 2024). */
export function weekdayName(day: number, locale: Locale, width: 'long' | 'short' = 'long') {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
    weekday: width,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2024, 0, day)));
}

/**
 * When something meets, in words: "Montag & Mittwoch · 17:00–18:30",
 * "هر دو هفته، جمعه · ۱۷:۰۰". Empty when no days are set, so the caller can
 * fall back to the free-text note.
 */
export function formatTiming(
  timing: { days: number[]; startTime: string; endTime: string; rhythm: string },
  locale: Locale,
): string {
  if (timing.days.length === 0) return '';
  const days = timing.days.map((d) => weekdayName(d, locale)).join(locale === 'fa' ? ' و ' : ' & ');
  const rhythm =
    timing.rhythm === 'biweekly'
      ? locale === 'fa'
        ? 'هر دو هفته، '
        : 'vierzehntägig, '
      : timing.rhythm === 'monthly'
        ? locale === 'fa'
          ? 'اولین '
          : 'jeden ersten '
        : '';
  // Persian joins "the first Wednesday of the month" with the ezafe mark.
  const monthly = timing.rhythm === 'monthly' ? (locale === 'fa' ? 'ٔ هر ماه' : ' im Monat') : '';
  const time = timing.startTime ? timeRange(timing.startTime, timing.endTime, locale) : '';
  return `${rhythm}${days}${monthly}${time ? ` · ${time}` : ''}`;
}
