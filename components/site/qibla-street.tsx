'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Crosshair,
  GlobeHemisphereEast,
  MapTrifold,
  Minus,
  Plus,
} from '@phosphor-icons/react/dist/ssr';
import { KAABA, greatCirclePath, type Coordinates } from '@/lib/qibla';
import { MAX_ZOOM, MIN_ZOOM, TILE, panned, project, tilesFor, unproject } from '@/lib/slippy';
import { formatBearing, formatNumber } from '@/lib/i18n/format';
import {
  GOOGLE_KEY,
  dropGoogleSession,
  googleCopyright,
  googleSession,
  googleTileUrl,
} from '@/lib/google-tiles';
import { hasGoogleConsent, onGoogleConsent, setGoogleConsent } from '@/lib/google-consent';
import { QiblaHere } from './qibla-here';
import { KaabaGlyph } from './qibla-glyphs';
import type { Locale } from '@/lib/i18n/config';

/**
 * The qibla on the street you are standing in.
 *
 * The map underneath is Google's, the map most readers already find their
 * way with, in one of two forms:
 *
 * - With a Google key in the build, Google's own tiles (`lib/google-tiles`),
 *   drawn here like any slippy map: dragged by the finger, sharp on a phone.
 * - Without one (or if Google refuses the key), Google Maps' ordinary
 *   embedded map, which needs no key: centred on the same point at the same
 *   zoom, so the arrow drawn over it leaves the reader's position at the
 *   right angle. It cannot follow a drag, so in this form the map is moved
 *   by its buttons only. An embedded Google map sets cookies, so it waits
 *   for the reader to agree (`lib/google-consent`), once per browser.
 *
 * Either way that is a request to
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

/**
 * Google Maps' keyless embed, centred on `centre` at a whole zoom — the same
 * Web Mercator and the same 256-pixel world as `lib/slippy`, so what is drawn
 * over it lands where the map has it.
 */
