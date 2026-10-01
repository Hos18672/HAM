'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowsClockwise, Compass, Minus, Plus } from '@phosphor-icons/react/dist/ssr';
import { type Coordinates } from '@/lib/qibla';
import { MAX_ZOOM, MIN_ZOOM, TILE, panned, project, tilesFor } from '@/lib/slippy';
import { formatBearing, formatNumber } from '@/lib/i18n/format';
import { QiblaHere } from './qibla-here';
import { KaabaGlyph } from './qibla-map';
import type { Locale } from '@/lib/i18n/config';

/**
 * The qibla on the street you are standing in.
 *
 * The map underneath is OpenStreetMap's own tiles. That is a request to
 * somebody else's server, which this site otherwise never makes, and it is
 * the one place where it is worth it: a direction is only usable if you can
 * see which way it points *relative to the buildings around you*, and no
 * amount of drawing from data we already have gives that.
 *
 * What it costs is stated plainly on the privacy page: the tile server is
 * told the viewer's address and, from the tiles asked for, roughly where on
 * the earth they are looking. Nothing else is sent, there is no script from
 * them, and the map is only built when the reader opens this view.
 *
 * The arrow may be drawn as a straight line because Mercator is conformal:
 * it preserves angles at a point, so the initial bearing of the great circle
 * — which is what the qibla is — leaves the reader's position at that very
 * angle on the screen. See `lib/slippy`.
 *
 * Where the tiles cannot be had — no network, a blocked host, a reader who
 * would rather not — the drawn map takes over and says so. Nothing about the
 * direction depends on them.
 */

/** OpenStreetMap's standard layer. Their policy asks for attribution. */
const TILES = 'https://tile.openstreetmap.org';
/** Close enough to see the street, far enough to see which way it runs. */
const DEFAULT_ZOOM = 17;

