'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarDots,
  CalendarPlus,
  CaretRight,
  Check,
  MapPin,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits, formatDate, formatDay, formatTime } from '@/lib/i18n/format';
import { icsHref } from '@/lib/ics';
import type { EventEntry } from '@/lib/db/queries/content';
import type { Locale } from '@/lib/i18n/config';
import { categoryColour } from './event-cover';

const RSVP_KEY = 'ham:rsvp';

/** The Vienna civil date of an instant, as `YYYY-MM-DD`. */
export const viennaIso = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

/** Whole days from today to an ISO date, both read in Vienna. */
function daysUntil(iso: string, todayIso: string) {
  const at = (s: string) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((at(iso) - at(todayIso)) / 86_400_000);
}

/**
 * The events page on a phone. A link to the calendar, which has a page of
 * its own, then the featured event as a dark card and everything coming up
 * grouped by day — time, a bar in the category's colour, title, place and
 * tag, and a button that adds it to the phone's calendar.
 */
export function EventsMobile({
  events,
  featured,
  todayIso,
  locale,
}: {
  events: EventEntry[];
  featured: EventEntry | null;
  todayIso: string;
  locale: Locale;
}) {
  const t = useTranslations('events');
  const tApp = useTranslations('app');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(events.map((e) => e.category))), [events]);
  const label = (c: string) => (t.has(`category.${c}`) ? t(`category.${c}`) : c);

  return (
    <div className="a-screen" style={{ gap: 14 }}>
      <h1 className="visually-hidden">{t('upcoming')}</h1>
      <Link href="/calendar" className="a-card a-row a-press ev-cal-link">
        <span className="a-ico">
          <CalendarDots size={22} weight="duotone" aria-hidden="true" />
        </span>
        <span className="a-grow" style={{ fontWeight: 700 }}>
          {tApp('calOpenCalendar')}
        </span>
        <CaretRight size={14} weight="bold" aria-hidden="true" className="a-muted mirror" />
      </Link>

      {categories.length > 1 ? (
        <div className="a-chips" role="group" aria-label={t('filterByCategory')}>
          <button
            type="button"
            className="a-chip"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            {tApp('all')}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="a-chip"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {label(c)}
            </button>
          ))}
        </div>
      ) : null}
      {featured && (category === null || featured.category === category) ? (
        <FeaturedCard event={featured} todayIso={todayIso} locale={locale} label={label} />
      ) : null}
      <Agenda
        events={events.filter(
          (e) => e.id !== featured?.id && (category === null || e.category === category),
        )}
        todayIso={todayIso}
        locale={locale}
        label={label}
      />
    </div>
  );
}

/** The featured event: date block, title, time and place, and "I'll come". */
function FeaturedCard({
  event,
  todayIso,
  locale,
  label,
}: {
  event: EventEntry;
  todayIso: string;
  locale: Locale;
  label: (c: string) => string;
}) {
  const tApp = useTranslations('app');
  const [going, setGoing] = useState(false);

  // An RSVP is kept on this device only: there is no list of guests to add to.
  useEffect(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem(RSVP_KEY) ?? '[]') as unknown;
      setGoing(Array.isArray(list) && list.includes(event.slug));
    } catch {
      setGoing(false);
    }
  }, [event.slug]);

  function toggle() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(RSVP_KEY) ?? '[]') as unknown;
      const list = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
      const next = going ? list.filter((s) => s !== event.slug) : [...list, event.slug];
      window.localStorage.setItem(RSVP_KEY, JSON.stringify(next));
    } catch {
      // Not kept; the button still answers for this visit.
    }
    setGoing((g) => !g);
  }

  const days = daysUntil(viennaIso(event.startsAt), todayIso);
  return (
    <article className="a-dark a-featured a-rise">
      <div className="a-row" style={{ gap: 8 }}>
        <span className="a-tag a-tag-gold">
          {tApp('featured')} · {label(event.category)}
        </span>
        <span className="a-dark-dim" style={{ fontSize: 'calc(12.5px * var(--a-fs))' }}>
          {days <= 0
            ? tApp('today')
            : days === 1
              ? tApp('tomorrow')
              : tApp('inDays', { n: digits(days, locale) })}
        </span>
      </div>
      <Link href={`/events/${event.slug}`} className="a-row a-featured-main">
        <span className="a-featured-date">
          <span>{formatDate(event.startsAt, locale, { day: 'numeric' })}</span>
          <span>{formatDate(event.startsAt, locale, { month: 'long' })}</span>
        </span>
        <span className="a-stack">
          <span className="a-featured-title">{event.title}</span>
          <span className="a-dark-dim" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
            {formatDay(locale, event.startsAt, 'weekday').split(/[ ,]/)[0]}{' '}
            {formatTime(event.startsAt, locale)}
            {event.location ? ` · ${event.location}` : ''}
          </span>
        </span>
      </Link>
      <div className="a-row" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="a-btn a-btn-paper"
          aria-pressed={going}
          onClick={toggle}
          data-size="40"
        >
          {going ? tApp('going') : tApp('goingAsk')}
          {going ? <Check size={16} weight="bold" aria-hidden="true" /> : null}
        </button>
      </div>
    </article>
  );
}

