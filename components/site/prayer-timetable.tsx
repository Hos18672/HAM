'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Printer, CaretDown } from '@phosphor-icons/react/dist/ssr';
import { digits, formatClock } from '@/lib/i18n/format';
import { toHijri } from '@/lib/hijri';
import type { PrayerKey } from '@/lib/prayer-times';
import type { Timetable } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';

/** Sunset sits between Asr and Maghrib, which in this method is 4° after it. */
const COLUMNS: (PrayerKey | 'sunset')[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'sunset',
  'maghrib',
  'isha',
  'midnight',
];

/**
 * One month of prayer times — for the place the page is showing — a row a day.
 *
 * It follows the calendar above it: the calendar owns which month is shown
 * and fetches the month's times as it moves, and this only lays them out.
 * Today's row and the days with an occasion carry the same two markers the
 * grid does, and the print button prints this table alone.
 */
export function PrayerTimetable({
  timetable,
  state,
  todayIso,
  occasionDays,
  monthLabel,
  locale,
  timeZone = 'Europe/Vienna',
}: {
  timetable: Timetable | null;
  state: 'ready' | 'loading' | 'failed';
  todayIso: string;
  /** ISO dates in this month that carry an occasion, with their names. */
  occasionDays: Map<string, string[]>;
  monthLabel: string;
  locale: Locale;
  /** The place's zone, so a change of the clocks is marked on the right day. */
  timeZone?: string;
}) {
  const t = useTranslations('prayer');
  // Phones open on the calendar and the day's times; the month's table is
  // one tap away. Wide screens always show it — the toggle is hidden there.
  const [open, setOpen] = useState(false);

  /** The place's UTC offset at noon on a day, in minutes. */
  const offsetOn = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    const noon = new Date(Date.UTC(y, m - 1, d, 12));
    const local = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(noon);
    return (Number(local) - 12) * 60;
  };

  function print() {
    const root = document.documentElement;
    root.dataset.print = 'timetable';
    const done = () => {
      delete root.dataset.print;
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  const weekday = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
    weekday: 'short',
    timeZone: 'UTC',
  });

  return (
    <div className="timetable-print">
      <div className="flex flex-wrap items-center gap-3">
        <div style={{ flex: '1 1 12rem', minInlineSize: 0 }}>
          <p className="kicker kicker-led" style={{ color: 'var(--color-accent-2-text)' }}>
            {t('timetable')}
          </p>
          <h2
            style={{
              marginBlockStart: 'var(--space-1)',
              fontSize: 'clamp(22px, 2.8vw, 30px)',
              lineHeight: 1.15,
            }}
          >
            {monthLabel}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {t('timetableLead')}
          </p>
        </div>
        <div className="no-print ms-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="timetable-toggle"
            aria-expanded={open}
            aria-controls="month-timetable"
            onClick={() => setOpen((o) => !o)}
          >
            <CaretDown
              size={16}
              weight="bold"
              aria-hidden="true"
              style={{ transform: open ? 'rotate(180deg)' : undefined }}
            />
            {open ? t('hideTable') : t('showTable')}
          </Button>
          <Button variant="secondary" size="sm" onClick={print} disabled={state !== 'ready'}>
            <Printer size={16} weight="duotone" aria-hidden="true" />
            {t('print')}
          </Button>
        </div>
      </div>

      {state === 'ready' && timetable ? (
        <div
          id="month-timetable"
          // A scrolling region is reachable from the keyboard, so its rows can
          // be scrolled without a mouse.
          tabIndex={0}
          role="region"
          aria-label={`${t('timetable')} · ${monthLabel}`}
          className="table-scroll timetable-wrap"
          data-open={open ? 'true' : 'false'}
          style={{ marginBlockStart: 'var(--space-4)' }}
        >
          <table className="timetable table">
            <caption className="visually-hidden">
              {t('timetable')} · {monthLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t('timetableDate')}</th>
                <th scope="col">{t('hijriDate')}</th>
                {COLUMNS.map((key) => (
                  <th key={key} scope="col">
                    {t(`names.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetable.days.map((day, index) => {
                const [y, m, d] = day.iso.split('-').map(Number) as [number, number, number];
                const date = new Date(Date.UTC(y, m - 1, d, 12));
                const occasions = occasionDays.get(day.iso);
                const isToday = day.iso === todayIso;
                const previous = timetable.days[index - 1];
                // The day the clocks change: its times jump by an hour
                // against the day before, and the row says why.
                const clockChange = previous ? offsetOn(day.iso) !== offsetOn(previous.iso) : false;
                return (
                  <tr
                    key={day.iso}
                    data-today={isToday ? 'true' : undefined}
                    data-occ={occasions ? 'true' : undefined}
                    data-friday={date.getUTCDay() === 5 ? 'true' : undefined}
                    data-dst={clockChange ? 'true' : undefined}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <th scope="row">
                      {weekday.format(date)} {digits(d, locale)}
                      {clockChange ? <span className="timetable-dst">{t('dstNote')}</span> : null}
                      {isToday ? (
                        <span className="visually-hidden"> — {t('legendToday')}</span>
                      ) : null}
                      {occasions ? (
                        <span className="visually-hidden">
                          {' '}
                          — {t('legendOccasion')}: {occasions.join(', ')}
                        </span>
                      ) : null}
                    </th>
                    <td className="timetable-hij">{digits(toHijri(date).day, locale)}</td>
                    {COLUMNS.map((key) => (
                      <td key={key}>
                        {formatClock(key === 'sunset' ? day.extras.sunset : day.times[key], locale)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p
          aria-live="polite"
          style={{ marginBlockStart: 'var(--space-4)', color: 'var(--color-ink-muted)' }}
        >
          {state === 'failed' ? t('timetableFailed') : t('timetableLoading')}
        </p>
      )}
    </div>
  );
}
