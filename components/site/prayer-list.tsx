'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  SunHorizon,
  Sun,
  SunDim,
  CloudSun,
  MoonStars,
  Moon,
  Clock,
} from '@phosphor-icons/react/dist/ssr';
import { formatClock, formatCountdown, digits } from '@/lib/i18n/format';
import { formatHijri } from '@/lib/hijri';
import type { PrayerKey } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { Card } from '../ui/card';

const ICONS: Record<PrayerKey, React.ComponentType<{ size?: number; weight?: 'duotone' }>> = {
  fajr: SunHorizon,
  sunrise: Sun,
  dhuhr: SunDim,
  asr: CloudSun,
  maghrib: SunHorizon,
  isha: MoonStars,
  midnight: Moon,
};

const ORDER: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];

/**
 * The next-prayer hero and the seven daily times.
 *
 * Everything is computed on the server; this component only counts down. It
 * reconciles against the server's own clock reading rather than trusting the
 * visitor's, so a device with a wrong clock still sees the right remaining
 * time relative to the times printed above it.
 */
export function PrayerList({ day, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!day.next) return;

    // The server says how much of the interval was left at the moment it
    // rendered. From there only *differences* in the local clock are used, so
    // a device whose clock is wrong still sees the right remaining time
    // relative to the times printed above it — comparing the server's absolute
    // instant against `Date.now()` would inherit the device's error in full.
    const totalMs = (day.next.minutes - day.nowMinutes) * 60_000;
    const startedAt = Date.now();

    const tick = () =>
      setRemaining(Math.max(0, Math.round((totalMs - (Date.now() - startedAt)) / 1000)));
    tick();
    // Every thirty seconds: the page shows minutes, so a faster tick would be
    // work nobody can see.
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [day]);

  const gregorian = new Date(day.gregorianIso);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {/* Next prayer */}
      {day.next ? (
        <Card variant="softer" marked>
          <p className="kicker">{t('nextPrayer')}</p>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 style={{ fontSize: 'var(--text-4xl)' }}>{t(`names.${day.next.key}`)}</h2>
            <p
              className="tabular"
              style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)' }}
            >
              {/* `next.minutes` rather than today's entry for that key: after
                  Isha this is tomorrow's Fajr, which is a minute or two off
                  today's and is the time the countdown is actually running to. */}
              {formatClock(day.next.minutes, locale)}
            </p>
          </div>

          <p
            aria-live="polite"
            aria-label={t('countdownLabel')}
            className="tabular"
            style={{ fontSize: 'var(--text-xl)', color: 'var(--color-accent-text)' }}
          >
            {t('in')}{' '}
            {remaining === null ? (
              // Before hydration there is nothing honest to show, so the slot
              // is reserved rather than filled with a number that will jump.
              <span aria-hidden="true">—</span>
            ) : (
              formatCountdown(remaining, locale)
            )}
          </p>

          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            <span>
              {new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Europe/Vienna',
                numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
              }).format(gregorian)}
            </span>
            {' · '}
            <span>{formatHijri(gregorian, locale)}</span>
          </p>
        </Card>
      ) : null}

      {/* The seven times */}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 'var(--space-3)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(11rem, 100%), 1fr))',
        }}
      >
        {ORDER.map((key) => {
          const IconComponent = ICONS[key] ?? Clock;
          const isNext = day.next?.key === key && !day.next.tomorrow;
          const value = day.times[key];
          return (
            <li key={key} data-rise>
              <Card variant="soft" marked={isNext} className="h-full">
                <IconComponent size={26} weight="duotone" />
                <p className="kicker">{t(`names.${key}`)}</p>
                <p
                  className="tabular"
                  style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}
                >
                  {/* A time that does not occur at this latitude prints an
                      em dash rather than crashing or inventing a value. */}
                  {value === null ? '—' : formatClock(value, locale)}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
        {t('method')} · {digits('48.2175° N, 16.3260° E', locale)}
      </p>
    </div>
  );
}
