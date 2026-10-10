'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarDots,
  CalendarPlus,
  CaretLeft,
  CaretRight,
  Check,
  ListBullets,
  MapPin,
  StarFour,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits, formatDate, formatDay, formatTime } from '@/lib/i18n/format';
import { buildCalendarMonth, nextMonth, previousMonth, type CalendarCell } from '@/lib/calendar';
import { HOLIDAYS } from '@/lib/holidays';
import { HIJRI_MONTHS } from '@/lib/hijri';
import { persianMonthName, toPersianDate } from '@/lib/persian-date';
import { icsHref } from '@/lib/ics';
import type { EventEntry, Occasion } from '@/lib/db/queries/content';
import type { Locale } from '@/lib/i18n/config';
import { categoryColour } from './event-cover';

type View = 'list' | 'calendar';

const RSVP_KEY = 'ham:rsvp';

/** The Vienna civil date of an instant, as `YYYY-MM-DD`. */
const viennaIso = (date: Date) =>
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
 * The events page on a phone: a list or a month, switched at the top.
 *
 * The list leads with the featured event as a dark card, then everything
 * coming up grouped by day — time, a bar in the category's colour, title,
 * place and tag, and a button that adds it to the phone's calendar. The
 * month shows each day with its Hijri date, dots for its events, today in
 * green and the chosen day ringed; under it the day's occasion and events.
 */
