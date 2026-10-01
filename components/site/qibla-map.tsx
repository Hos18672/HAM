'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowsClockwise, Minus, Plus } from '@phosphor-icons/react/dist/ssr';
import { KAABA, type Coordinates } from '@/lib/qibla';
import { along, greatCircle, meridian, openPath, parallel, placeOf, ringPath } from '@/lib/globe';
import { digits, formatBearing, formatDistanceKm } from '@/lib/i18n/format';
import type { Point } from '@/lib/world-outline';
import type { Locale } from '@/lib/i18n/config';

/**
 * The qibla on a map of the world.
 *
 * A globe, not a flat map, because the direction of prayer is the bearing of
 * a great circle and a great circle is straight on no flat map there is: on
 * the Mercator every prayer app prints, the line from Vienna to Mecca bends
 * visibly south of where you must actually face, which is the very
 * misunderstanding this page exists to settle. Here the shortest way over
 * the earth looks like what it is.
 *
 * The map is drawn from an outline carried in the page (`lib/world-outline`)
 * rather than fetched as tiles. A tile is a request to somebody else's
 * server carrying the reader's address and, to within a street, their
 * position — which this site promises not to hand out, and which its
 * content-security policy forbids besides. It also means the map is there on
 * the static preview and on a bad connection.
 */

/** The drawing is 208 units across; the globe fills 200 of them. */
const FRAME = 104;
const R = 100;
const MAX_ZOOM = 6;

type Outline = { land: Point[][]; borders: Point[][] };

