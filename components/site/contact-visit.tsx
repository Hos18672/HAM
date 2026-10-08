'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, Copy } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { houseStatus, viennaNow, FACTS, type HouseStatus } from '@/lib/site-facts';

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

// By address, not by coordinates: the map app then routes to the building's
// own entrance rather than to a point that may sit in the next street.
const DESTINATION = encodeURIComponent(FACTS.mapQuery);
const ROUTE_WEB = `https://www.google.com/maps/dir/?api=1&destination=${DESTINATION}`;
const ROUTE_APPLE = `maps://?daddr=${DESTINATION}`;

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

/** Google's embeddable map of the address, in the reader's language. */
function googleEmbed(locale: string) {
  return `https://www.google.com/maps?q=${DESTINATION}&hl=${locale}&z=17&output=embed`;
}

/**
 * The street around the house: a picture rendered once from OpenStreetMap
 * and served from our own server, swapped for Google Maps only when the
 * visitor asks. Until that click the browser makes no request to Google —
 * an embedded Google map sets cookies and reports the visit, which is not
 * something to do to everyone who opens the page.
 */
export function ContactMap({
  label,
  hasImage,
  frameClassName = 'contact-map-frame',
  children,
}: {
  label: string;
  hasImage: boolean;
  /** The frame's look: the contact page's, or the home page's. */
  frameClassName?: string;
  /** The actions under the map; the load button joins them. */
  children: ReactNode;
}) {
  const t = useTranslations('contact');
  const locale = useLocale();
  const [live, setLive] = useState(false);
  return (
    <>
      {/* No role="img" on the frame: the load button lives in it, and a
          button inside an image is a control a screen reader cannot reach.
          The picture carries the label instead. */}
      <div className={frameClassName} data-live={live || undefined}>
        {live ? (
          <iframe
            className="map-embed"
            src={googleEmbed(locale)}
            title={label}
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <>
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="contact-map-img"
                src={`${BASE}/map-contact@1x.webp`}
                srcSet={`${BASE}/map-contact@1x.webp 800w, ${BASE}/map-contact@2x.webp 1600w`}
                alt={label}
                width={800}
                height={500}
                sizes="(min-width: 1024px) 680px, 100vw"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="visually-hidden">{label}</span>
            )}
            <svg className="contact-map-pin" viewBox="0 0 32 44" aria-hidden="true">
              <path d="M16 2C8.3 2 2 8.2 2 15.9 2 26.4 16 42 16 42s14-15.6 14-26.1C30 8.2 23.7 2 16 2Z" />
              <circle cx="16" cy="16" r="5" />
            </svg>
            {/* The picture itself is the button too: a map invites a tap. */}
            <button type="button" className="map-load" onClick={() => setLive(true)}>
              <span className="map-load-pill">{t('loadMap')}</span>
              <span className="visually-hidden"> — {t('loadMapNote')}</span>
            </button>
          </>
        )}
      </div>
      <div className="contact-map-actions">
        {children}
        {live ? null : <p className="map-load-note">{t('loadMapNote')}</p>}
      </div>
    </>
  );
}
