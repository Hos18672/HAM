'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretLeft, CaretRight, StarFour } from '@phosphor-icons/react/dist/ssr';
import { digits, formatDate, formatDay } from '@/lib/i18n/format';
import {
  buildCalendarMonth,
  nextMonth,
  previousMonth,
  type CalendarCell,
  type DayEntry,
} from '@/lib/calendar';
import { HOLIDAYS } from '@/lib/holidays';
import { HIJRI_MONTHS } from '@/lib/hijri';
import { persianMonthName, toPersianDate } from '@/lib/persian-date';
import type { CivilKey } from '@/lib/civil-days';
import type { EventEntry, Occasion } from '@/lib/db/queries/content';
import type { Locale } from '@/lib/i18n/config';
import { Agenda, viennaIso } from './events-mobile';

/** What a day can hold, and what the chips filter on. */
type Kind = 'islamic' | 'ir' | 'at' | 'events';
const KINDS: Kind[] = ['islamic', 'ir', 'at', 'events'];
const KIND_LABEL: Record<Kind, string> = {
  islamic: 'calIslamic',
  ir: 'calIran',
  at: 'calEurope',
  events: 'calEvents',
};

const kindOf = (entry: DayEntry): Kind => entry.country ?? 'islamic';

const persianOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return toPersianDate(new Date(Date.UTC(y, m - 1, d, 12)));
};

/**
 * The calendar on a phone, a page of its own: one month with the Gregorian,
 * lunar Hijri and Solar Hijri dates of every day, and everything the house
 * marks on them — the Islamic commemorations, Iran's and Austria's public
 * holidays and days to know, and the house's own events. Chips narrow it to
 * one kind; a dot under the day says which kinds it holds, and a day off is
 * printed in red.
 *
 * Under the grid, the chosen day in all three calendars with what falls on
 * it, then the whole month as a list.
 */