export function QiblaStreet({
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
  originLabel: string;
  heading: number;
  headingLive: boolean;
}) {
  const t = useTranslations('qibla');
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [centre, setCentre] = useState<Coordinates>(origin);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [moved, setMoved] = useState(false);
  /** Whether a single tile has ever arrived. Until one does, we draw instead. */
  const [tilesWork, setTilesWork] = useState<boolean | null>(null);

  // The reader's own place is where this opens, and where "recentre" returns.
  useEffect(() => {
    setCentre(origin);
    setZoom(DEFAULT_ZOOM);
    setMoved(false);
  }, [origin]);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(
    () => (size.width > 0 ? tilesFor(centre, zoom, size.width, size.height) : []),
    [centre, zoom, size.width, size.height],
  );

  /** Where the reader stands, in the viewport's own pixels. */
  const me = useMemo(() => {
    if (size.width === 0) return null;
    const z = Math.round(zoom);
    const middle = project(centre, z);
    const mine = project(origin, z);
    return {
      x: mine.x - middle.x + size.width / 2,
      y: mine.y - middle.y + size.height / 2,
    };
  }, [centre, origin, zoom, size.width, size.height]);

  /* ── Dragging the map ─────────────────────────────────────────────────── */
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, []);
  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      if (dx === 0 && dy === 0) return;
      d.x = event.clientX;
      d.y = event.clientY;
      setCentre((current) => panned(current, zoom, dx, dy));
      setMoved(true);
    },
    [zoom],
  );
  const endDrag = useCallback((event: React.PointerEvent) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }, []);

  const changeZoom = useCallback((by: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + by)));
  }, []);

  const recentre = useCallback(() => {
    setCentre(origin);
    setZoom(DEFAULT_ZOOM);
    setMoved(false);
  }, [origin]);

  /**
   * How wide the view is on the ground, which is what the two buttons
   * change. The distance to Mecca was printed here at first and it never
   * moved, so the control looked broken.
   */
  const across = useMemo(() => {
    if (size.width === 0) return '';
    const metresPerPixel =
      (156543.03392 * Math.cos(origin.latitude * (Math.PI / 180))) / 2 ** Math.round(zoom);
    const metres = metresPerPixel * size.width;
    return metres < 1000
      ? `${formatNumber(Math.round(metres / 10) * 10, locale)} ${t('metres')}`
      : `${formatNumber(Math.round(metres / 100) / 10, locale)} ${t('kilometres')}`;
  }, [origin.latitude, zoom, size.width, locale, t]);

  // The arrow is as long as the frame, so it always leaves the picture: the
  // Kaaba is 3 637 km away and no zoom puts it on a street map.
  const reach = Math.max(size.width, size.height);
  const theta = ((bearing - 90) * Math.PI) / 180;

  if (tilesWork === false) {
    return (
      <div className="qibla-fallback">
        <p className="text-sm" style={{ color: 'var(--color-accent-2-text)' }}>
          {t('mapOffline')}
        </p>
        <QiblaHere
          origin={origin}
          bearing={bearing}
          distanceKm={distanceKm}
          locale={locale}
          originLabel={originLabel}
          heading={heading}
          headingLive={headingLive}
        />
      </div>
    );
  }

  return (
    <div className="qibla-map">
      <div
        ref={frame}
        className="qibla-street"
        role="img"
        aria-label={`${t('streetLabel')}: ${formatBearing(bearing, locale)}°`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={`${TILES}/${tile.z}/${tile.x}/${tile.y}.png`}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            loading="lazy"
            className="qibla-tile"
            style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
            onLoad={() => setTilesWork(true)}
            onError={() => setTilesWork((works) => works ?? false)}
          />
        ))}

        {/* The direction, out of the reader's own feet. */}
        {me ? (
          <svg className="qibla-street-layer" viewBox={`0 0 ${size.width} ${size.height}`}>
            <defs>
              <linearGradient id="qibla-street-ray" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--goldInk)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
            </defs>
            <line
              x1={me.x}
              y1={me.y}
              x2={me.x + Math.cos(theta) * reach}
              y2={me.y + Math.sin(theta) * reach}
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <line
              x1={me.x}
              y1={me.y}
              x2={me.x + Math.cos(theta) * reach}
              y2={me.y + Math.sin(theta) * reach}
              stroke="url(#qibla-street-ray)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* The Kaaba rides on the line, near the reader: it stands for
                where the line goes, not for a place on this map. */}
            <g
              transform={`translate(${me.x + Math.cos(theta) * 74} ${me.y + Math.sin(theta) * 74})`}
            >
              <circle r="17" fill="var(--card)" opacity="0.95" />
              <circle r="17" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
              <g transform="scale(0.72)">
                <KaabaGlyph />
              </g>
            </g>
            <g transform={`translate(${me.x} ${me.y})`}>
              <circle r="13" fill="var(--card)" opacity="0.95" />
              <circle r="13" fill="none" stroke="var(--green)" strokeWidth="2" />
              <HomeGlyph />
            </g>
          </svg>
        ) : null}

        {/* North, as a paper compass would show it — turning with the phone
            where the phone knows which way it faces. */}
        <div className="qibla-street-rose" aria-hidden="true">
          <svg
            viewBox="-20 -20 40 40"
            style={{ transform: `rotate(${headingLive ? -heading : 0}deg)` }}
          >
            <circle r="18" fill="var(--card)" stroke="var(--line)" strokeWidth="1" />
            <path d="M0 -14 L4.5 2 L0 -1.5 Z" fill="var(--color-accent-2-text)" />
            <path d="M0 14 L-4.5 -2 L0 1.5 Z" fill="var(--color-ink-muted)" />
            <path d="M0 -14 L-4.5 2 L0 -1.5 Z" fill="var(--goldInk)" />
          </svg>
        </div>

        <p className="qibla-attribution">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            © OpenStreetMap
          </a>
        </p>
      </div>

      <div className="qibla-map-controls">
        <div className="reader-size" role="group" aria-label={t('zoom')}>
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            disabled={zoom <= MIN_ZOOM}
            aria-label={t('zoomOut')}
          >
            <Minus size={13} weight="bold" aria-hidden="true" />
          </button>
          <span className="reader-size-value tabular" aria-hidden="true">
            {across}
          </span>
          <button
            type="button"
            onClick={() => changeZoom(1)}
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
          disabled={!moved && zoom === DEFAULT_ZOOM}
        >
          <ArrowsClockwise size={17} weight="duotone" aria-hidden="true" />
          {t('recentreMe')}
        </button>
        {headingLive ? (
          <span className="mushaf-switch reader-full-btn" aria-live="polite">
            <Compass size={17} weight="duotone" aria-hidden="true" />
            {t('headingOn')}
          </span>
        ) : null}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {t('streetHint')}
      </p>
    </div>
  );
}

/** The reader, at the middle of their own street. */
function HomeGlyph() {
  return (
    <g
      fill="none"
      stroke="var(--green)"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M-6.5 -0.5 L0 -6 L6.5 -0.5" />
      <path d="M-4.8 -1.8 L-4.8 5.6 L4.8 5.6 L4.8 -1.8" />
      <path d="M-1.7 5.6 L-1.7 1.4 L1.7 1.4 L1.7 5.6" fill="var(--gold)" stroke="var(--gold)" />
    </g>
  );
}
