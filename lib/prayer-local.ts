import { getDayTimes, getNextPrayer, localMinutes, type Coordinates } from './prayer-times';
import { toHijri } from './hijri';
import type { PrayerDay } from './prayer-page';

/**
 * A day of prayer times worked out in the browser.
 *
 * The page's own day comes from the server, which asks the Aladhan API and
 * keeps this site's calculation behind it. That is right for the day a reader
 * arrives on, and wrong for a city they pick from a list: it would mean a
 * round trip for every choice, and on the static preview — which has no
 * server at all — no answer ever.
 *
 * So a chosen city is computed here instead, with the same function the
 * server falls back to (`lib/prayer-times`, Jaʿfari angles, shar'i midnight).
 * The two agree to a minute or two, which is the width of the difference
 * between one published timetable and the next, and the page says which of
 * the two it is showing.
 *
 * `import type` above is erased before this ever reaches a browser, so the
 * server-only module it names never comes with it.
 */

export interface LocalPlace extends Coordinates {
  timeZone: string;
}

/** The civil date in a place, as `YYYY-MM-DD`. */
function isoIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function localPrayerDay(now: Date, place: LocalPlace): PrayerDay {
  const todayIso = isoIn(now, place.timeZone);
  const [y, m, d] = todayIso.split('-').map(Number) as [number, number, number];

  // Tomorrow is the next civil day in that place, not "now plus 24 hours":
  // on the night the clocks go forward the latter lands on the day after
  // tomorrow when it is read late in the evening. The same reasoning, and the
  // same line, as the server's own `getPrayerDay`.
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12));

  // `getDayTimes` reads the civil date out of the instant it is given, so
  // `now` is today by definition wherever the reader is.
  const options = { coordinates: place, timeZone: place.timeZone };
  const today = getDayTimes(now, options);
  const next = getDayTimes(tomorrow, options);

  const nowMinutes = localMinutes(now, place.timeZone);

  return {
    times: today.times,
    extras: today.extras,
    next: getNextPrayer(today.times, nowMinutes, next.times.fajr),
    computedAtIso: now.toISOString(),
    nowMinutes,
    gregorianIso: now.toISOString(),
    hijri: toHijri(now, place.timeZone),
    place: { ...place, vienna: false },
    source: 'local',
  };
}
