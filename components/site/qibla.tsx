'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { offerPosition, rememberedPlace } from '@/lib/prayer-place';
import { useTranslations } from 'next-intl';
import {
  ArrowsClockwise,
  CheckCircle,
  Compass as CompassIcon,
  Crosshair,
  HouseLine,
  MapPin,
  MapTrifold,
  NavigationArrow,
} from '@phosphor-icons/react/dist/ssr';
import { qiblaFrom, HOUSE, type Coordinates } from '@/lib/qibla';
import { formatBearing, formatDistanceKm, digits } from '@/lib/i18n/format';
import { QiblaStreet } from './qibla-street';
import type { Locale } from '@/lib/i18n/config';

/** A device orientation event that also carries the iOS compass heading. */
interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type CompassState = 'idle' | 'active' | 'unsupported' | 'denied';
type GeoState = 'house' | 'locating' | 'located' | 'denied' | 'unsupported' | 'failed';
type Tab = 'compass' | 'map';

const TABS: Tab[] = ['compass', 'map'];
/** Within this many degrees of the bearing, the reader is facing the qibla. */
const ALIGNED = 5;
/** A device with a magnetometer answers long before this. */
const SENSOR_WAIT = 2500;
const STORE = 'ham.qibla.tab';

/**
 * The qibla, on one screen.
 *
 * Three layers, in this order of trust:
 *   1. the computed bearing, which is always correct and needs no permission,
 *   2. the visitor's own position, if they offer it,
 *   3. the device's live heading, if it has a magnetometer and consents.
 *
 * Each is an enhancement on the one before, and each failure is stated
 * explicitly rather than leaving a needle pointing somewhere arbitrary.
 *
 * The two ways of showing it — the dial and the map — are
 * tabs of one stage rather than sections stacked down the page, so that the
 * thing a reader came for is on the screen they arrive at.
 */
