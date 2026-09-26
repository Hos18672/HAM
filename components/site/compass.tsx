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
import { PatternPlate } from './ornaments';
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
    // An *absolute* alpha is, by definition, a true compass heading, so it is
    // read first wherever a browser offers one — `alpha` being the rotation
    // about the z-axis, which runs the other way. Chrome on Android fires both
    // `deviceorientationabsolute` (absolute) and `deviceorientation`
    // (relative, zeroed wherever the device happened to be pointing); taking
    // whichever arrived last would swing the needle between a true bearing and
    // an arbitrary one.
    if (event.absolute && typeof event.alpha === 'number') {
      setHeading(360 - event.alpha);
      return;
    }
    // Safari on iOS publishes no absolute reading at all and puts the true
    // heading in a property of its own. Reading it only as the fallback
    // matters: a browser that defines it *and* sends absolute readings would
    // otherwise have the fallback shadow the better source.
    if (typeof event.webkitCompassHeading === 'number') {
      setHeading(event.webkitCompassHeading);
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
        gap: 'clamp(34px, 4.5vw, 76px)',
        alignItems: 'center',
      }}
    >
      {/* The dial, on the design's own surface: a card with the girih plate
          behind it, holding the rose, its controls and the one line of advice
          that only applies while you are standing there holding the phone. */}
      <div
        className="surf"
        style={{
          display: 'grid',
          justifyItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <PatternPlate opacity={0.35} />

        <CompassRose
          bearing={qibla.bearing}
          roseRotation={roseRotation}
          locale={locale}
          label={t('rose')}
          needleLabel={t('needle')}
          cardinal={t(`cardinalLong.${qibla.cardinal}`)}
          cardinals={{
            n: t('cardinal.n'),
            e: t('cardinal.e'),
            s: t('cardinal.s'),
            w: t('cardinal.w'),
          }}
        />

        <div
          className="flex flex-wrap justify-center gap-2"
          style={{ position: 'relative', width: '100%' }}
        >
          <Button variant="secondary" onClick={activateCompass} disabled={compass === 'active'}>
            <CompassIcon size={18} weight="duotone" aria-hidden="true" />
            {compass === 'active' ? t('compassActive') : t('activateCompass')}
          </Button>
          <Button
            onClick={useMyLocation}
            loading={geo === 'locating'}
            disabled={geo === 'locating'}
          >
            <MapPin size={18} weight="duotone" aria-hidden="true" />
            {t('useMyLocation')}
          </Button>
          {geo === 'located' ? (
            <Button variant="ghost" onClick={backToHouse}>
              <ArrowCounterClockwise size={18} weight="duotone" aria-hidden="true" />
              {t('backToHouse')}
            </Button>
          ) : null}
        </div>

        <p
          className="text-xs"
          style={{
            position: 'relative',
            color: 'var(--color-ink-muted)',
            textAlign: 'center',
            maxInlineSize: '34em',
          }}
        >
          {t('compassHint')}
        </p>

        {/* Failures are stated, never silent. */}
        <div
          aria-live="polite"
          style={{ position: 'relative', display: 'grid', gap: 'var(--space-1)' }}
        >
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

      {/* The reading itself: two figures under their rules, then how to stand. */}
      <div>
        <div className="flex items-center gap-3" data-rise>
          <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
            <circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
            <circle cx="13" cy="13" r="3" fill="var(--gold)" />
          </svg>
          <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
            {t('kaaba')}
          </p>
        </div>

        <div
          data-rise
          style={{
            marginBlockStart: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div className="fact-rule" data-lead="true">
            <p className="kicker">{t('bearing')}</p>
            <p className="tabular fact-figure" style={{ marginBlockStart: 'var(--space-1)' }}>
              {formatBearing(qibla.bearing, locale)}°
            </p>
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              {t(`cardinalLong.${qibla.cardinal}`)}
            </p>
          </div>
          <div className="fact-rule">
            <p className="kicker">{t('distance')}</p>
            <p className="tabular fact-figure" style={{ marginBlockStart: 'var(--space-1)' }}>
              {formatDistanceKm(qibla.distanceKm, locale)}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              <span className="ltr-island">{t('kilometres')}</span>
            </p>
          </div>
        </div>

        <p
          data-rise
          className="text-sm"
          style={{ marginBlockStart: 'var(--space-4)', color: 'var(--color-ink-muted)' }}
        >
          {geo === 'located' ? t('fromYourLocation') : t('fromHouse')}
        </p>

        {/* Three-step how-to. */}
        <div data-rise style={{ marginBlockStart: 'var(--space-6)' }}>
          <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
            {t('howTo')}
          </p>
          <ol
            className="steps"
            style={{
              margin: 0,
              marginBlockStart: 'var(--space-3)',
              paddingInlineStart: '26px',
              display: 'grid',
              gap: 'var(--space-2)',
              maxInlineSize: 'var(--measure)',
            }}
          >
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
          </ol>
        </div>

        <p
          data-rise
          className="text-xs"
          style={{ marginBlockStart: 'var(--space-4)', color: 'var(--color-ink-muted)' }}
        >
          {t('note')}
        </p>
      </div>
    </div>
  );
}

/**
 * The rose itself: 72 ticks (one every five degrees), four cardinal labels and
 * the needle, with the reading printed on the disc at its centre. Drawn in SVG
 * from the tokens so it scales and themes with everything else.
 */
function CompassRose({
  bearing,
  roseRotation,
  locale,
  label,
  needleLabel,
  cardinal,
  cardinals,
}: {
  bearing: number;
  roseRotation: number;
  locale: Locale;
  label: string;
  needleLabel: string;
  cardinal: string;
  cardinals: { n: string; e: string; s: string; w: string };
}) {
  const ticks = Array.from({ length: 72 }, (_, index) => index * 5);

  return (
    <div
      style={{
        position: 'relative',
        inlineSize: 'min(100%, 22.5rem)',
        aspectRatio: 1,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        role="img"
        aria-label={`${label}: ${formatBearing(bearing, locale)}°`}
        style={{
          position: 'absolute',
          inset: 0,
          inlineSize: '100%',
          blockSize: '100%',
          transform: `rotate(${roseRotation}deg)`,
          transition: 'transform var(--duration-base) linear',
        }}
      >
        {/* Gold: the second spot colour, used here as the dial's own metal. */}
        <defs>
          <linearGradient id="ham-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-300)" />
            <stop offset="45%" stopColor="var(--color-gold-500)" />
            <stop offset="100%" stopColor="var(--color-gold-700)" />
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

        {/* The design's centre disc, laid over the needle's shafts so the
            reading below has a ground of its own to sit on. */}
        <circle
          cx="200"
          cy="200"
          r="66"
          fill="var(--card2)"
          stroke="var(--color-rule)"
          strokeWidth="1"
        />
        <circle cx="200" cy="200" r="5" fill="url(#ham-gold)" />
      </svg>

      {/* The reading, printed on the disc. It does not turn with the rose, and
          it repeats what the two figures beside the dial already say, so it is
          hidden from a screen reader rather than read out three times. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetInlineStart: '50%',
          insetBlockStart: '50%',
          transform: 'translate(-50%, -50%)',
          inlineSize: '30%',
          display: 'grid',
          justifyItems: 'center',
          gap: '4px',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <span
          className="tabular"
          style={{
            fontSize: 'clamp(24px, 7vw, 32px)',
            lineHeight: 1,
            fontWeight: 'var(--weight-bold)',
            color: 'var(--head)',
          }}
        >
          {formatBearing(bearing, locale)}°
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
          {cardinal}
        </span>
      </div>
    </div>
  );
}
