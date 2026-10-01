'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Compass, Minus, Plus } from '@phosphor-icons/react/dist/ssr';
import { KAABA, type Coordinates } from '@/lib/qibla';
import { MAX_SPAN_KM, plan, planPath, rings } from '@/lib/local-map';
import { formatBearing, formatNumber } from '@/lib/i18n/format';
import { KaabaGlyph } from './qibla-map';
import type { Point } from '@/lib/world-outline';
import type { Locale } from '@/lib/i18n/config';

/**
 * Where to turn, from where you are standing.
 *
 * You are in the middle; the gold arrow leaves your feet in the direction of
 * prayer. That is the whole of it, and it is drawn on the one projection
 * where it is honestly true: azimuthal equidistant about your own position,
 * on which every straight line out of the centre is the initial bearing of a
 * great circle and every distance along it is to scale. Zoomed in it is a
 * plan of the ground you are on, close enough to turn on the spot by; zoomed
 * out the coastlines come in and the Kaaba appears at the end of the same
 * unbent line.
 *
 * With the compass running, the map turns with the phone: the arrow then
 * points where you must physically face, and the whole business of reading a
 * bearing off a dial goes away.
 *
 * Nothing is fetched from a tile server. A tile is a request to somebody
 * else's machine carrying the reader's address and, to within a street,
 * their position — which this site promises not to hand out and its
 * content-security policy forbids. The outline travels in the page, so the
 * map also works on the preview and on a bad connection.
 */

/** The drawing is 240 units across; the ground fills 200 of them. */
const FRAME = 120;
const R = 100;

/** How wide a view can be, in kilometres across the radius of the disc. */
const SPANS = [0.2, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, MAX_SPAN_KM];
/** Below this there is nothing of the world to draw at that size anyway. */
const OUTLINE_FROM_KM = 200;

type Outline = { land: Point[][]; borders: Point[][] };

/** A distance as a reader would say it: metres up close, kilometres beyond. */
function spoken(km: number, locale: Locale, metres: string, kilometres: string) {
  return km < 1
    ? `${formatNumber(Math.round(km * 1000), locale)} ${metres}`
    : `${formatNumber(Math.round(km), locale)} ${kilometres}`;
}

