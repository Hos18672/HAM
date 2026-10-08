'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { digits, formatDate, formatDay } from '@/lib/i18n/format';
import { HIJRI_MONTHS } from '@/lib/hijri';
import { toPersianDate, persianMonthName } from '@/lib/persian-date';
import { localTimetable } from '@/lib/prayer-local';
import { VIENNA } from '@/lib/prayer-times';
import { placeKey, placeOf, usePrayerPlace } from '@/lib/prayer-place';
import { buildCalendarMonth, previousMonth, nextMonth } from '@/lib/calendar';
import { HOLIDAYS } from '@/lib/holidays';
import type { CalendarMonth } from '@/lib/calendar';
import type { Occasion } from '@/lib/db/queries/content';
import type { Timetable } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { PrayerTimetable } from './prayer-timetable';

/** The preview's `/HAM` prefix, empty everywhere else. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

type TimetableEntry = Timetable | 'loading' | 'failed';
const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${month}`;

/**
 * The month calendar, showing the Gregorian and Hijri day numbers side by
 * side, with the month's occasions listed beside it.
 *
 * Markers, per the design, and carried on the cell itself rather than on
 * something drawn inside it: today takes a gold ring, an occasion day takes a
 * gold ring *and* a gold tint. Neither marker is left to the colour alone —
 * the cell also carries the occasion's name and the word "today" in text, and
 * the legend under the grid names both.
 *
 * Moving a month happens here, not on the server. It used to be a link to
 * `?y=&m=`, which is a real navigation: the whole route re-rendered — prayer
 * times, page head, footer and all — to change which twelve numbers are in a
 * grid. Everything the calendar needs is arithmetic plus the occasions list,
 * which is month-independent and arrives once, so the browser can build any
 * month itself. The URL is kept in step with `replaceState` so the month is
 * still shareable and still survives a language switch, and nothing else on
 * the page re-renders.
 *
 * The one thing fetched on a move is the month's prayer times, for the
 * timetable under the grid (`/api/prayer/month`, cached for a day). The days
 * the site marks beyond the editors' own (see `lib/holidays`) are Hijri dates
 * like theirs, so they need nothing fetched and are right on the preview too.
 */
