'use client';

import { useEffect, useState } from 'react';
import { getNextPrayer, localMinutes } from './prayer-times';
import { localPrayerDay } from './prayer-local';
import type { PrayerDay } from './prayer-page';

/** The civil date in a place, as `YYYY-MM-DD`. */
const isoIn = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/**
 * The day on show, kept current, and how long until its next prayer.
 *
 * A page can be older than the clock: the preview is a snapshot taken once a
 * day, and a tab left open runs past midnight. So the day the server rendered
 * is only trusted while it is still today where it is for; after that, or
 * once today's last prayer has gone, the day is worked out again here with
 * the same calculation the server falls back to. The countdown reads the
 * device clock and ticks every thirty seconds — it shows minutes.
 */
export function useNextPrayer(initial: PrayerDay) {
  const [day, setDay] = useState(initial);
  const [remaining, setRemaining] = useState<number | null>(null);

  // A new day from outside (another city, the reader's position) replaces it.
  useEffect(() => setDay(initial), [initial]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tz = day.place.timeZone;
      const nowMinutes = localMinutes(now, tz);
      const stale = isoIn(now, tz) !== isoIn(new Date(day.gregorianIso), tz);
      const current = stale ? { ...localPrayerDay(now, day.place), place: day.place } : day;
      // Today's next prayer, or — once Isha has gone — tomorrow's Fajr, with
      // its minutes counted past today's midnight.
      const next =
        getNextPrayer(current.times, nowMinutes, null) ?? localPrayerDay(now, day.place).next;
      setRemaining(next ? Math.max(0, Math.round((next.minutes - nowMinutes) * 60)) : null);
      if (stale || next?.key !== day.next?.key || next?.tomorrow !== day.next?.tomorrow) {
        setDay({ ...current, next, nowMinutes });
      }
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [day]);

  return { day, remaining };
}
