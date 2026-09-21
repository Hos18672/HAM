'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Compass as CompassIcon,
  MapPin,
  ArrowCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';
import { qiblaFrom, HOUSE, type QiblaResult } from '@/lib/qibla';
import { formatBearing, formatDistanceKm } from '@/lib/i18n/format';
import { Button } from '../ui/button';
import { Card, FactPair } from '../ui/card';
import type { Locale } from '@/lib/i18n/config';

/** A device orientation event that also carries the iOS compass heading. */
interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type CompassState = 'idle' | 'active' | 'unsupported' | 'denied';
type GeoState = 'house' | 'locating' | 'located' | 'denied' | 'unsupported' | 'failed';

/**
 * The gold compass rose and the qibla needle.
 *
 * Three layers, in this order of trust:
 *   1. the computed bearing, which is always correct and needs no permission,
 *   2. the visitor's own position, if they offer it,
 *   3. the device's live heading, if it has a magnetometer and consents.
 *
 * Each is an enhancement on the one before, and each failure is stated
 * explicitly rather than leaving a needle pointing somewhere arbitrary.
 */
export function Compass({ locale }: { locale: Locale }) {
  const t = useTranslations('qibla');

  const [qibla, setQibla] = useState<QiblaResult>(() => qiblaFrom(HOUSE));
  const [geo, setGeo] = useState<GeoState>('house');
  const [compass, setCompass] = useState<CompassState>('idle');
  const [heading, setHeading] = useState(0);

  /* ── Live heading ─────────────────────────────────────────────────────── */
  const onOrientation = useCallback((event: CompassEvent) => {
    // iOS reports a true compass heading directly; elsewhere `alpha` is the
    // rotation about the z-axis, which runs the other way.
    if (typeof event.webkitCompassHeading === 'number') {
      setHeading(event.webkitCompassHeading);
    } else if (typeof event.alpha === 'number') {
      setHeading(360 - event.alpha);
    }
  }, []);

  useEffect(() => {
    if (compass !== 'active') return;
    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
    window.addEventListener('deviceorientation', onOrientation as EventListener, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', onOrientation as EventListener, true);
    };
  }, [compass, onOrientation]);

  async function activateCompass() {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setCompass('unsupported');
      return;
    }

    // iOS 13+ gates the sensor behind an explicit request that must be made
    // from a user gesture — which is why this lives in a click handler.
    const maybeRequest = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
    ).requestPermission;

    if (typeof maybeRequest === 'function') {
      try {
        const result = await maybeRequest();
        setCompass(result === 'granted' ? 'active' : 'denied');
      } catch {
        setCompass('denied');
      }
      return;
    }

    setCompass('active');
  }

  /* ── Position ─────────────────────────────────────────────────────────── */
  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setQibla(
          qiblaFrom({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        );
        setGeo('located');
      },
      (error) => setGeo(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function backToHouse() {
    setQibla(qiblaFrom(HOUSE));
    setGeo('house');
  }

  // The rose counter-rotates to the live heading, so north on the dial keeps
  // pointing at real north and the needle keeps pointing at the Kaaba.
  const roseRotation = compass === 'active' ? -heading : 0;

  const geoMessage =
    geo === 'locating'
      ? t('locating')
      : geo === 'denied'
        ? t('error.geoDenied')
        : geo === 'unsupported'
          ? t('error.geoUnsupported')
          : geo === 'failed'
            ? t('error.geoFailed')
            : null;

  const compassMessage =
    compass === 'unsupported'
      ? t('error.unsupported')
      : compass === 'denied'
        ? t('error.denied')
        : null;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div
        style={{
          display: 'grid',
          gap: 'var(--space-6)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(18rem, 100%), 1fr))',
          alignItems: 'center',
        }}
      >
        <CompassRose
          bearing={qibla.bearing}
          roseRotation={roseRotation}
          locale={locale}
          label={t('rose')}
          needleLabel={t('needle')}
          cardinals={{
            n: t('cardinal.n'),
            e: t('cardinal.e'),
            s: t('cardinal.s'),
            w: t('cardinal.w'),
          }}
        />

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <Card variant="soft">
            <div
              style={{
                display: 'grid',
                gap: 'var(--space-4)',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              }}
            >
              <FactPair
                label={t('bearing')}
                value={
                  <span
                    className="tabular"
                    style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}
                  >
                    {formatBearing(qibla.bearing, locale)}°
                  </span>
                }
              />
              <FactPair
                label={t('distance')}
                value={
                  <span
                    className="tabular"
                    style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}
                  >
                    {formatDistanceKm(qibla.distanceKm, locale)}{' '}
                    <span
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-regular)' }}
                    >
                      <span className="ltr-island">{t('kilometres')}</span>
                    </span>
                  </span>
                }
              />
            </div>
            <p
              className="text-sm"
              style={{ color: 'var(--color-ink-muted)', marginBlockStart: 'var(--space-2)' }}
            >
              {t(`cardinalLong.${qibla.cardinal}`)} ·{' '}
              {geo === 'located' ? t('fromYourLocation') : t('fromHouse')}
            </p>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={useMyLocation}
              loading={geo === 'locating'}
              disabled={geo === 'locating'}
            >
              <MapPin size={18} weight="duotone" aria-hidden="true" />
              {t('useMyLocation')}
            </Button>
            <Button variant="secondary" onClick={activateCompass} disabled={compass === 'active'}>
              <CompassIcon size={18} weight="duotone" aria-hidden="true" />
              {compass === 'active' ? t('compassActive') : t('activateCompass')}
            </Button>
            {geo === 'located' ? (
              <Button variant="ghost" onClick={backToHouse}>
                <ArrowCounterClockwise size={18} weight="duotone" aria-hidden="true" />
                {t('backToHouse')}
              </Button>
            ) : null}
          </div>

          {/* Failures are stated, never silent. */}
          <div aria-live="polite" style={{ display: 'grid', gap: 'var(--space-1)' }}>
            {geoMessage ? (
              <p className="text-sm" style={{ color: 'var(--color-accent-2-text)' }}>
                {geoMessage}
              </p>
            ) : null}
            {compassMessage ? (
              <p className="text-sm" style={{ color: 'var(--color-accent-2-text)' }}>
                {compassMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Three-step how-to. */}
      <div>
        <p className="kicker" style={{ marginBlockEnd: 'var(--space-2)' }}>
          {t('howTo')}
        </p>
        <ol
          style={{
            margin: 0,
            paddingInlineStart: '1.25em',
            display: 'grid',
            gap: 'var(--space-1)',
            maxInlineSize: 'var(--measure)',
          }}
        >
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * The rose itself: 72 ticks (one every five degrees), four cardinal labels and
 * the needle. Drawn in SVG from the tokens so it scales and themes with
 * everything else.
 */
function CompassRose({
  bearing,
  roseRotation,
  locale,
  label,
  needleLabel,
  cardinals,
}: {
  bearing: number;
  roseRotation: number;
  locale: Locale;
  label: string;
  needleLabel: string;
  cardinals: { n: string; e: string; s: string; w: string };
}) {
  const ticks = Array.from({ length: 72 }, (_, index) => index * 5);

  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <svg
        viewBox="0 0 400 400"
        role="img"
        aria-label={`${label}: ${formatBearing(bearing, locale)}°`}
        style={{
          inlineSize: 'min(22rem, 100%)',
          blockSize: 'auto',
          transform: `rotate(${roseRotation}deg)`,
          transition: 'transform 220ms linear',
        }}
      >
        {/* Gold: the second spot colour, used here as the dial's own metal. */}
        <defs>
          <linearGradient id="ham-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c96a" />
            <stop offset="45%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#8a6d14" />
          </linearGradient>
        </defs>

        <circle cx="200" cy="200" r="186" fill="none" stroke="url(#ham-gold)" strokeWidth="3" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="var(--color-rule)" strokeWidth="1" />

        {ticks.map((angle) => {
          const major = angle % 45 === 0;
          const medium = !major && angle % 15 === 0;
          const length = major ? 22 : medium ? 14 : 8;
          const radians = ((angle - 90) * Math.PI) / 180;
          const x1 = 200 + Math.cos(radians) * 186;
          const y1 = 200 + Math.sin(radians) * 186;
          const x2 = 200 + Math.cos(radians) * (186 - length);
          const y2 = 200 + Math.sin(radians) * (186 - length);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={major ? 'url(#ham-gold)' : 'var(--color-neutral-400)'}
              strokeWidth={major ? 3 : medium ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Cardinal labels, counter-rotated so they stay upright as the rose turns. */}
        {(
          [
            [cardinals.n, 0],
            [cardinals.e, 90],
            [cardinals.s, 180],
            [cardinals.w, 270],
          ] as const
        ).map(([text, angle]) => {
          const radians = ((angle - 90) * Math.PI) / 180;
          const x = 200 + Math.cos(radians) * 140;
          const y = 200 + Math.sin(radians) * 140;
          return (
            <text
              key={angle}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${-roseRotation} ${x} ${y})`}
              style={{
                fill: angle === 0 ? 'var(--color-accent-2)' : 'var(--color-ink-muted)',
                fontFamily: 'var(--font-display)',
                fontSize: '26px',
                fontWeight: 700,
              }}
            >
              {text}
            </text>
          );
        })}

        {/* The needle, pointing at the Kaaba. */}
        <g transform={`rotate(${bearing} 200 200)`}>
          <title>{needleLabel}</title>
          <path d="M200 44 L216 200 L200 186 L184 200 Z" fill="url(#ham-gold)" />
          <path d="M200 356 L184 200 L200 214 L216 200 Z" fill="var(--color-neutral-400)" />
          {/* The Kaaba mark at the needle's head. */}
          <rect
            x="188"
            y="30"
            width="24"
            height="24"
            rx="2"
            fill="var(--color-ink)"
            stroke="url(#ham-gold)"
            strokeWidth="2"
          />
          <line x1="188" y1="40" x2="212" y2="40" stroke="url(#ham-gold)" strokeWidth="2" />
        </g>

        <circle cx="200" cy="200" r="9" fill="url(#ham-gold)" />
        <circle cx="200" cy="200" r="3" fill="var(--color-bg)" />
      </svg>
    </div>
  );
}
