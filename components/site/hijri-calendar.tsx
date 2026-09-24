'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { digits, formatDate } from '@/lib/i18n/format';
import { HIJRI_MONTHS } from '@/lib/hijri';
import { buildCalendarMonth, previousMonth, nextMonth } from '@/lib/calendar';
import type { CalendarMonth } from '@/lib/calendar';
import type { Occasion } from '@/lib/db/queries/content';
import type { Locale } from '@/lib/i18n/config';

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
 * still shareable and still survives a language switch, but nothing is
 * fetched and nothing else on the page re-renders.
 */
export function HijriCalendar({
  initialMonth,
  currentMonth,
  occasions,
  todayIso,
  locale,
  basePath,
}: {
  initialMonth: CalendarMonth;
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

  // The first month is already built on the server; rebuild only on a move.
  const shown = useMemo(
    () =>
      year === initialMonth.year && month === initialMonth.month
        ? initialMonth
        : buildCalendarMonth(year, month, occasions, todayIso),
    [year, month, initialMonth, occasions, todayIso],
  );

  /** Move, and leave the address bar telling the truth. */
  function go(next: { year: number; month: number }) {
    setShown(next);
    const url =
      next.year === currentMonth.year && next.month === currentMonth.month
        ? basePath
        : `${basePath}?y=${next.year}&m=${next.month}`;
    window.history.replaceState(null, '', url);
  }

  const previous = previousMonth({ year, month });
  const next = nextMonth({ year, month });

  const monthLabel = formatDate(new Date(Date.UTC(shown.year, shown.month - 1, 15, 12)), locale, {
    month: 'long',
    year: 'numeric',
  });

  // The Hijri months this Gregorian month straddles — usually two.
  const hijriMonths = Array.from(
    new Set(shown.cells.filter((cell) => cell.hijri).map((cell) => cell.hijri!.month)),
  );
  const hijriLabel = hijriMonths.map((m) => HIJRI_MONTHS[locale][m] ?? '').join(' / ');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
        gap: 'clamp(28px, 3.5vw, 56px)',
        alignItems: 'start',
      }}
    >
      <div>
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
            <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
              {t('calendar')}
            </p>
            {/* Both months in the one heading, the Hijri one set large.

                They read as two lines and the design's emphasis is
                unchanged, but the civil month stays part of the heading
                rather than becoming a caption beside it: it is the month the
                arrows move through and the month the URL names, so it has to
                be findable by a reader moving between headings. */}
            <h2
              style={{
                marginBlockStart: 'var(--space-1)',
                fontSize: 'clamp(22px, 2.8vw, 30px)',
                lineHeight: 1.15,
              }}
            >
              {hijriLabel}
              <span
                className="text-sm"
                style={{
                  display: 'block',
                  marginBlockStart: 'var(--space-1)',
                  fontWeight: 'var(--weight-regular)',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {monthLabel}
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
          style={{
            marginBlockStart: 'var(--space-4)',
            inlineSize: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: '7px',
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
                  style={{ textAlign: 'center', paddingBlockEnd: 'var(--space-1)' }}
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
                  return (
                    <td
                      key={cell.iso}
                      style={{ padding: 0 }}
                      aria-current={cell.isToday ? 'date' : undefined}
                    >
                      <div
                        className="cal-day"
                        data-today={cell.isToday ? 'true' : undefined}
                        data-occ={hasOccasion ? 'true' : undefined}
                      >
                        <span className="tabular cal-day-greg">
                          {digits(cell.gregorianDay, locale)}
                        </span>
                        <span className="tabular cal-day-hij">
                          {cell.hijri ? digits(cell.hijri.day, locale) : ''}
                        </span>
                        {/* Both markers spelled out, so neither is carried by
                            the ring or the tint alone. */}
                        {cell.isToday ? (
                          <span className="visually-hidden"> — {t('legendToday')}</span>
                        ) : null}
                        {hasOccasion ? (
                          <span className="visually-hidden">
                            {' '}
                            — {t('legendOccasion')}: {cell.occasions.map((o) => o.name).join(', ')}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend for the two markers. */}
        <div
          className="flex flex-wrap items-center gap-4"
          style={{ marginBlockStart: 'var(--space-3)' }}
        >
          <p className="kicker">{t('legend')}</p>
          <span className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              style={{
                inlineSize: '14px',
                blockSize: '14px',
                borderRadius: '5px',
                border: '2px solid var(--gold)',
              }}
            />
            {t('legendToday')}
          </span>
          <span className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              style={{
                inlineSize: '14px',
                blockSize: '14px',
                borderRadius: '5px',
                border: 'var(--rule-hair) solid var(--gold)',
                background: 'rgba(200, 164, 93, 0.16)',
              }}
            />
            {t('legendOccasion')}
          </span>
        </div>

        <p
          className="text-xs"
          style={{ marginBlockStart: 'var(--space-3)', color: 'var(--color-ink-muted)' }}
        >
          {t('calendarLead')}
        </p>
      </div>

      {/* Occasions in this month, beside the grid rather than under it. */}
      <div>
        <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
          {t('occasions')}
        </p>
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
                className="flex items-center gap-4"
                style={{
                  background: 'var(--card)',
                  border: 'var(--rule-hair) solid var(--line)',
                  borderRadius: '14px',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <span className="tabular occ-day" aria-hidden="true">
                  {digits(occasion.gregorianDay, locale)}
                </span>
                <span>
                  <span className="visually-hidden">{digits(occasion.gregorianDay, locale)}. </span>
                  <span style={{ fontWeight: 'var(--weight-semibold)' }}>{occasion.name}</span>
                  {occasion.note ? (
                    <span style={{ color: 'var(--color-ink-muted)' }}> — {occasion.note}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