export function HijriCalendar({
  initialMonth,
  initialTimetable,
  currentMonth,
  occasions,
  todayIso,
  locale,
  basePath,
}: {
  initialMonth: CalendarMonth;
  /** The first month's prayer times, fetched with the page. */
  initialTimetable: Timetable;
  /** The month "today" falls in, which is where the Today button goes back to
   *  — not necessarily the month the page opened on. */
  currentMonth: { year: number; month: number };
  /** Every occasion, keyed by Hijri date — the same list serves every month. */
  occasions: Occasion[];
  todayIso: string;
  locale: Locale;
  /** Locale-prefixed, e.g. `/de/prayer`: this writes the address bar itself. */
  basePath: string;
}) {
  const t = useTranslations('prayer');
  const weekdays = t.raw('weekdays') as string[];

  const [{ year, month }, setShown] = useState({
    year: initialMonth.year,
    month: initialMonth.month,
  });

  // The table is for the same place as the times above it: Vienna's months
  // come from the server, any other place's are worked out here.
  const { choice } = usePrayerPlace();
  const where = placeKey(choice);
  const elsewhere = placeOf(choice);

  const [timetables, setTimetables] = useState<Record<string, TimetableEntry>>(() => ({
    [`house|${monthKey(initialTimetable)}`]: initialTimetable,
  }));
  const entry = timetables[`${where}|${monthKey({ year, month })}`];
  const timetable = typeof entry === 'object' ? entry : null;

  // Fetch a month's times the first time it is shown; each is kept after.
  useEffect(() => {
    const key = `${where}|${monthKey({ year, month })}`;
    if (timetables[key] !== undefined) return;
    if (elsewhere) {
      setTimetables((all) => ({ ...all, [key]: localTimetable(year, month, elsewhere) }));
      return;
    }
    setTimetables((all) => ({ ...all, [key]: 'loading' }));
    fetch(`/api/prayer/month?y=${year}&m=${month}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Timetable>;
      })
      .then((data) => setTimetables((all) => ({ ...all, [key]: data })))
      .catch(() =>
        // No route to ask — the static preview has no server — or it said
        // no. The month is arithmetic either way, so it is worked out here
        // rather than shown as a failure: without this every month but the
        // one the page was built with came back empty.
        setTimetables((all) => ({ ...all, [key]: localTimetable(year, month, VIENNA) })),
      );
    // `where` stands for `elsewhere`, which is a new object on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, timetables, where]);

  // The days the site keeps outside the database (`lib/holidays`), as
  // occasions the grid can match on the Hijri date like any other.
  const holidayOccasions = useMemo(
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

  const shown = useMemo(
    () => buildCalendarMonth(year, month, occasions, todayIso, holidayOccasions),
    [year, month, occasions, todayIso, holidayOccasions],
  );

  const occasionDays = useMemo(() => {
    const days = new Map<string, string[]>();
    for (const cell of shown.cells) {
      if (cell.iso && cell.occasions.length > 0) {
        days.set(
          cell.iso,
          cell.occasions.map((o) => o.name),
        );
      }
    }
    return days;
  }, [shown]);

  /** Move, and leave the address bar telling the truth. */
  function go(next: { year: number; month: number }) {
    if (next.year === year && next.month === month) return;
    setShown(next);
    // With the deployment's base path in front. Without it, on the preview
    // (served under `/HAM`) the address bar left the site: the router read
    // that as a different page, and the page transition, keyed on the path,
    // remounted the whole page to change the numbers in one grid.
    const path = `${BASE_PATH}${basePath}`;
    const url =
      next.year === currentMonth.year && next.month === currentMonth.month
        ? path
        : `${path}?y=${next.year}&m=${next.month}`;
    window.history.replaceState(window.history.state, '', url);
  }

  const previous = previousMonth({ year, month });
  const next = nextMonth({ year, month });

  /**
   * The civil month, and it has to say `gregory` out loud.
   *
   * `fa-IR` resolves to the Persian calendar by default, so for a Persian
   * reader this line has always been the Solar Hijri month wearing the label
   * of the Gregorian one — while a German reader never saw the Solar Hijri
   * month at all. Both months are named below, each as itself.
   */
  const monthLabel = formatDate(new Date(Date.UTC(shown.year, shown.month - 1, 15, 12)), locale, {
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  });

  // The Hijri months this Gregorian month straddles — usually two.
  const hijriMonths = Array.from(
    new Set(shown.cells.filter((cell) => cell.hijri).map((cell) => cell.hijri!.month)),
  );
  const hijriLabel = hijriMonths.map((m) => HIJRI_MONTHS[locale][m] ?? '').join(' / ');

  /**
   * And the Solar Hijri months it straddles, which is the calendar half this
   * community counts its own life in. Worked out from the platform's Persian
   * calendar, not from an API: `lib/persian-date` says why.
   *
   * Read at noon UTC of each day so the month a day belongs to never depends
   * on the hour the page happens to be rendered at.
   */
  const persianLabel = useMemo(() => {
    const seen: string[] = [];
    for (const cell of shown.cells) {
      if (!cell.iso) continue;
      const [cy, cm, cd] = cell.iso.split('-').map(Number) as [number, number, number];
      const { month: pm, year: py } = toPersianDate(new Date(Date.UTC(cy, cm - 1, cd, 12)));
      const label = `${persianMonthName(pm, locale)} ${digits(py, locale)}`;
      if (!seen.includes(label)) seen.push(label);
    }
    return seen.join(' / ');
  }, [shown, locale]);

  /**
   * The day whose detail is open underneath the grid. Today when today is in
   * the month being shown, and otherwise nothing: a month you have paged to
   * has no day that is more yours than the others, and opening one at random
   * would only be something else to close.
   */
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  useEffect(() => {
    const today = shown.cells.find((cell) => cell.isToday);
    setSelectedIso(today?.iso ?? null);
  }, [shown]);

  const selected = selectedIso
    ? (shown.cells.find((cell) => cell.iso === selectedIso) ?? null)
    : null;
  const selectedPersian = selectedIso
    ? (() => {
        const [cy, cm, cd] = selectedIso.split('-').map(Number) as [number, number, number];
        const p = toPersianDate(new Date(Date.UTC(cy, cm - 1, cd, 12)));
        return `${locale === 'fa' ? digits(p.day, locale) : `${p.day}.`} ${persianMonthName(p.month, locale)} ${digits(p.year, locale)}`;
      })()
    : null;

  // Two pieces, placed by the page's own grid: the calendar beside the
  // day's times, and the month's table across the full width under both.
  return (
    <>
      <section className="prayer-cal" aria-labelledby="prayer-cal-title">
        {/* The heading and the month controls share a row, as the design has
            them. The heading has to be allowed to shrink for that: at 30px
            the Hijri month plus the three controls came to more than the
            column is wide, so the controls wrapped onto a line of their own
            and ended up floating between the heading and the grid. */}
        <div className="flex flex-wrap items-baseline gap-3">
          <div style={{ flex: '1 1 12rem', minInlineSize: 0 }}>
            {/* The design leads with the Hijri month and keeps the Gregorian
                one under it: this is the Hijri calendar, shown against the
                civil month rather than the other way round. */}
            <p className="kicker kicker-led" style={{ color: 'var(--color-accent-2-text)' }}>
              {t('calendar')}
            </p>
            {/* Both months in the one heading, the Hijri one set large.

                They read as two lines and the design's emphasis is
                unchanged, but the civil month stays part of the heading
                rather than becoming a caption beside it: it is the month the
                arrows move through and the month the URL names, so it has to
                be findable by a reader moving between headings. */}
            <h2
              id="prayer-cal-title"
              style={{
                marginBlockStart: 'var(--space-1)',
                fontSize: 'clamp(22px, 2.8vw, 30px)',
                lineHeight: 1.15,
              }}
            >
              {hijriLabel}
              {/* Each month on its own line, and a separator a screen reader
                  hears between them: three month names run together were
                  being read as one long word. */}
              <span className="visually-hidden"> · </span>
              <span
                className="text-sm"
                style={{
                  display: 'block',
                  marginBlockStart: 'var(--space-1)',
                  fontWeight: 'var(--weight-regular)',
                  color: 'var(--color-ink-muted)',
                }}
              >
                <span style={{ display: 'block' }}>{monthLabel}</span>
                {persianLabel ? (
                  // Its own element, not a joined string: a middot between a
                  // Latin and an Arabic-script run lands wherever the bidi
                  // algorithm decides, which in Persian was next to the wrong
                  // number entirely.
                  <>
                    <span className="visually-hidden"> · </span>
                    <span style={{ display: 'block' }}>{persianLabel}</span>
                  </>
                ) : null}
              </span>
            </h2>
          </div>

          {/* Buttons, not links: moving a month is a change of view, not a
              change of page. Arrows are mirrored in RTL by the stylesheet, so
              "previous" always points backwards in reading order. */}
          <div className="nav ms-auto" style={{ flex: '0 0 auto' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label={t('previousMonth')}
              onClick={() => go(previous)}
            >
              <CaretLeft size={16} weight="bold" aria-hidden="true" className="mirror" />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => go(currentMonth)}
            >
              {t('today')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              aria-label={t('nextMonth')}
              onClick={() => go(next)}
            >
              <CaretRight size={16} weight="bold" aria-hidden="true" className="mirror" />
            </button>
          </div>
        </div>

        {/* A real table: the grid is tabular data, and a reader needs the
            column headers with it. `border-spacing` gives the design's gap
            between the cells without a wrapper element per cell. */}
        <table
          className="cal-grid"
          style={{
            marginBlockStart: 'var(--space-3)',
            inlineSize: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 'var(--cal-gap)',
          }}
        >
          <caption className="visually-hidden">
            {t('calendar')}: {hijriLabel} · {monthLabel}
          </caption>
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="kicker"
                  style={{ textAlign: 'center', paddingBlockEnd: 0 }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chunk(shown.cells, 7).map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((cell, dayIndex) => {
                  if (!cell.iso) {
                    return <td key={`blank-${dayIndex}`} />;
                  }
                  const hasOccasion = cell.occasions.length > 0;
                  const iso = cell.iso;
                  return (
                    <td
                      key={iso}
                      style={{ padding: 0 }}
                      aria-current={cell.isToday ? 'date' : undefined}
                    >
                      {/* A day is a button. Reading a grid of two numbers and
                          matching them by eye against a list beside it is the
                          part of this that did not work: now a day can be
                          asked, and answers underneath. */}
                      <button
                        type="button"
                        className="cal-day"
                        data-today={cell.isToday ? 'true' : undefined}
                        data-occ={hasOccasion ? 'true' : undefined}
                        data-on={iso === selectedIso ? 'true' : undefined}
                        aria-pressed={iso === selectedIso}
                        onClick={() => setSelectedIso(iso)}
                      >
                        <span className="tabular cal-day-greg">
                          {digits(cell.gregorianDay, locale)}
                        </span>
                        <span className="tabular cal-day-hij">
                          {cell.hijri ? digits(cell.hijri.day, locale) : ''}
                        </span>
                        {/* The mark a day carries something. A dot rather than
                            a tint alone: the tint is a wash of gold over cream
                            and it is the first thing to go on a bright phone
                            screen held outdoors. */}
                        <span className="cal-day-dot" aria-hidden="true" />
                        {/* Every marker spelled out too, so none of them is
                            carried by colour. */}
                        {cell.isToday ? (
                          <span className="visually-hidden"> — {t('legendToday')}</span>
                        ) : null}
                        {hasOccasion ? (
                          <span className="visually-hidden">
                            {' '}
                            — {t('legendOccasion')}: {cell.occasions.map((o) => o.name).join(', ')}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* What the chosen day is, in all three calendars, and what is on it.

            This is the piece the grid was missing: the cells can only hold
            two numbers, and everything else about a day — the third calendar,
            the weekday, what it commemorates — had to be matched by eye
            against a list in the next column. Now the day says it itself. */}
        {selected ? (
          <div className="cal-detail" aria-live="polite">
            <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
              {selected.isToday ? t('legendToday') : t('chosenDay')}
            </p>
            <p className="cal-detail-date">
              {formatDay(locale, new Date(`${selected.iso}T12:00:00Z`), 'full', {
                calendar: 'gregory',
              })}
            </p>
            {selected.hijri ? (
              <p className="cal-detail-alt">
                {`${locale === 'fa' ? digits(selected.hijri.day, locale) : `${selected.hijri.day}.`} ${HIJRI_MONTHS[locale][selected.hijri.month]} ${digits(selected.hijri.year, locale)}`}
              </p>
            ) : null}
            {selectedPersian ? <p className="cal-detail-alt">{selectedPersian}</p> : null}
            {selected.occasions.length > 0 ? (
              <ul className="cal-detail-list">
                {selected.occasions.map((occasion) => (
                  <li key={`${occasion.id}-${occasion.name}`}>
                    <span className="cal-detail-name">{occasion.name}</span>
                    {occasion.note ? (
                      <span className="cal-detail-note"> — {occasion.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cal-detail-none">{t('dayNothing')}</p>
            )}
          </div>
        ) : null}

        {/* Legend for the two markers — a list, so its entries are read as
            separate items rather than run together. */}
        <div className="cal-legend">
          <p className="kicker">{t('legend')}</p>
          <ul>
            <li>
              <span className="cal-legend-mark" data-kind="today" aria-hidden="true" />
              {t('legendToday')}
            </li>
            <li>
              <span className="cal-legend-mark" data-kind="occ" aria-hidden="true" />
              {t('legendOccasion')}
            </li>
          </ul>
        </div>

        <p
          className="text-xs"
          style={{ marginBlockStart: 'var(--space-3)', color: 'var(--color-ink-muted)' }}
        >
          {t('calendarLead')}
        </p>
        {/* Occasions in this month, under the grid. */}
        <h3
          className="kicker kicker-led"
          style={{ marginBlockStart: 'var(--space-5)', color: 'var(--color-accent-2-text)' }}
        >
          {t('occasions')}
        </h3>
        {shown.occasions.length === 0 ? (
          <p style={{ marginBlockStart: 'var(--space-3)', color: 'var(--color-ink-muted)' }}>
            {t('occasionsNone')}
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              marginBlockStart: 'var(--space-3)',
              padding: 0,
              display: 'grid',
              gap: 'var(--space-2)',
            }}
          >
            {shown.occasions.map((occasion) => (
              <li
                key={`${occasion.id}-${occasion.iso}`}
                className="occ-row"
                data-on={occasion.iso === selectedIso ? 'true' : undefined}
              >
                {/* The row picks its own day out of the grid above. The two
                    were side by side and unconnected: a reader had to find
                    the 27th by eye. */}
                <button type="button" onClick={() => setSelectedIso(occasion.iso)}>
                  <span className="tabular occ-day">
                    {formatDay(locale, new Date(`${occasion.iso}T12:00:00Z`), 'dayMonth', {
                      calendar: 'gregory',
                    })}
                  </span>
                  <span>
                    <span className="occ-name">{occasion.name}</span>
                    {occasion.note ? <span className="occ-note"> — {occasion.note}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The month's prayer times, across both columns. */}
      <section className="prayer-table">
        <PrayerTimetable
          timetable={timetable}
          state={timetable ? 'ready' : entry === 'failed' ? 'failed' : 'loading'}
          todayIso={todayIso}
          occasionDays={occasionDays}
          monthLabel={monthLabel}
          locale={locale}
          timeZone={elsewhere?.timeZone ?? VIENNA.timeZone}
        />
      </section>
    </>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