export function QiblaMap({
  origin,
  bearing,
  distanceKm,
  locale,
  originLabel,
}: {
  origin: Coordinates;
  bearing: number;
  distanceKm: number;
  locale: Locale;
  /** "The association house" or "your location", as the compass has it. */
  originLabel: string;
}) {
  const t = useTranslations('qibla');
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── The outline, fetched with the map and not before ─────────────────── */
  const [outline, setOutline] = useState<Outline | null>(null);
  useEffect(() => {
    let alive = true;
    void import('@/lib/world-outline')
      .then(({ worldOutline }) => {
        if (alive) setOutline(worldOutline() as Outline);
      })
      .catch(() => {
        // No outline: the arc, the markers and the graticule still draw, and
        // the direction is the same. Nothing says the map failed because
        // nothing about the reading depends on it.
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ── Where the globe is turned to ─────────────────────────────────────── */
  // Halfway along the arc, so both ends of it are in view at once.
  const home = useMemo(() => {
    const [longitude, latitude] = along(origin, KAABA, 0.5);
    return { longitude, latitude };
  }, [origin]);

  const [centre, setCentre] = useState<Coordinates>(home);
  const [zoom, setZoom] = useState(1);
  const [turned, setTurned] = useState(false);
  useEffect(() => {
    setCentre(home);
    setZoom(1);
    setTurned(false);
  }, [home]);

  const radius = R * zoom;

  /* ── Turning it ───────────────────────────────────────────────────────── */
  const drag = useRef<{ x: number; y: number; from: Coordinates; id: number } | null>(null);

  /** Drawing units per CSS pixel, so a drag moves the earth under the finger. */
  const unitsPerPixel = useCallback(
    () => (2 * FRAME) / (svgRef.current?.getBoundingClientRect().width || 2 * FRAME),
    [],
  );

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    drag.current = { x: event.clientX, y: event.clientY, from: centre, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    // A drag of one radius across the face is a quarter turn, near enough:
    // the earth follows the finger. Rightwards brings the west round, and
    // downwards brings the north down.
    const perUnit = 180 / Math.PI / radius;
    const dx = (event.clientX - start.x) * unitsPerPixel() * perUnit;
    const dy = (event.clientY - start.y) * unitsPerPixel() * perUnit;
    setCentre({
      longitude: start.from.longitude - dx,
      latitude: Math.max(-89, Math.min(89, start.from.latitude + dy)),
    });
    setTurned(true);
  }

  function endDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }

  function recentre() {
    setCentre(home);
    setZoom(1);
    setTurned(false);
  }

  /* ── The drawing ──────────────────────────────────────────────────────── */
  const land = useMemo(
    () => (outline ? outline.land.map((ring) => ringPath(ring, centre, radius)).join('') : ''),
    [outline, centre, radius],
  );
  const borders = useMemo(
    () => (outline ? outline.borders.map((line) => openPath(line, centre, radius)).join('') : ''),
    [outline, centre, radius],
  );
  const grid = useMemo(() => {
    const lines: string[] = [];
    for (let lon = -180; lon < 180; lon += 30) lines.push(openPath(meridian(lon), centre, radius));
    for (let lat = -60; lat <= 60; lat += 30) lines.push(openPath(parallel(lat), centre, radius));
    return lines.join('');
  }, [centre, radius]);

  const arc = useMemo(
    () => openPath(greatCircle(origin, KAABA, 128), centre, radius),
    [origin, centre, radius],
  );

  const here = placeOf(centre, origin, radius);
  const kaaba = placeOf(centre, KAABA, radius);

  // A short tick towards local north, and the first step of the arc, so the
  // bearing can be seen on the map as the angle between them.
  const northPoint = placeOf(
    centre,
    { latitude: Math.min(89.5, origin.latitude + 6), longitude: origin.longitude },
    radius,
  );
  const [firstLon, firstLat] = along(origin, KAABA, 0.045);
  const firstStep = placeOf(centre, { latitude: firstLat, longitude: firstLon }, radius);

  const reading = `${formatBearing(bearing, locale)}°`;

  return (
    <div className="qibla-map">
      <svg
        ref={svgRef}
        viewBox={`${-FRAME} ${-FRAME} ${2 * FRAME} ${2 * FRAME}`}
        className="qibla-globe"
        role="img"
        aria-label={`${t('mapLabel')}: ${originLabel}, ${reading}, ${formatDistanceKm(distanceKm, locale)} km`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <clipPath id="qibla-globe-clip">
            <circle r={R} />
          </clipPath>
          {/* The sphere's own light: a little brighter towards the viewer's
              upper left, and darker at the limb, so it reads as a ball. */}
          <radialGradient id="qibla-sea" cx="38%" cy="32%" r="78%">
            <stop offset="0%" stopColor="var(--map-sea)" />
            <stop offset="72%" stopColor="var(--map-sea)" />
            <stop offset="100%" stopColor="var(--greenD)" stopOpacity="0.22" />
          </radialGradient>
          <linearGradient id="qibla-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--goldHi)" />
            <stop offset="50%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--goldLo)" />
          </linearGradient>
        </defs>

        <g clipPath="url(#qibla-globe-clip)">
          <circle r={Math.max(radius, FRAME * 1.5)} fill="url(#qibla-sea)" />
          <path d={grid} fill="none" stroke="var(--map-grid)" strokeWidth="0.5" />
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

          {/* The way there. The wide pale stroke underneath is the glow that
              keeps a hairline visible over both land and sea. */}
          <path d={arc} fill="none" stroke="var(--gold)" strokeOpacity="0.28" strokeWidth="5" />
          <path
            d={arc}
            fill="none"
            stroke="url(#qibla-arc)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Where you stand: north, the angle, and the mark. */}
          {here.visible ? (
            <g>
              <line
                x1={here.sx}
                y1={here.sy}
                x2={northPoint.sx}
                y2={northPoint.sy}
                stroke="var(--color-ink-muted)"
                strokeWidth="0.7"
                strokeDasharray="2 2"
              />
              <BearingArc here={here} north={northPoint} first={firstStep} />
              <circle r="4.6" cx={here.sx} cy={here.sy} fill="var(--card)" opacity="0.9" />
              <circle
                r="3"
                cx={here.sx}
                cy={here.sy}
                fill="var(--green)"
                stroke="var(--card)"
                strokeWidth="1.1"
              />
              <text className="qibla-globe-label" x={here.sx} y={here.sy + 13} textAnchor="middle">
                {originLabel}
              </text>
            </g>
          ) : null}

          {kaaba.visible ? (
            <g transform={`translate(${kaaba.sx} ${kaaba.sy})`}>
              {/* A disc behind it: the Kaaba's own black all but vanishes
                  against the dark theme's land. */}
              <circle r="9.5" fill="var(--card)" opacity="0.92" />
              <g transform="scale(0.42)">
                <KaabaGlyph />
              </g>
              <text className="qibla-globe-label" y={15} textAnchor="middle">
                {t('mecca')}
              </text>
            </g>
          ) : null}
        </g>

        {/* The limb, last, so nothing crosses it. */}
        <circle r={R} fill="none" stroke="var(--gold)" strokeWidth="1.3" />
        <circle r={R - 3.5} fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.55" />
      </svg>

      <div className="qibla-map-controls">
        <div className="reader-size" role="group" aria-label={t('zoom')}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
            disabled={zoom <= 1}
            aria-label={t('zoomOut')}
          >
            <Minus size={13} weight="bold" aria-hidden="true" />
          </button>
          <span className="reader-size-value tabular" aria-hidden="true">
            ×{digits(zoom, locale)}
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.5) * 10) / 10))}
            disabled={zoom >= MAX_ZOOM}
            aria-label={t('zoomIn')}
          >
            <Plus size={13} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="mushaf-switch reader-full-btn"
          onClick={recentre}
          disabled={!turned && zoom === 1}
        >
          <ArrowsClockwise size={17} weight="duotone" aria-hidden="true" />
          {t('recentre')}
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {t('mapHint')}
      </p>
    </div>
  );
}