/** Events grouped by day, each as a row with a colour bar and a calendar button. */
export function Agenda({
  events,
  todayIso,
  locale,
  label,
  heading = true,
}: {
  events: EventEntry[];
  todayIso: string;
  locale: Locale;
  label: (c: string) => string;
  heading?: boolean;
}) {
  const t = useTranslations('events');
  const tApp = useTranslations('app');
  const groups = useMemo(() => {
    const map = new Map<string, EventEntry[]>();
    for (const event of events) {
      const iso = viennaIso(event.startsAt);
      map.set(iso, [...(map.get(iso) ?? []), event]);
    }
    return Array.from(map.entries());
  }, [events]);

  if (events.length === 0)
    return (
      <p className="a-sub" style={{ fontSize: 'calc(14px * var(--a-fs))' }}>
        {t('none')}
      </p>
    );

  return (
    <div className="a-stack" style={{ gap: 14 }}>
      {groups.map(([iso, list]) => (
        <section key={iso} className="a-stack" style={{ gap: 8 }}>
          {heading ? (
            <h2
              className="a-label"
              style={{ fontSize: 'calc(14px * var(--a-fs))', fontWeight: 800 }}
            >
              {iso === todayIso ? `${tApp('today')} · ` : ''}
              {formatDay(locale, list[0]!.startsAt, 'weekday')}
            </h2>
          ) : null}
          {list.map((event) => (
            <div key={event.id} className="a-card a-agenda-row">
              <Link href={`/events/${event.slug}`} className="a-agenda-link">
                <span className="a-agenda-time">
                  <span>{formatTime(event.startsAt, locale)}</span>
                  {event.endsAt ? <span>{formatTime(event.endsAt, locale)}</span> : null}
                </span>
                <span
                  className="a-agenda-bar"
                  style={{ background: categoryColour(event.category) }}
                  aria-hidden="true"
                />
                <span className="a-stack a-grow">
                  <span className="a-title" style={{ fontSize: 'calc(15.5px * var(--a-fs))' }}>
                    {event.title}
                  </span>
                  <span className="a-agenda-meta">
                    {event.location ? (
                      <span className="a-row" style={{ gap: 3 }}>
                        <MapPin size={14} weight="duotone" aria-hidden="true" />
                        {event.location}
                      </span>
                    ) : null}
                    <span className="a-tag" data-size="s">
                      {label(event.category)}
                    </span>
                  </span>
                </span>
              </Link>
              <a
                className="a-circle"
                data-size="40"
                href={icsHref(event)}
                download={`${event.slug}.ics`}
                aria-label={`${t('addToCalendar')}: ${event.title}`}
              >
                <CalendarPlus size={19} weight="duotone" aria-hidden="true" />
              </a>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
