'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Copy } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { houseStatus, viennaNow, FACTS, type HouseStatus } from '@/lib/site-facts';
import { tilesFor } from '@/lib/slippy';

/**
 * The contact page's live parts. The page is built once and served for hours,
 * so anything that depends on the hour — open or closed, which row is today —
 * is worked out here, in Vienna's time, and again every minute.
 */

/** The current minute's answer, or null before the browser has given one.
 *  `read` must be a module-level function, or this re-subscribes each render. */
function useNow<T>(read: (now: Date) => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const update = () => setValue(read(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [read]);
  return value;
}

/**
 * "Jetzt geöffnet · bis 20:00", "Geschlossen · öffnet Freitag 14:00".
 *
 * The built page carries a neutral "Opening hours" in the same box, so there
 * is real text for a reader without script and nothing jumps when the answer
 * arrives. A built-in guess would be wrong for most of the hours it is served.
 */
export function OpenStatus({
  dayNames,
  clocks,
}: {
  /** Monday first, in the page's language. */
  dayNames: readonly string[];
  /** "16:00" → the same time in the page's digits. */
  clocks: Record<string, string>;
}) {
  const t = useTranslations('contact.status');
  const status = useNow<HouseStatus>(houseStatus);
  const state = status?.state ?? 'default';

  let text = t('default');
  if (status?.state === 'open') text = t('open', { time: clocks[status.close] ?? status.close });
  if (status?.state === 'programme') text = t('programme');
  if (status?.state === 'closed' && status.opensAt) {
    const time = clocks[status.opensAt] ?? status.opensAt;
    text =
      status.inDays === 0
        ? t('closedToday', { time })
        : status.inDays === 1
          ? t('closedTomorrow', { time })
          : t('closedDay', { day: dayNames[status.opensDay - 1] ?? '', time });
  }

  return (
    <div className="contact-status" data-state={state}>
      <p role="status" className="contact-status-chip">
        <span className="contact-status-dot" aria-hidden="true" />
        {text}
      </p>
      {state === 'programme' ? (
        <Link href="/events" className="contact-status-link">
          {t('seeEvents')}
          <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
        </Link>
      ) : null}
    </div>
  );
}

export interface HoursRow {
  days: readonly number[];
  label: string;
  /** Null when the day runs by programme. */
  time: string | null;
}

const today = (now: Date) => viennaNow(now).day;

/** The opening hours as a small table, today's row marked. */
export function HoursTable({ rows, byProgramme }: { rows: HoursRow[]; byProgramme: string }) {
  const t = useTranslations('contact');
  const day = useNow(today);
  return (
    <dl className="contact-dl contact-hours">
      {rows.map((row) => {
        const isToday = day !== null && row.days.includes(day);
        return (
          <div key={row.days.join()} className="contact-dl-row" data-today={isToday || undefined}>
            <dt>
              {row.label}
              {isToday ? <span className="visually-hidden"> ({t('today')})</span> : null}
            </dt>
            <dd className="tabular">
              {row.time ?? (
                <span className="contact-dd-split">
                  <span>{byProgramme}</span>
                  <Link href="/events" className="contact-inline-link">
                    {t('byProgrammeLink')}
                    <ArrowRight size={14} weight="bold" aria-hidden="true" className="mirror" />
                  </Link>
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Copies the address and says so, for two seconds. */
export function CopyAddress({ value }: { value: string }) {
  const t = useTranslations('contact');
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className="contact-copy"
        aria-label={t('copyAddress')}
        title={t('copyAddress')}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? (
          <Check size={22} weight="bold" aria-hidden="true" />
        ) : (
          <Copy size={22} weight="duotone" aria-hidden="true" />
        )}
      </button>
      <span role="status" className="contact-toast" data-show={copied || undefined}>
        {copied ? t('copied') : ''}
      </span>
    </>
  );
}

const ROUTE_WEB = `https://www.google.com/maps/dir/?api=1&destination=${FACTS.latitude},${FACTS.longitude}`;
const ROUTE_APPLE = `maps://?daddr=${FACTS.latitude},${FACTS.longitude}`;

/**
 * Directions to the house: Google Maps on the web, Apple Maps on an iPhone or
 * iPad, where `maps://` opens the app the phone already has.
 */
export function RouteLink({ className, children }: { className?: string; children: ReactNode }) {
  const [href, setHref] = useState(ROUTE_WEB);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/.test(ua) || ipad) setHref(ROUTE_APPLE);
  }, []);
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
/** The live mosaic's size: enough to cover the frame at any width it takes. */
const LIVE_W = 1024;
const LIVE_H = 768;

/**
 * The street around the house: a picture rendered once from OpenStreetMap,
 * swapped for the live tiles only when the visitor asks — until then the
 * browser makes no request to a third party.
 */
export function ContactMap({
  label,
  hasImage,
  children,
}: {
  label: string;
  hasImage: boolean;
  /** The actions under the map; the load button joins them. */
  children: ReactNode;
}) {
  const t = useTranslations('contact');
  const [live, setLive] = useState(false);
  const tiles = live
    ? tilesFor({ latitude: FACTS.latitude, longitude: FACTS.longitude }, 17, LIVE_W, LIVE_H)
    : [];
  return (
    <>
      <div className="contact-map-frame" role="img" aria-label={label}>
        {live ? (
          <div className="contact-map-live" style={{ width: LIVE_W, height: LIVE_H }}>
            {tiles.map((tile) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
                alt=""
                width={256}
                height={256}
                decoding="async"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}
          </div>
        ) : hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="contact-map-img"
            src={`${BASE}/map-contact@1x.webp`}
            srcSet={`${BASE}/map-contact@1x.webp 800w, ${BASE}/map-contact@2x.webp 1600w`}
            alt=""
            width={800}
            height={500}
            sizes="(min-width: 1024px) 680px, 100vw"
            decoding="async"
          />
        ) : null}
        <svg className="contact-map-pin" viewBox="0 0 32 44" aria-hidden="true">
          <path d="M16 2C8.3 2 2 8.2 2 15.9 2 26.4 16 42 16 42s14-15.6 14-26.1C30 8.2 23.7 2 16 2Z" />
          <circle cx="16" cy="16" r="5" />
        </svg>
      </div>
      <div className="contact-map-actions">
        {children}
        {live ? null : (
          <button
            type="button"
            className="contact-text-link"
            onClick={() => setLive(true)}
            title={t('loadMapNote')}
          >
            {t('loadMap')}
            <span className="visually-hidden"> — {t('loadMapNote')}</span>
          </button>
        )}
      </div>
    </>
  );
}