function embedUrl(centre: Coordinates, zoom: number, locale: string) {
  const ll = `${centre.latitude.toFixed(6)},${centre.longitude.toFixed(6)}`;
  return `https://www.google.com/maps?ll=${ll}&z=${Math.round(zoom)}&t=m&hl=${locale}&output=embed`;
}
/** Google's own logo, which its tiles must be shown with. */
const GOOGLE_LOGO = 'https://maps.gstatic.com/mapfiles/api-3/images/google_white5_hdpi.png';
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
  const tContact = useTranslations('contact');
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
  /** With no network there is no map of any kind: the drawn one stands in. */
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  /**
   * Google's tile session: undefined while it is being asked for, null where
   * there is none to be had (no key, or Google refused), and the map is then
   * Google's embed. Nothing is drawn while it is undefined, so a reader
   * never sees one map swapped for the other.
   */
  const [google, setGoogle] = useState<string | null | undefined>(GOOGLE_KEY ? undefined : null);
  const [copyright, setCopyright] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  /** For the embed: whether the reader has agreed to Google Maps. */
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    setConsent(hasGoogleConsent());
    return onGoogleConsent(setConsent);
  }, []);
  const embedded = google === null;

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    let live = true;
    void googleSession(locale).then((value) => {
      if (live) setGoogle(value?.session ?? null);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  /** A tile Google refuses: the session is stale or the key is wrong — the embed it is. */
  const googleFailed = useCallback(() => {
    dropGoogleSession(locale);
    setGoogle(null);
  }, [locale]);

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

  // Google's copyright for what is in view, asked for once the map has
  // stopped moving for a moment rather than on every step of a drag.
  useEffect(() => {
    if (!google || size.width === 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const z = Math.round(zoom);
      const middle = project(centre, z);
      const nw = unproject({ x: middle.x - size.width / 2, y: middle.y - size.height / 2 }, z);
      const se = unproject({ x: middle.x + size.width / 2, y: middle.y + size.height / 2 }, z);
      void googleCopyright(
        google,
        z,
        {
          north: Math.min(85, nw.latitude),
          south: Math.max(-85, se.latitude),
          west: Math.max(-180, nw.longitude),
          east: Math.min(180, se.longitude),
        },
        controller.signal,
      ).then((line) => {
        if (!controller.signal.aborted) setCopyright(line);
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [google, centre, zoom, size.width, size.height]);

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
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // The embed cannot be moved under the drawing, so it is not dragged.
      if (embedded) return;
      if ((event.target as HTMLElement).closest('button')) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [embedded],
  );
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

  if (offline) {
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
          content, and the map's credit can be a link. */}
      <div className="qibla-street-frame">
        <div
          ref={frame}
          className="qibla-street"
          data-embedded={embedded || undefined}
          role="img"
          aria-label={`${t('streetLabel')}: ${formatBearing(bearing, locale)}°`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {embedded && consent && size.width > 0 ? (
            <iframe
              className="qibla-embed"
              src={embedUrl(centre, zoom, locale)}
              title={t('streetLabel')}
              tabIndex={-1}
              aria-hidden="true"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : null}
          {(google ? tiles : []).map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={tile.key}
              src={googleTileUrl(google!, tile.z, tile.x, tile.y)}
              alt=""
              width={TILE}
              height={TILE}
              draggable={false}
              loading="lazy"
              className="qibla-tile"
              style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
              onError={googleFailed}
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

        {/* One small segmented switch in the bottom corner rather than two
            big pills across the street: the map is what this tab is for. */}
        <div className="qibla-span" role="group" aria-label={t('streetLabel')}>
          <button
            type="button"
            className="qibla-span-btn"
            aria-pressed={span === 'street'}
            onClick={toStreet}
          >
            <MapTrifold size={15} weight="duotone" aria-hidden="true" />
            <span>{t('streetBtn')}</span>
          </button>
          <button
            type="button"
            className="qibla-span-btn"
            aria-pressed={span === 'mecca'}
            onClick={toMecca}
          >
            <GlobeHemisphereEast size={15} weight="duotone" aria-hidden="true" />
            <span>{t('fitMecca')}</span>
          </button>
        </div>

        {google ? (
          <p className="qibla-attribution qibla-attribution-google">
            {logoFailed ? (
              <span className="qibla-google-word">Google</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={GOOGLE_LOGO}
                alt="Google"
                width={59}
                height={18}
                className="qibla-google-logo"
                onError={() => setLogoFailed(true)}
              />
            )}
            <span>{copyright ?? `Map data ©${new Date().getFullYear()} Google`}</span>
          </p>
        ) : null}

        {/* The embed waits for the reader's agreement, asked here once. */}
        {embedded && !consent ? (
          <button
            type="button"
            className="map-load qibla-load"
            onClick={() => setGoogleConsent(true)}
          >
            <span className="map-load-pill">{tContact('loadMap')}</span>
            <span className="visually-hidden"> — {tContact('loadMapNote')}</span>
          </button>
        ) : null}

        {/* Zoom and recentre as a slim column in the top corner, the way
            every phone map keeps them: out of the street, under the thumb. */}
        <div className="qibla-street-controls">
          <div className="qibla-zoom" role="group" aria-label={t('zoom')}>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t('zoomIn')}
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
            </button>
            <span className="qibla-zoom-value tabular" aria-hidden="true">
              {across}
            </span>
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t('zoomOut')}
            >
              <Minus size={14} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className="qibla-recentre"
            onClick={recentre}
            disabled={!moved && zoom === DEFAULT_ZOOM}
            aria-label={t('recentreMe')}
            title={t('recentreMe')}
          >
            <Crosshair size={16} weight="bold" aria-hidden="true" />
          </button>
          {/* That the compass is live is said by the north rose, which turns
              with the phone. Still announced, for a reader not looking at it. */}
          {headingLive ? (
            <span className="visually-hidden" aria-live="polite">
              {t('headingOn')}
            </span>
          ) : null}
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        {t('streetHint')}
      </p>
      {embedded ? (
        consent ? (
          <button type="button" className="map-load-hide" onClick={() => setGoogleConsent(false)}>
            {tContact('hideMap')}
          </button>
        ) : (
          <p className="map-load-note">{tContact('loadMapNote')}</p>
        )
      ) : null}
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