/**
 * The bearing, drawn where it is meant: the angle at your feet between north
 * and the first step of the way to Mecca, swept clockwise as a bearing is.
 */
function BearingArc({
  here,
  north,
  first,
}: {
  here: { sx: number; sy: number };
  north: { sx: number; sy: number };
  first: { sx: number; sy: number };
}) {
  const r = 13;
  const TWO_PI = Math.PI * 2;
  const angle = (p: { sx: number; sy: number }) => Math.atan2(p.sy - here.sy, p.sx - here.sx);
  const from = angle(north);
  // Clockwise from north, which is what a bearing is, and which in a
  // y-downwards system is the direction of increasing angle — SVG's own
  // positive sweep.
  const swept = (((angle(first) - from) % TWO_PI) + TWO_PI) % TWO_PI;
  const large = swept > Math.PI ? 1 : 0;
  const at = (a: number) =>
    `${(here.sx + Math.cos(a) * r).toFixed(2)} ${(here.sy + Math.sin(a) * r).toFixed(2)}`;

  return (
    <path
      d={`M${at(from)}A${r} ${r} 0 ${large} 1 ${at(from + swept)}`}
      fill="none"
      stroke="var(--goldInk)"
      strokeWidth="0.9"
      opacity="0.85"
    />
  );
}

/** The Kaaba, drawn around (0, 0) at about 30 units across. */
export function KaabaGlyph() {
  const gold = 'var(--gold)';
  return (
    <g strokeLinejoin="round">
      <path d="M-13 -9 L-5 -15 L15 -15 L7 -9 Z" fill="#2b2b2b" />
      <path d="M7 -9 L15 -15 L15 8 L7 14 Z" fill="#0d0d0d" />
      <rect x="-13" y="-9" width="20" height="23" fill="#1a1a1a" />
      <rect x="-13" y="-4.5" width="20" height="3.2" fill={gold} />
      <rect x="-1" y="3.5" width="5" height="8.5" rx="0.6" fill={gold} />
      <path
        d="M-13 -9 L-5 -15 L15 -15 L15 8 L7 14 L-13 14 Z M7 -9 L7 14 M-13 -9 L7 -9"
        fill="none"
        stroke={gold}
        strokeWidth="1.4"
      />
    </g>
  );
}