export function EventsMobile({
  events,
  featured,
  occasions,
  todayIso,
  initialView,
  locale,
}: {
  events: EventEntry[];
  featured: EventEntry | null;
  occasions: Occasion[];
  todayIso: string;
  initialView: View;
  locale: Locale;
}) {
  const t = useTranslations('events');
  const tApp = useTranslations('app');
  const [view, setView] = useState<View>(initialView);
  const [category, setCategory] = useState<string | null>(null);

  function choose(next: View) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'calendar') url.searchParams.set('view', 'calendar');
    else url.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', url);
  }

  const categories = useMemo(() => Array.from(new Set(events.map((e) => e.category))), [events]);
  const label = (c: string) => (t.has(`category.${c}`) ? t(`category.${c}`) : c);

  return (
    <div className="a-screen" style={{ gap: 14 }}>
      <h1 className="visually-hidden">{t('upcoming')}</h1>
      <div className="a-seg" role="group" aria-label={tApp('viewAs')}>
        <button type="button" aria-pressed={view === 'list'} onClick={() => choose('list')}>
          <span className="a-row" style={{ gap: 6 }}>
            <ListBullets size={18} weight="duotone" aria-hidden="true" />
            {tApp('viewList')}
          </span>
        </button>
        <button type="button" aria-pressed={view === 'calendar'} onClick={() => choose('calendar')}>
          <span className="a-row" style={{ gap: 6 }}>
            <CalendarDots size={18} weight="duotone" aria-hidden="true" />
            {tApp('viewCalendar')}
          </span>
        </button>
      </div>

      {view === 'list' ? (
        <>
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
        </>
      ) : (
        <MonthView
          events={events}
          occasions={occasions}
          todayIso={todayIso}
          locale={locale}
          label={label}
        />
      )}
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
        <span className="a-dark-dim" style={{ fontSize: 12.5 }}>
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
          <span className="a-dark-dim" style={{ fontSize: 13 }}>
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
function Agenda({
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
      <p className="a-sub" style={{ fontSize: 14 }}>
        {t('none')}
      </p>
    );

  return (
    <div className="a-stack" style={{ gap: 14 }}>
      {groups.map(([iso, list]) => (
        <section key={iso} className="a-stack" style={{ gap: 8 }}>
          {heading ? (
            <h2 className="a-label" style={{ fontSize: 14, fontWeight: 800 }}>
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
                  <span className="a-title" style={{ fontSize: 15.5 }}>
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

/** The month: a grid of days with Hijri dates and event dots, and the chosen day below. */
function MonthView({
  events,
  occasions,
  todayIso,
  locale,
  label,
}: {
  events: EventEntry[];
  occasions: Occasion[];
  todayIso: string;
  locale: Locale;
  label: (c: string) => string;
}) {
  const t = useTranslations('prayer');
  const tApp = useTranslations('app');
  const [ty, tm] = todayIso.split('-').map(Number) as [number, number];
  const [shown, setShown] = useState({ year: ty, month: tm });
  const [selected, setSelected] = useState(todayIso);

  const fallback = useMemo(
    () =>
      HOLIDAYS.map(({ key, hijriMonth, hijriDay }) => ({
        id: `holiday-${key}`,
        hijriMonth,
        hijriDay,
        name: t(`holidays.${key}.name`),
        note: t(`holidays.${key}.note`),
      })),
    [t],
  );
  const month = useMemo(
    () => buildCalendarMonth(shown.year, shown.month, occasions, todayIso, fallback),
    [shown, occasions, todayIso, fallback],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, EventEntry[]>();
    for (const event of events) {
      const iso = viennaIso(event.startsAt);
      map.set(iso, [...(map.get(iso) ?? []), event]);
    }
    return map;
  }, [events]);

  const title = formatDate(new Date(Date.UTC(shown.year, shown.month - 1, 15, 12)), locale, {
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  });
  const cells = month.cells.filter((c) => c.iso);
  const hijri = Array.from(new Set(cells.map((c) => `${HIJRI_MONTHS[locale][c.hijri!.month]}`)));
  const hijriYear = digits(cells[cells.length - 1]!.hijri!.year, locale);
  const persian = Array.from(
    new Set(
      cells.map((c) => {
        const [y, m, d] = c.iso!.split('-').map(Number) as [number, number, number];
        const p = toPersianDate(new Date(Date.UTC(y, m - 1, d, 12)));
        return `${persianMonthName(p.month, locale)}`;
      }),
    ),
  );
  const subtitle = `${hijri.join(' – ')} ${hijriYear} · ${persian.join(' – ')}`;

  const chosen = month.cells.find((c) => c.iso === selected);
  const chosenEvents = byDay.get(selected) ?? [];
  const weekdays = t.raw('weekdays') as string[];

  function dots(cell: CalendarCell) {
    const list = byDay.get(cell.iso!) ?? [];
    return Array.from(new Set(list.map((e) => categoryColour(e.category)))).slice(0, 3);
  }

  return (
    <>
      <div className="a-card a-month">
        <div className="a-row" style={{ gap: 8, padding: '0 4px' }}>
          <button
            type="button"
            className="a-circle"
            data-size="40"
            aria-label={t('previousMonth')}
            onClick={() => setShown(previousMonth(shown))}
          >
            <CaretLeft size={18} weight="bold" aria-hidden="true" className="mirror" />
          </button>
          <span className="a-stack a-grow" style={{ justifyItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--head)' }}>{title}</span>
            <span className="a-sub" style={{ fontSize: 11.5 }}>
              {subtitle}
            </span>
          </span>
          <button
            type="button"
            className="a-circle"
            data-size="40"
            aria-label={t('nextMonth')}
            onClick={() => setShown(nextMonth(shown))}
          >
            <CaretRight size={18} weight="bold" aria-hidden="true" className="mirror" />
          </button>
        </div>
        <div className="a-month-grid" role="grid" aria-label={title}>
          {weekdays.map((w, i) => (
            <span
              key={w}
              className="a-month-wd"
              data-friday={i === 4 || undefined}
              role="columnheader"
            >
              {w}
            </span>
          ))}
          {month.cells.map((cell, i) =>
            cell.iso ? (
              <button
                key={cell.iso}
                type="button"
                className="a-day"
                data-today={cell.isToday || undefined}
                data-occasion={cell.occasions.length > 0 || undefined}
                data-friday={i % 7 === 4 || undefined}
                aria-pressed={selected === cell.iso}
                aria-label={formatDay(locale, new Date(`${cell.iso}T12:00:00Z`), 'full')}
                onClick={() => setSelected(cell.iso!)}
              >
                <span className="a-day-n">{digits(cell.gregorianDay, locale)}</span>
                <span className="a-day-h">{digits(cell.hijri!.day, locale)}</span>
                <span className="a-day-dots" aria-hidden="true">
                  {dots(cell).map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
              </button>
            ) : (
              <span key={`blank-${i}`} />
            ),
          )}
        </div>
      </div>

      {chosen?.occasions.length ? (
        <div className="a-sand a-row" style={{ padding: '14px 16px', gap: 12 }}>
          <span
            className="a-ico"
            data-on="white"
            style={{ borderRadius: '50%', color: 'var(--goldInk)' }}
          >
            <StarFour size={22} weight="duotone" aria-hidden="true" />
          </span>
          <span className="a-stack">
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--goldInk)' }}>
              {formatDay(locale, new Date(`${chosen.iso}T12:00:00Z`), 'weekday')} ·{' '}
              {digits(chosen.hijri!.day, locale)} {HIJRI_MONTHS[locale][chosen.hijri!.month]}
            </span>
            {chosen.occasions.map((o) => (
              <span key={o.id} style={{ fontSize: 16, fontWeight: 800, color: 'var(--head)' }}>
                {o.name}
              </span>
            ))}
          </span>
        </div>
      ) : null}

      {chosenEvents.length ? (
        <Agenda
          events={chosenEvents}
          todayIso={todayIso}
          locale={locale}
          label={label}
          heading={false}
        />
      ) : (
        <p className="a-sub" style={{ fontSize: 14, paddingInline: 6 }}>
          {tApp('dayEmpty')}
        </p>
      )}
    </>
  );
}