export function CalendarMobile({
  events,
  occasions,
  todayIso,
  locale,
}: {
  events: EventEntry[];
  occasions: Occasion[];
  todayIso: string;
  locale: Locale;
}) {
  const t = useTranslations('prayer');
  const tApp = useTranslations('app');
  const tEvents = useTranslations('events');
  const [ty, tm] = todayIso.split('-').map(Number) as [number, number];
  const [shown, setShown] = useState({ year: ty, month: tm });
  const [selected, setSelected] = useState(todayIso);
  const [kind, setKind] = useState<Kind | null>(null);

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
  const civilText = useMemo(
    () => (key: CivilKey) => ({
      name: t(`civil.${key}.name`),
      note: t.has(`civil.${key}.note`) ? t(`civil.${key}.note`) : '',
    }),
    [t],
  );
  const month = useMemo(
    () => buildCalendarMonth(shown.year, shown.month, occasions, todayIso, fallback, civilText),
    [shown, occasions, todayIso, fallback, civilText],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, EventEntry[]>();
    for (const event of events) {
      const iso = viennaIso(event.startsAt);
      map.set(iso, [...(map.get(iso) ?? []), event]);
    }
    return map;
  }, [events]);

  const label = (c: string) => (tEvents.has(`category.${c}`) ? tEvents(`category.${c}`) : c);
  const wants = (k: Kind) => kind === null || kind === k;
  const entriesOf = (cell: CalendarCell) => cell.occasions.filter((o) => wants(kindOf(o)));
  const eventsOf = (iso: string) => (wants('events') ? (byDay.get(iso) ?? []) : []);
  const kindsOf = (cell: CalendarCell) => {
    const found = new Set<Kind>(entriesOf(cell).map(kindOf));
    if (eventsOf(cell.iso!).length > 0) found.add('events');
    return KINDS.filter((k) => found.has(k));
  };

  const title = formatDate(new Date(Date.UTC(shown.year, shown.month - 1, 15, 12)), locale, {
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  });
  const cells = month.cells.filter((c) => c.iso);
  const hijri = Array.from(new Set(cells.map((c) => HIJRI_MONTHS[locale][c.hijri!.month])));
  const hijriYear = digits(cells[cells.length - 1]!.hijri!.year, locale);
  const persian = Array.from(
    new Set(cells.map((c) => persianMonthName(persianOf(c.iso!).month, locale))),
  );
  const persianYear = digits(persianOf(cells[cells.length - 1]!.iso!).year, locale);

  const chosen = month.cells.find((c) => c.iso === selected) ?? null;
  const weekdays = t.raw('weekdays') as string[];
  const isCurrent = shown.year === ty && shown.month === tm;

  function move(next: { year: number; month: number }) {
    setShown(next);
    const first = `${next.year}-${String(next.month).padStart(2, '0')}-01`;
    setSelected(next.year === ty && next.month === tm ? todayIso : first);
  }

  /** The days of the month that hold something, with what they hold. */
  const listed = cells
    .map((cell) => ({ cell, entries: entriesOf(cell), dayEvents: eventsOf(cell.iso!) }))
    .filter(({ entries, dayEvents }) => entries.length > 0 || dayEvents.length > 0);

  return (
    <div className="a-screen cal-m" style={{ gap: 14 }}>
      <h1 className="cal-m-title">{tApp('calendarTitle')}</h1>
      <p className="a-sub" style={{ fontSize: 14, paddingInline: 4 }}>
        {tApp('calendarLead')}
      </p>

      <div className="a-chips" role="group" aria-label={tApp('calendarTitle')}>
        <button
          type="button"
          className="a-chip"
          aria-pressed={kind === null}
          onClick={() => setKind(null)}
        >
          {tApp('calAll')}
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className="a-chip"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            <span className="cal-m-dot" data-kind={k} aria-hidden="true" />
            {tApp(KIND_LABEL[k])}
          </button>
        ))}
      </div>

      <div className="a-card a-month">
        <div className="a-row" style={{ gap: 8, padding: '0 4px' }}>
          <button
            type="button"
            className="a-circle"
            data-size="40"
            aria-label={t('previousMonth')}
            onClick={() => move(previousMonth(shown))}
          >
            <CaretLeft size={18} weight="bold" aria-hidden="true" className="mirror" />
          </button>
          <span className="a-stack a-grow" style={{ justifyItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--head)' }}>{title}</span>
            <span className="a-sub" style={{ fontSize: 11.5 }}>
              {hijri.join(' – ')} {hijriYear}
            </span>
            <span className="a-sub" style={{ fontSize: 11.5 }}>
              {persian.join(' – ')} {persianYear}
            </span>
          </span>
          <button
            type="button"
            className="a-circle"
            data-size="40"
            aria-label={t('nextMonth')}
            onClick={() => move(nextMonth(shown))}
          >
            <CaretRight size={18} weight="bold" aria-hidden="true" className="mirror" />
          </button>
        </div>
        {isCurrent ? null : (
          <div className="a-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="a-chip" onClick={() => move({ year: ty, month: tm })}>
              {tApp('calToday')}
            </button>
          </div>
        )}
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
                data-off={cell.off.length > 0 || undefined}
                data-friday={i % 7 === 4 || undefined}
                aria-pressed={selected === cell.iso}
                aria-label={formatDay(locale, new Date(`${cell.iso}T12:00:00Z`), 'full')}
                onClick={() => setSelected(cell.iso!)}
              >
                <span className="a-day-n">{digits(cell.gregorianDay, locale)}</span>
                <span className="a-day-h">
                  {locale === 'fa'
                    ? digits(persianOf(cell.iso).day, locale)
                    : digits(cell.hijri!.day, locale)}
                </span>
                <span className="a-day-dots" aria-hidden="true">
                  {kindsOf(cell).map((k) => (
                    <span key={k} className="cal-m-dot" data-kind={k} />
                  ))}
                </span>
              </button>
            ) : (
              <span key={`blank-${i}`} />
            ),
          )}
        </div>
        <p className="cal-m-legend">
          <span>{tApp('calSmallNumber')}</span>
          <span className="cal-m-legend-off">{tApp('calOffLegend')}</span>
        </p>
      </div>

      {chosen ? <DayCard cell={chosen} entries={entriesOf(chosen)} locale={locale} /> : null}
      {chosen && eventsOf(chosen.iso!).length > 0 ? (
        <Agenda
          events={eventsOf(chosen.iso!)}
          todayIso={todayIso}
          locale={locale}
          label={label}
          heading={false}
        />
      ) : null}

      <section className="a-stack" style={{ gap: 8 }} aria-labelledby="cal-m-month">
        <h2 id="cal-m-month" className="a-label">
          {tApp('calThisMonth')}
        </h2>
        {listed.length === 0 ? (
          <p className="a-sub" style={{ fontSize: 14 }}>
            {tApp('calNothingMonth')}
          </p>
        ) : (
          <ul className="a-list cal-m-list">
            {listed.map(({ cell, entries, dayEvents }) => (
              <li key={cell.iso}>
                <button
                  type="button"
                  className="a-list-row cal-m-row"
                  aria-pressed={selected === cell.iso}
                  onClick={() => {
                    setSelected(cell.iso!);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className="cal-m-date" data-off={cell.off.length > 0 || undefined}>
                    <span>{digits(cell.gregorianDay, locale)}</span>
                    <span>
                      {formatDate(new Date(`${cell.iso}T12:00:00Z`), locale, {
                        weekday: 'short',
                        calendar: 'gregory',
                      })}
                    </span>
                  </span>
                  <span className="a-stack a-grow" style={{ gap: 4 }}>
                    {entries.map((o) => (
                      <span key={o.id} className="cal-m-entry">
                        <span className="cal-m-dot" data-kind={kindOf(o)} aria-hidden="true" />
                        <span>
                          {o.name}
                          {o.off ? <span className="cal-m-off"> · {tApp('calDayOff')}</span> : null}
                        </span>
                      </span>
                    ))}
                    {dayEvents.map((e) => (
                      <span key={e.id} className="cal-m-entry">
                        <span className="cal-m-dot" data-kind="events" aria-hidden="true" />
                        <span>{e.title}</span>
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The chosen day: its date in three calendars and what falls on it. */
function DayCard({
  cell,
  entries,
  locale,
}: {
  cell: CalendarCell;
  entries: DayEntry[];
  locale: Locale;
}) {
  const t = useTranslations('prayer');
  const tApp = useTranslations('app');
  const p = persianOf(cell.iso!);
  const date = new Date(`${cell.iso}T12:00:00Z`);
  return (
    <div className="a-sand cal-m-day" aria-live="polite">
      <span
        className="a-ico"
        data-on="white"
        style={{ borderRadius: '50%', color: 'var(--goldInk)' }}
      >
        <StarFour size={22} weight="duotone" aria-hidden="true" />
      </span>
      <span className="a-stack" style={{ gap: 2, minInlineSize: 0 }}>
        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--head)' }}>
          {cell.isToday ? `${tApp('calToday')} · ` : ''}
          {formatDay(locale, date, 'full')}
        </span>
        <span className="cal-m-alt">
          {digits(cell.hijri!.day, locale)} {HIJRI_MONTHS[locale][cell.hijri!.month]}{' '}
          {digits(cell.hijri!.year, locale)}
          {' · '}
          {digits(p.day, locale)} {persianMonthName(p.month, locale)} {digits(p.year, locale)}
        </span>
        {entries.length > 0 ? (
          <ul className="cal-m-day-list">
            {entries.map((o) => (
              <li key={o.id}>
                <span className="cal-m-dot" data-kind={kindOf(o)} aria-hidden="true" />
                <span>
                  <strong>{o.name}</strong>
                  {o.note ? <span className="a-sub"> — {o.note}</span> : null}
                  {o.country ? (
                    <span className="cal-tag" data-off={o.off ? 'true' : undefined}>
                      {o.off ? t(`offIn.${o.country}`) : t(`country.${o.country}`)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="a-sub" style={{ fontSize: 13.5 }}>
            {t('dayNothing')}
          </span>
        )}
      </span>
    </div>
  );
}
