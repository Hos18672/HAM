'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowsClockwise,
  Compass,
  GlobeHemisphereEast,
  MapTrifold,
  Minus,
  Plus,
} from '@phosphor-icons/react/dist/ssr';
import { KAABA, greatCirclePath, type Coordinates } from '@/lib/qibla';
import { MAX_ZOOM, MIN_ZOOM, TILE, panned, project, tilesFor, unproject } from '@/lib/slippy';
import { formatBearing, formatNumber } from '@/lib/i18n/format';
import { QiblaHere } from './qibla-here';
import { KaabaGlyph } from './qibla-glyphs';
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
  mine,
  bearing,
  distanceKm,
  locale,
  originLabel,
  heading,
  headingLive,
}: {
  origin: Coordinates;
  /** Whether the middle of the map is the reader, or the house. */
  mine: boolean;
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
  /**
   * How much of the earth is in view: the street the reader stands in, or
   * the whole way to Mecca. Two buttons rather than a pinch, because the
   * second is a specific view — both ends and the line between them — and
   * no amount of zooming lands on it by hand.
   */
  const [span, setSpan] = useState<'street' | 'mecca'>('street');
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

  const toStreet = useCallback(() => {
    setCentre(origin);
    setZoom(DEFAULT_ZOOM);
    setSpan('street');
    setMoved(false);
  }, [origin]);

  /** The widest zoom at which both places still sit inside the frame. */
  const toMecca = useCallback(() => {
    if (size.width === 0) return;
    let fits = MIN_ZOOM;
    for (let z = MIN_ZOOM; z <= MAX_ZOOM; z += 1) {
      const a = project(origin, z);
      const b = project(KAABA, z);
      if (Math.abs(a.x - b.x) <= size.width - 96 && Math.abs(a.y - b.y) <= size.height - 96) {
        fits = z;
      } else break;
    }
    const a = project(origin, fits);
    const b = project(KAABA, fits);
    setCentre(unproject({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, fits));
    setZoom(fits);
    setSpan('mecca');
    setMoved(true);
  }, [origin, size.width, size.height]);

  /**
   * The way to Mecca, as the great circle it is.
   *
   * Only once the view is wide enough for the difference to show: close in,
   * Mercator preserves angles at a point, so the straight arrow out of the
   * reader's feet leaves at the true bearing and is the honest drawing. Over
   * a third of the globe it is not, and the curve is.
   */
  const route = useMemo(() => {
    if (size.width === 0 || zoom > 8) return null;
    const z = Math.round(zoom);
    const middle = project(centre, z);
    return greatCirclePath(origin, KAABA, 96)
      .map((point) => {
        const p = project(point, z);
        return `${(p.x - middle.x + size.width / 2).toFixed(1)},${(p.y - middle.y + size.height / 2).toFixed(1)}`;
      })
      .join(' ');
  }, [centre, origin, zoom, size.width, size.height]);

  /** The Kaaba's own place on the map, once it is in view. */
  const kaabaAt = useMemo(() => {
    if (size.width === 0 || !route) return null;
    const z = Math.round(zoom);
    const middle = project(centre, z);
    const k = project(KAABA, z);
    return { x: k.x - middle.x + size.width / 2, y: k.y - middle.y + size.height / 2 };
  }, [centre, zoom, size.width, size.height, route]);

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
          mine={mine}
          originLabel={originLabel}
          heading={heading}
          headingLive={headingLive}
        />
      </div>
    );
  }

  return (
    <div className="qibla-map">
      {/* The frame, so the attribution can sit over the corner of the map
          without living *inside* it: a `role="img"` must hold no focusable
          content, and OpenStreetMap's credit is a link. */}
      <div className="qibla-street-frame">
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

          {/* The whole way, where the whole way is in view. */}
          {route ? (
            <svg className="qibla-street-layer" viewBox={`0 0 ${size.width} ${size.height}`}>
              <polyline points={route} className="qibla-route-under" />
              <polyline points={route} className="qibla-route" />
            </svg>
          ) : null}

          {/* The direction, out of the reader's own feet. Only close in:
              beside the drawn great circle a straight ray is a second,
              different answer to the same question. */}
          {me ? (
            <svg className="qibla-street-layer" viewBox={`0 0 ${size.width} ${size.height}`}>
              {!route ? (
                <>
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
                  {/* The Kaaba rides on the line, near the reader: it stands
                    for where the line goes, not for a place on this map.
                    Where the map is wide enough to hold the real one, it is
                    drawn there instead. */}
                  <g
                    transform={`translate(${me.x + Math.cos(theta) * 74} ${me.y + Math.sin(theta) * 74})`}
                  >
                    <circle r="17" fill="var(--card)" opacity="0.95" />
                    <circle r="17" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
                    <g transform="scale(0.72)">
                      <KaabaGlyph />
                    </g>
                  </g>
                </>
              ) : null}
              {/* The middle of the map. A dot where it is the reader —
                  the mark every map on a phone uses for "you" — and the
                  house only where it really is the house. Drawn as a
                  house either way, it said the one thing it must never
                  say: that the reader is standing in Hernals. */}
              <g transform={`translate(${me.x} ${me.y})`}>
                <circle r="13" fill="var(--card)" opacity="0.95" />
                <circle r="13" fill="none" stroke="var(--green)" strokeWidth="2" />
                {mine ? <circle r="5.5" fill="var(--green)" /> : <HomeGlyph />}
              </g>
            </svg>
          ) : null}

          {kaabaAt ? (
            <svg className="qibla-street-layer" viewBox={`0 0 ${size.width} ${size.height}`}>
              <g transform={`translate(${kaabaAt.x} ${kaabaAt.y})`}>
                <circle r="17" fill="var(--card)" opacity="0.95" />
                <circle r="17" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
                <g transform="scale(0.72)">
                  <KaabaGlyph />
                </g>
              </g>
            </svg>
          ) : null}

          {/* And said in words, because an icon on its own is a guess. */}
          <p className="qibla-street-who">{originLabel}</p>

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
        </div>

        <div className="qibla-span">
          <button
            type="button"
            className="qibla-span-btn"
            aria-pressed={span === 'street'}
            onClick={toStreet}
          >
            <MapTrifold size={17} weight="duotone" aria-hidden="true" />
            <span>{t('streetBtn')}</span>
          </button>
          <button
            type="button"
            className="qibla-span-btn"
            aria-pressed={span === 'mecca'}
            onClick={toMecca}
          >
            <GlobeHemisphereEast size={17} weight="duotone" aria-hidden="true" />
            <span>{t('fitMecca')}</span>
          </button>
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
          aria-label={t('recentreMe')}
        >
          <ArrowsClockwise size={17} weight="duotone" aria-hidden="true" />
          {/* The words go on a narrow map, where four pills of German over
              the street is more furniture than map. The name stays on the
              button for anyone not reading it with their eyes. */}
          <span className="qibla-ctl-word">{t('recentreMe')}</span>
        </button>
        {headingLive ? (
          <span className="mushaf-switch reader-full-btn" aria-live="polite">
            <Compass size={17} weight="duotone" aria-hidden="true" />
            <span className="qibla-ctl-word">{t('headingOn')}</span>
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