export function QiblaHere({
  origin,
  bearing,
  distanceKm,
  locale,
  originLabel,
  heading,
  headingLive,
}: {
  origin: Coordinates;
  bearing: number;
  distanceKm: number;
  locale: Locale;
  /** "Your location" or "the association house", as the compass has it. */
  originLabel: string;
  /** The device's heading, degrees clockwise from true north. */
  heading: number;
  /** Whether that heading is a live reading rather than a guess. */
  headingLive: boolean;
}) {
  const t = useTranslations('qibla');

  /* ── How far out we are looking ───────────────────────────────────────── */
  // Far enough that Mecca is on the map: the line to it is the point, and a
  // reader who sees both ends of it needs no explanation of the rest.
  const fits = useMemo(
    () =>
      Math.max(
        0,
        SPANS.findIndex((span) => span >= distanceKm * 1.12),
      ),
    [distanceKm],
  );
  const [level, setLevel] = useState(fits);
  useEffect(() => setLevel(fits), [fits]);
  const spanKm = SPANS[Math.min(level, SPANS.length - 1)]!;
  const scale = R / spanKm;

  /* ── Which way is up ──────────────────────────────────────────────────── */
  const [turnWithMe, setTurnWithMe] = useState(true);
  const rotation = headingLive && turnWithMe ? -heading : 0;

  /* ── The world, fetched with the map and only when it would show ──────── */
  const [outline, setOutline] = useState<Outline | null>(null);
  const wantsOutline = spanKm >= OUTLINE_FROM_KM;
  useEffect(() => {
    if (!wantsOutline || outline) return;
    let alive = true;
    void import('@/lib/world-outline')
      .then(({ worldOutline }) => {
        if (alive) setOutline(worldOutline() as Outline);
      })
      .catch(() => {
        // Without it the arrow, the rings and the reading are unchanged.
      });
    return () => {
      alive = false;
    };
  }, [wantsOutline, outline]);

  const land = useMemo(
    () =>
      wantsOutline && outline
        ? outline.land.map((ring) => planPath(origin, ring, scale)).join('')
        : '',
    [wantsOutline, outline, origin, scale],
  );
  const borders = useMemo(
    () =>
      wantsOutline && outline
        ? outline.borders.map((line) => planPath(origin, line, scale)).join('')
        : '',
    [wantsOutline, outline, origin, scale],
  );

  /* ── The way there ────────────────────────────────────────────────────── */
  const kaaba = plan(origin, KAABA.longitude, KAABA.latitude);
  const kaabaOnMap = kaaba.distanceKm <= spanKm * 0.97;
  // The arrow reaches the Kaaba where it is on the map, and the rim where
  // it is not — with its head on the rim rather than beyond it, because an
  // arrow with its point cut off is not an arrow.
  const reach = kaabaOnMap ? kaaba.distanceKm * scale : R - 9;
  const theta = ((bearing - 90) * Math.PI) / 180;
  const tip = { x: Math.cos(theta) * reach, y: Math.sin(theta) * reach };
  const ringsKm = useMemo(() => rings(spanKm), [spanKm]);
  // The scale is written on the far side of the arrow, whichever side that
  // is, so the two never sit on top of one another.
  const away = ((bearing + 180 - 90) * Math.PI) / 180;

  const cardinals = [
    { key: 'n', angle: 0 },
    { key: 'e', angle: 90 },
    { key: 's', angle: 180 },
    { key: 'w', angle: 270 },
  ] as const;

  return (
    <div className="qibla-map">
      <svg
        viewBox={`${-FRAME} ${-FRAME} ${FRAME * 2} ${FRAME * 2}`}
        className="qibla-map-svg"
        role="img"
        aria-label={`${t('hereLabel')}: ${formatBearing(bearing, locale)}°`}
      >
        <defs>
          <clipPath id="qibla-here-disc">
            <circle r={R} />
          </clipPath>
          <radialGradient id="qibla-here-ground" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="var(--map-sea-top, var(--map-sea))" />
            <stop offset="100%" stopColor="var(--map-sea)" />
          </radialGradient>
          <linearGradient id="qibla-here-ray" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--goldInk)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>

        <circle r={R} fill="url(#qibla-here-ground)" />

        {/* Everything that turns with the compass. The markers at the centre
            do not: you are where you are however you are facing. */}
        <g transform={`rotate(${rotation})`}>
          <g clipPath="url(#qibla-here-disc)">
            {land ? (
              <path
                d={land}
                fill="var(--map-land)"
                stroke="var(--map-coast)"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            ) : null}
            {borders ? (
              <path d={borders} fill="none" stroke="var(--map-border)" strokeWidth="0.5" />
            ) : null}

            {/* The scale: two rings at round distances, written on the ring
                itself so the map can be read without a legend. */}
            {ringsKm.map((km) => {
              const lx = Math.cos(away) * km * scale;
              const ly = Math.sin(away) * km * scale;
              return (
                <g key={km}>
                  <circle
                    r={km * scale}
                    fill="none"
                    stroke="var(--map-ring)"
                    strokeWidth="0.7"
                    strokeDasharray="3 4"
                  />
                  <text
                    className="qibla-globe-label"
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${-rotation} ${lx} ${ly})`}
                  >
                    {spoken(km, locale, t('metres'), t('kilometres'))}
                  </text>
                </g>
              );
            })}

            {/* North, so the turn can be checked against a paper compass. */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={-R}
              stroke="var(--color-ink-muted)"
              strokeWidth="0.7"
              strokeDasharray="2 3"
            />

            {/* The direction of prayer, out of your own feet. */}
            <line
              x1="0"
              y1="0"
              x2={tip.x}
              y2={tip.y}
              stroke="var(--gold)"
              strokeOpacity="0.3"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <line
              x1="0"
              y1="0"
              x2={tip.x}
              y2={tip.y}
              stroke="url(#qibla-here-ray)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <g transform={`translate(${tip.x} ${tip.y}) rotate(${bearing - 90})`}>
              <path d="M0 0 L-13 -5.5 L-9.5 0 L-13 5.5 Z" fill="var(--gold)" />
            </g>

            <g transform={`translate(${tip.x} ${tip.y})`}>
              <g transform={`rotate(${-rotation})`}>
                {kaabaOnMap ? (
                  <>
                    <circle r="11" fill="var(--card)" opacity="0.92" />
                    <g transform="scale(0.46)">
                      <KaabaGlyph />
                    </g>
                    <text className="qibla-globe-label" y={17} textAnchor="middle">
                      {t('mecca')}
                    </text>
                  </>
                ) : (
                  // Mecca is off the map at this scale: say how far it is,
                  // so the arrow still answers the whole question.
                  <text className="qibla-globe-label" y={tip.y > 0 ? 14 : -10} textAnchor="middle">
                    {`${spoken(distanceKm, locale, t('metres'), t('kilometres'))} ${t('toMecca')}`}
                  </text>
                )}
              </g>
            </g>
          </g>

          {/* The cardinal letters, on the rim where a compass has them. */}
          {cardinals.map(({ key, angle }) => {
            const a = ((angle - 90) * Math.PI) / 180;
            const x = Math.cos(a) * (R + 11);
            const y = Math.sin(a) * (R + 11);
            return (
              <text
                key={key}
                className="qibla-here-cardinal"
                data-north={key === 'n' ? 'true' : undefined}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${-rotation} ${x} ${y})`}
              >
                {t(`cardinal.${key}`)}
              </text>
            );
          })}
        </g>

        {/* You, in the middle, and staying there however you turn. A house,
            because that is what the middle of this map is: where you are. */}
        <g>
          <circle r="15" fill="var(--card)" opacity="0.94" />
          <circle r="15" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
          <HomeGlyph />
          <text className="qibla-globe-label" y={28} textAnchor="middle">
            {originLabel}
          </text>
        </g>

        {/* The rim. */}
        <circle r={R} fill="none" stroke="var(--gold)" strokeWidth="1.3" />
        <circle r={R - 3.5} fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.55" />
      </svg>

      <div className="qibla-map-controls">
        <div className="reader-size" role="group" aria-label={t('scale')}>
          <button
            type="button"
            onClick={() => setLevel((l) => Math.max(0, l - 1))}
            disabled={level <= 0}
            aria-label={t('closer')}
          >
            <Minus size={13} weight="bold" aria-hidden="true" />
          </button>
          <span className="reader-size-value tabular" aria-hidden="true">
            {spoken(spanKm, locale, t('metres'), t('kilometres'))}
          </span>
          <button
            type="button"
            onClick={() => setLevel((l) => Math.min(SPANS.length - 1, l + 1))}
            disabled={level >= SPANS.length - 1}
            aria-label={t('wider')}
          >
            <Plus size={13} weight="bold" aria-hidden="true" />
          </button>
        </div>
        {headingLive ? (
          <button
            type="button"
            className="mushaf-switch reader-full-btn"
            aria-pressed={turnWithMe}
            onClick={() => setTurnWithMe((on) => !on)}
          >
            <Compass size={17} weight="duotone" aria-hidden="true" />
            {turnWithMe ? t('northUp') : t('headingUp')}
          </button>
        ) : null}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {t('hereHint')}
      </p>
    </div>
  );
}

/** The house at the middle of the map, about 16 units across. */
function HomeGlyph() {
  return (
    <g
      fill="none"
      stroke="var(--green)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M-7.5 -0.5 L0 -7 L7.5 -0.5" />
      <path d="M-5.5 -2 L-5.5 6.5 L5.5 6.5 L5.5 -2" />
      <path d="M-1.9 6.5 L-1.9 1.6 L1.9 1.6 L1.9 6.5" fill="var(--gold)" stroke="var(--gold)" />
    </g>
  );
}