export function Qibla({ locale }: { locale: Locale }) {
  const t = useTranslations('qibla');

  // The place, not the reading: the map needs the coordinates too, and two
  // copies of "where we are" is one too many.
  const [origin, setOrigin] = useState<Coordinates>(HOUSE);
  const qibla = useMemo(() => qiblaFrom(origin), [origin]);
  const [geo, setGeo] = useState<GeoState>('house');

  const [compass, setCompass] = useState<CompassState>('idle');
  const [heading, setHeading] = useState(0);
  const [tab, setTab] = useState<Tab>('compass');

  /* ── Which tab ────────────────────────────────────────────────────────── */
  /**
   * Read once the page is interactive rather than during render: the markup
   * is prerendered for GitHub Pages, so a tab taken from the hash or from
   * storage at render time would be a different tree from the one the server
   * wrote and the first paint would be thrown away.
   */
  useEffect(() => {
    const asked = window.location.hash.replace('#', '');
    const stored = (() => {
      try {
        return window.localStorage.getItem(STORE);
      } catch {
        return null;
      }
    })();
    const wanted = [asked, stored].find((value): value is Tab => TABS.includes(value as Tab));
    if (wanted) setTab(wanted);
  }, []);

  const openTab = useCallback((next: Tab) => {
    setTab(next);
    try {
      window.localStorage.setItem(STORE, next);
    } catch {
      /* A browser with storage switched off still gets the tab. */
    }
    // The hash without telling the router: this is a view of one page, not a
    // navigation, and pushing a route would rebuild the subtree under it.
    History.prototype.replaceState.call(window.history, window.history.state, '', `#${next}`);
  }, []);

  /** Left and right move between tabs, as a tablist is expected to. */
  const onTabKey = (event: React.KeyboardEvent) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    // In Persian the row runs the other way, so the arrows must too.
    const dir = document.documentElement.dir === 'rtl' ? -step : step;
    const next = TABS[(TABS.indexOf(tab) + dir + TABS.length) % TABS.length]!;
    openTab(next);
    document.getElementById(`qibla-tab-${next}`)?.focus();
  };

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

  /**
   * A browser can define the event and still have nothing to report it from —
   * a desktop, or a phone whose magnetometer is off. Nothing fires, no error
   * is raised, and the dial would sit there looking live. If no reading has
   * arrived by now, say so and point the reader at the map.
   */
  const reading = useRef(false);
  useEffect(() => {
    if (compass !== 'active') return;
    reading.current = false;
    const timer = window.setTimeout(() => {
      if (!reading.current) setCompass('unsupported');
    }, SENSOR_WAIT);
    return () => window.clearTimeout(timer);
  }, [compass]);
  useEffect(() => {
    if (compass === 'active') reading.current = true;
  }, [heading, compass]);

  async function activateCompass() {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setCompass('unsupported');
      return;
    }
    openTab('compass');

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
  const locateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeo('located');
        offerPosition(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        // Refused: back to the house, which is what the message says is shown.
        if (error.code === error.PERMISSION_DENIED) setOrigin(HOUSE);
        setGeo(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  /**
   * Asked for as the page opens, because somebody who has come to this page
   * is standing somewhere and wants to know which way to turn from *there*.
   * The house is the fallback, not the starting point: refuse the browser's
   * prompt, or have no sensor at all, and the page says so and shows the
   * direction from Hernals, which is still a true qibla and still useful.
   *
   * Once only, and never again after the reader has asked for the house
   * back — that is a choice, and the page does not argue with it.
   */
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    // Where the reader was last time, at once, while the browser finds where
    // they are now.
    const remembered = rememberedPlace();
    if (remembered) setOrigin({ latitude: remembered.latitude, longitude: remembered.longitude });
    locateMe();
  }, [locateMe]);

  function backToHouse() {
    setOrigin(HOUSE);
    setGeo('house');
  }

  /* ── What the dial says ───────────────────────────────────────────────── */
  // The rose counter-rotates to the live heading, so north on the dial keeps
  // pointing at real north and the needle keeps pointing at the Kaaba.
  const roseRotation = compass === 'active' ? -heading : 0;
  /** Signed, in (-180, 180]: positive means the qibla is to the reader's right. */
  const offBy = compass === 'active' ? ((qibla.bearing - heading + 540) % 360) - 180 : 0;
  const facing = compass === 'active' && Math.abs(offBy) < ALIGNED;

  /** A short buzz the moment it lines up, and not again until it drifts off. */
  const buzzed = useRef(false);
  useEffect(() => {
    if (!facing) {
      buzzed.current = false;
      return;
    }
    if (buzzed.current) return;
    buzzed.current = true;
    navigator.vibrate?.(30);
  }, [facing]);

  const status = facing
    ? t('aligned')
    : compass === 'active'
      ? `${offBy > 0 ? t('turnRight') : t('turnLeft')} · ${digits(Math.round(Math.abs(offBy)), locale)}°`
      : t('noSensor');
  const StatusIcon = facing
    ? CheckCircle
    : compass === 'active'
      ? ArrowsClockwise
      : NavigationArrow;

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
  const mine = geo === 'located';
  const originLabel = mine ? t('fromYourLocation') : t('fromHouse');

  const tabIcon = { compass: CompassIcon, map: MapTrifold };
  const tabLabel = { compass: t('tabCompass'), map: t('tabMap') };

  return (
    <div className="qibla">
      <div className="qibla-stage">
        <div className="qibla-tabs-row">
          <div role="tablist" aria-label={t('tabs')} className="qibla-tabs" onKeyDown={onTabKey}>
            {TABS.map((key) => {
              const Icon = tabIcon[key];
              return (
                <button
                  key={key}
                  id={`qibla-tab-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`qibla-panel-${key}`}
                  tabIndex={tab === key ? 0 : -1}
                  className="qibla-tab"
                  onClick={() => openTab(key)}
                >
                  <Icon size={18} weight="duotone" aria-hidden="true" />
                  <span>{tabLabel[key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="qibla-panel-compass"
          role="tabpanel"
          aria-labelledby="qibla-tab-compass"
          className="qibla-panel qibla-panel-compass"
          hidden={tab !== 'compass'}
        >
          <div className="qibla-dial-fit">
            <div className="qibla-dial" data-facing={facing ? 'yes' : 'no'}>
              <div className="qibla-halo" aria-hidden="true" />
              <Rose
                rotation={roseRotation}
                bearing={qibla.bearing}
                label={t('rose')}
                cardinals={[t('cardinal.n'), t('cardinal.e'), t('cardinal.s'), t('cardinal.w')]}
              />
              <div className="qibla-dial-centre">
                <span className="qibla-deg">{formatBearing(qibla.bearing, locale)}°</span>
                <span className="qibla-dial-card">{t(`cardinalLong.${qibla.cardinal}`)}</span>
              </div>
            </div>
          </div>
          {/* The switch sits right under the dial it brings to life, within
              thumb's reach; once the sensor answers, its place is taken by
              the instruction it makes possible. */}
          {compass === 'idle' || compass === 'denied' ? (
            <button type="button" className="qibla-go" onClick={activateCompass}>
              <CompassIcon size={20} weight="duotone" aria-hidden="true" />
              <span>{t('activateCompass')}</span>
            </button>
          ) : (
            <p
              className="qibla-status"
              data-facing={facing ? 'yes' : 'no'}
              data-live={compass === 'active' ? 'yes' : 'no'}
              aria-live="polite"
            >
              <StatusIcon size={18} weight="duotone" aria-hidden="true" />
              <span>{status}</span>
            </p>
          )}
        </div>

        <div
          id="qibla-panel-map"
          role="tabpanel"
          aria-labelledby="qibla-tab-map"
          className="qibla-panel qibla-panel-map"
          hidden={tab !== 'map'}
        >
          {/* Built only once the reader opens it: the tiles are the one
              request this site makes to anybody else's server. */}
          {tab === 'map' ? (
            <QiblaStreet
              origin={origin}
              mine={mine}
              bearing={qibla.bearing}
              distanceKm={qibla.distanceKm}
              locale={locale}
              originLabel={originLabel}
              heading={heading}
              headingLive={compass === 'active'}
            />
          ) : null}
        </div>
      </div>

      <aside className="qibla-side">
        <div className="qibla-card">
          <div className="qibla-field">
            <span className="qibla-field-name">{t('calcFrom')}</span>
            <div className="qibla-seg">
              <button
                type="button"
                aria-pressed={!mine}
                className="qibla-seg-btn"
                onClick={backToHouse}
              >
                <HouseLine size={17} weight="duotone" aria-hidden="true" />
                <span>{t('house')}</span>
              </button>
              <button
                type="button"
                aria-pressed={mine}
                className="qibla-seg-btn"
                onClick={locateMe}
                disabled={geo === 'locating'}
              >
                <Crosshair size={17} weight="duotone" aria-hidden="true" />
                <span>{geo === 'locating' ? t('searching') : t('myLocation')}</span>
              </button>
            </div>
            {geoMessage && geo !== 'locating' ? (
              <p className="qibla-geo-note" role="status">
                {geoMessage}
              </p>
            ) : null}
          </div>

          <div className="qibla-figures">
            <div className="qibla-figure">
              <span className="qibla-figure-name">{t('bearing')}</span>
              <span className="qibla-figure-value">{formatBearing(qibla.bearing, locale)}°</span>
              <span className="qibla-figure-unit">{t(`cardinalLong.${qibla.cardinal}`)}</span>
            </div>
            <div className="qibla-figure">
              <span className="qibla-figure-name">{t('distanceToKaaba')}</span>
              <span className="qibla-figure-value">
                {formatDistanceKm(qibla.distanceKm, locale)}
              </span>
              <span className="qibla-figure-unit">{t('kilometresLong')}</span>
            </div>
          </div>

          <p className="qibla-hint">
            {compass === 'denied' ? t('error.denied') : t('compassHint')}
          </p>
        </div>

        <p className="qibla-origin">
          <MapPin size={22} weight="duotone" aria-hidden="true" />
          <span>{mine ? t('fromYourLocation') : t('fromHouse')}</span>
        </p>
      </aside>

      <p className="qibla-privacy">{t('privacy')}</p>
    </div>
  );
}

/* ─── The dial ───────────────────────────────────────────────────────────── */

/** Where a tick starts and ends, by how important it is. */
const TICK_END = { major: 126, mid: 133, minor: 139 } as const;
const TICK_WIDTH = { major: 2.4, mid: 1.4, minor: 0.8 } as const;

/**
 * The rose, the needle and the Kaaba on it.
 *
 * Drawn on a 320-unit square and scaled by the box around it, so one set of
 * coordinates serves every size the stage gives it. The rose turns with the
 * reader; the needle turns to the bearing inside it, which is why it is
 * nested — two rotations composed, rather than one angle worked out twice.
 */
function Rose({
  rotation,
  bearing,
  label,
  cardinals,
}: {
  rotation: number;
  bearing: number;
  label: string;
  /** North, east, south and west, in the page's own language. */
  cardinals: [string, string, string, string];
}) {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = i * 5 * (Math.PI / 180);
    const kind = i % 18 === 0 ? 'major' : i % 6 === 0 ? 'mid' : 'minor';
    const inner = TICK_END[kind];
    return {
      i,
      x1: 160 + 146 * Math.sin(angle),
      y1: 160 - 146 * Math.cos(angle),
      x2: 160 + inner * Math.sin(angle),
      y2: 160 - inner * Math.cos(angle),
      width: TICK_WIDTH[kind],
      major: kind === 'major',
    };
  });

  return (
    <svg className="qibla-svg" viewBox="0 0 320 320" role="img" aria-label={label}>
      <circle cx="160" cy="160" r="156" className="qibla-face" />
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '160px 160px' }}>
        {ticks.map((tick) => (
          <line
            key={tick.i}
            x1={tick.x1.toFixed(2)}
            y1={tick.y1.toFixed(2)}
            x2={tick.x2.toFixed(2)}
            y2={tick.y2.toFixed(2)}
            strokeWidth={tick.width}
            className={tick.major ? 'qibla-tick qibla-tick-major' : 'qibla-tick'}
          />
        ))}
        {cardinals.map((letter, i) => {
          const angle = i * 90 * (Math.PI / 180);
          return (
            <text
              key={letter}
              x={(160 + 106 * Math.sin(angle)).toFixed(2)}
              y={(160 - 106 * Math.cos(angle)).toFixed(2)}
              className={i === 0 ? 'qibla-rose-letter qibla-rose-north' : 'qibla-rose-letter'}
              // Each letter stays upright as the rose turns under it.
              style={{
                transform: `rotate(${-rotation}deg)`,
                transformOrigin: `${(160 + 106 * Math.sin(angle)).toFixed(2)}px ${(160 - 106 * Math.cos(angle)).toFixed(2)}px`,
              }}
            >
              {letter}
            </text>
          );
        })}
        <g
          className="qibla-needle"
          style={{ transform: `rotate(${bearing}deg)`, transformOrigin: '160px 160px' }}
        >
          <path d="M160 160 L178 70 L160 22 L142 70 Z" className="qibla-needle-wash" />
          <line x1="160" y1="150" x2="160" y2="52" className="qibla-needle-line" />
          <path d="M160 18l13 30h-26z" className="qibla-needle-head" />
          {/* The Kaaba, as the plainest drawing of it that reads at this size. */}
          <rect x="150" y="56" width="20" height="20" rx="3" className="qibla-kaaba" />
          <line x1="150" y1="62" x2="170" y2="62" className="qibla-kaaba-band" />
        </g>
      </g>
      {/* The reader's own heading: fixed at the top, where their nose is. */}
      <path d="M160 0l8 14h-16z" className="qibla-you" />
      <circle cx="160" cy="160" r="58" className="qibla-hub" />
    </svg>
  );
}
