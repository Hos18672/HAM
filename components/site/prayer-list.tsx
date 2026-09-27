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
  MapPin,
  ArrowCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';
import { formatClock, formatCountdown, digits } from '@/lib/i18n/format';
import { formatHijri } from '@/lib/hijri';
import { EXTRA_KEYS, type PrayerKey } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { PatternPlate } from './ornaments';

type GeoState =
  'vienna' | 'locating' | 'located' | 'denied' | 'unsupported' | 'failed' | 'fetchFailed';

const ICONS: Record<
  PrayerKey,
  React.ComponentType<{
    size?: number;
    weight?: 'duotone';
    color?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
  }>
> = {
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
 * The next-prayer hero, the seven daily times and the four extra ones.
 *
 * Everything is computed on the server; this component only counts down. It
 * reconciles against the server's own clock reading rather than trusting the
 * visitor's, so a device with a wrong clock still sees the right remaining
 * time relative to the times printed above it.
 *
 * The page opens on Vienna. A visitor elsewhere can ask for their own
 * position: the browser hands its coordinates to this site's `/api/prayer/day`
 * — never to the API directly — and the day that comes back replaces the one
 * shown, countdown and all, until they go back to Vienna.
 */
export function PrayerList({ day: vienna, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [day, setDay] = useState(vienna);
  const [geo, setGeo] = useState<GeoState>('vienna');

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const query = new URLSearchParams({
          lat: position.coords.latitude.toFixed(2),
          lng: position.coords.longitude.toFixed(2),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        try {
          const response = await fetch(`/api/prayer/day?${query}`);
          if (!response.ok) throw new Error(String(response.status));
          setDay((await response.json()) as PrayerDay);
          setGeo('located');
        } catch {
          setGeo('fetchFailed');
        }
      },
      (error) => setGeo(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function backToVienna() {
    setDay(vienna);
    setGeo('vienna');
  }

  const geoMessage =
    geo === 'locating'
      ? t('locating')
      : geo === 'denied'
        ? t('geoDenied')
        : geo === 'unsupported'
          ? t('geoUnsupported')
          : geo === 'failed'
            ? t('geoFailed')
            : geo === 'fetchFailed'
              ? t('fetchFailed')
              : geo === 'located'
                ? t('locationNote')
                : null;

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
  const gregorianLabel = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: day.place.timeZone,
    numberingSystem: locale === 'fa' ? 'arabext' : 'latn',
  }).format(gregorian);

  const { latitude, longitude } = day.place;
  const coordinates = day.place.vienna
    ? '48.2175° N, 16.3260° E'
    : `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}, ` +
      `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {/* Next prayer.

          The design's opening panel: two columns on one surface, the prayer
          and its countdown on one side and today's two dates on the other,
          with the girih plate behind them. */}
      {day.next ? (
        <div
          className="surf"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 17rem), 1fr))',
            gap: 'clamp(22px, 3vw, 48px)',
            alignItems: 'center',
          }}
        >
          <PatternPlate opacity={0.3} />

          <div style={{ position: 'relative' }}>
            <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
              {t('nextPrayer')}
            </p>
            <h2
              style={{
                marginBlockStart: 'var(--space-3)',
                fontSize: 'clamp(30px, 4.4vw, 46px)',
                lineHeight: 1.05,
              }}
            >
              {t(`names.${day.next.key}`)}
            </h2>
            <div
              style={{
                marginBlockStart: 'var(--space-2)',
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
              <span
                className="tabular"
                style={{
                  fontSize: 'clamp(34px, 5vw, 52px)',
                  lineHeight: 1,
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--color-accent-2-text)',
                }}
              >
                {/* `next.minutes` rather than today's entry for that key: after
                    Isha this is tomorrow's Fajr, which is a minute or two off
                    today's and is the time the countdown is actually running to. */}
                {formatClock(day.next.minutes, locale)}
              </span>
              <span
                aria-live="polite"
                aria-label={t('countdownLabel')}
                className="tabular text-sm"
                style={{ color: 'var(--color-ink-muted)' }}
              >
                {t('in')}{' '}
                {remaining === null ? (
                  // Before hydration there is nothing honest to show, so the
                  // slot is reserved rather than filled with a number that
                  // will jump.
                  <span aria-hidden="true">—</span>
                ) : (
                  formatCountdown(remaining, locale)
                )}
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'grid', gap: 'var(--space-1)' }}>
            <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
              {day.place.vienna ? t('todayHere') : t('todayYourPlace')}
            </p>
            <p style={{ lineHeight: 'var(--leading-normal)' }}>{gregorianLabel}</p>
            <p
              style={{
                lineHeight: 'var(--leading-normal)',
                color: 'var(--color-accent-2-text)',
                fontWeight: 'var(--weight-semibold)',
              }}
            >
              {formatHijri(gregorian, locale, day.place.timeZone)}
            </p>

            <div className="flex flex-wrap gap-2" style={{ marginBlockStart: 'var(--space-3)' }}>
              {geo === 'located' ? (
                <Button variant="secondary" size="sm" onClick={backToVienna}>
                  <ArrowCounterClockwise size={16} weight="duotone" aria-hidden="true" />
                  {t('backToVienna')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={useMyLocation}
                  loading={geo === 'locating'}
                  disabled={geo === 'locating'}
                >
                  <MapPin size={16} weight="duotone" aria-hidden="true" />
                  {t('useMyLocation')}
                </Button>
              )}
            </div>
            {/* Failures are stated, never silent. */}
            <p aria-live="polite" className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              {geoMessage}
            </p>
          </div>
        </div>
      ) : null}

      {/* The seven times. The track is narrow enough that all seven stand in
          one row on a desktop, as the design sets them. */}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          // The same 20px every other set of cards on the site is spaced by.
          // At 15 the seven of them read as one block rather than seven.
          gap: 'var(--space-4)',
          // 96, not the 106 it was: the wider gap costs the row 10px of
          // track, and at 390 that was the difference between three of them
          // fitting and two. The gap changes, the shape of the row does not.
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 96px), 1fr))',
        }}
      >
        {ORDER.map((key) => {
          const IconComponent = ICONS[key] ?? Clock;
          const isNext = day.next?.key === key && !day.next.tomorrow;
          const value = day.times[key];
          return (
            <li key={key} data-rise>
              <Card variant="soft" marked={isNext} className="ptime h-full">
                <IconComponent size={20} weight="duotone" aria-hidden="true" color="var(--gold)" />
                <p className="ptime-label">
                  {t(`names.${key}`)}
                  {/* The gold ring says "next" to anyone who can see it; this
                      says it to everyone else. Its own wording, not the
                      hero's: two elements reading "Nächstes Gebet" on one
                      page is ambiguous to a reader moving by text, and it
                      makes any test that looks for that phrase pick blindly
                      between them. */}
                  {isNext ? <span className="visually-hidden"> — {t('nextMark')}</span> : null}
                </p>
                <p
                  className="tabular"
                  style={{
                    fontSize: 'clamp(21px, 2.6vw, 28px)',
                    lineHeight: 1,
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--head)',
                  }}
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

      {/* The four extra times: smaller, and under the seven rather than
          among them, since none of them is a time of prayer. */}
      <div>
        <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
          {t('extrasTitle')}
        </p>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            marginBlockStart: 'var(--space-3)',
            padding: 0,
            display: 'grid',
            gap: 'var(--space-2)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
          }}
        >
          {EXTRA_KEYS.map((key) => (
            <li
              key={key}
              className="flex items-baseline justify-between gap-3"
              style={{
                background: 'var(--card)',
                border: 'var(--rule-hair) solid var(--line)',
                borderRadius: '14px',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {t(`extras.${key}`)}
              </span>
              <span
                className="tabular"
                style={{ fontWeight: 'var(--weight-bold)', color: 'var(--head)' }}
              >
                {formatClock(day.extras[key], locale)}
              </span>
            </li>
          ))}
        </ul>
        <p
          className="text-xs"
          style={{ marginBlockStart: 'var(--space-2)', color: 'var(--color-ink-muted)' }}
        >
          {t('extrasNote')}
        </p>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-faint)', maxInlineSize: '70ch' }}>
        {day.source === 'aladhan' ? t('sourceApi') : t('sourceLocal')} ·{' '}
        {day.place.vienna ? `${t('placeVienna')} · ` : null}
        <span className="ltr-island">{digits(coordinates, locale)}</span>
      </p>
    </div>
  );
}
