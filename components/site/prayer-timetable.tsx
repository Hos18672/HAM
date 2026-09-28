'use client';

import { useTranslations } from 'next-intl';
import { Printer } from '@phosphor-icons/react/dist/ssr';
import { digits, formatClock } from '@/lib/i18n/format';
import { toHijri } from '@/lib/hijri';
import type { PrayerKey } from '@/lib/prayer-times';
import type { Timetable } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';

const COLUMNS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];

/**
 * One month of Vienna's prayer times, a row a day.
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
}: {
  timetable: Timetable | null;
  state: 'ready' | 'loading' | 'failed';
  todayIso: string;
  /** ISO dates in this month that carry an occasion, with their names. */
  occasionDays: Map<string, string[]>;
  monthLabel: string;
  locale: Locale;
}) {
  const t = useTranslations('prayer');

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
      <div className="flex flex-wrap items-baseline gap-3">
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
        <Button
          variant="secondary"
          size="sm"
          className="no-print ms-auto"
          onClick={print}
          disabled={state !== 'ready'}
        >
          <Printer size={16} weight="duotone" aria-hidden="true" />
          {t('print')}
        </Button>
      </div>

      {state === 'ready' && timetable ? (
        <div className="table-scroll" style={{ marginBlockStart: 'var(--space-4)' }}>
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
              {timetable.days.map((day) => {
                const [y, m, d] = day.iso.split('-').map(Number) as [number, number, number];
                const date = new Date(Date.UTC(y, m - 1, d, 12));
                const occasions = occasionDays.get(day.iso);
                const isToday = day.iso === todayIso;
                return (
                  <tr
                    key={day.iso}
                    data-today={isToday ? 'true' : undefined}
                    data-occ={occasions ? 'true' : undefined}
                    aria-current={isToday ? 'date' : undefined}
                    title={occasions?.join(', ')}
                  >
                    <th scope="row">
                      {weekday.format(date)} {digits(d, locale)}
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
                      <td key={key}>{formatClock(day.times[key], locale)}</td>
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

      <p
        className="text-xs"
        style={{ marginBlockStart: 'var(--space-3)', color: 'var(--color-ink-faint)' }}
      >
        {timetable?.source === 'local' ? t('sourceLocal') : t('sourceApi')} · {t('placeVienna')}
      </p>
    </div>
  );
}
