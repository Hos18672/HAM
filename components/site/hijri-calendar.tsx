import { getTranslations } from 'next-intl/server';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits, formatDate } from '@/lib/i18n/format';
import { HIJRI_MONTHS } from '@/lib/hijri';
import type { CalendarMonth } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { Card } from '../ui/card';

/**
 * The month calendar, showing the Gregorian and Hijri day numbers side by
 * side.
 *
 * Markers, per the design: today gets a thick gold frame; an occasion day gets
 * a gold frame *and* a tinted gold ground. No dots — a marker you have to
 * decode is worse than one you can see.
 */
export async function HijriCalendar({
  month,
  locale,
  basePath,
}: {
  month: CalendarMonth;
  locale: Locale;
  basePath: string;
}) {
  const t = await getTranslations({ locale, namespace: 'prayer' });
  const weekdays = t.raw('weekdays') as string[];

  const previous =
    month.month === 1 ? { y: month.year - 1, m: 12 } : { y: month.year, m: month.month - 1 };
  const next =
    month.month === 12 ? { y: month.year + 1, m: 1 } : { y: month.year, m: month.month + 1 };

  const monthLabel = formatDate(new Date(Date.UTC(month.year, month.month - 1, 15, 12)), locale, {
    month: 'long',
    year: 'numeric',
  });

  // The Hijri months this Gregorian month straddles — usually two.
  const hijriMonths = Array.from(
    new Set(month.cells.filter((cell) => cell.hijri).map((cell) => cell.hijri!.month)),
  );
  const hijriLabel = hijriMonths.map((m) => HIJRI_MONTHS[locale][m] ?? '').join(' / ');

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)' }}>{monthLabel}</h2>
          <p className="kicker">{hijriLabel}</p>
        </div>

        {/* Arrows are mirrored in RTL by the stylesheet, so "previous" always
            points backwards in reading order. */}
        <nav className="nav ms-auto" aria-label={t('calendar')}>
          <Link
            href={`${basePath}?y=${previous.y}&m=${previous.m}`}
            className="btn btn-secondary btn-sm btn-icon"
            aria-label={t('previousMonth')}
            scroll={false}
          >
            <CaretLeft size={16} weight="bold" aria-hidden="true" className="rtl:rotate-180" />
          </Link>
          <Link href={basePath} className="btn btn-secondary btn-sm" scroll={false}>
            {t('today')}
          </Link>
          <Link
            href={`${basePath}?y=${next.y}&m=${next.m}`}
            className="btn btn-secondary btn-sm btn-icon"
            aria-label={t('nextMonth')}
            scroll={false}
          >
            <CaretRight size={16} weight="bold" aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        </nav>
      </div>

      <table className="table" style={{ tableLayout: 'fixed' }}>
        <caption className="visually-hidden">
          {t('calendar')}: {monthLabel}
        </caption>
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th key={day} scope="col" style={{ textAlign: 'center', paddingInline: 0 }}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chunk(month.cells, 7).map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((cell, dayIndex) => {
                if (!cell.iso) {
                  return <td key={`blank-${dayIndex}`} style={{ border: 0 }} />;
                }
                const hasOccasion = cell.occasions.length > 0;
                return (
                  <td
                    key={cell.iso}
                    style={{ padding: '2px', border: 0, textAlign: 'center' }}
                    aria-current={cell.isToday ? 'date' : undefined}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gap: 0,
                        placeItems: 'center',
                        paddingBlock: 'var(--space-1)',
                        borderRadius: 'var(--radius-soft)',
                        border: cell.isToday
                          ? 'var(--rule-thick) solid var(--color-gold-500)'
                          : hasOccasion
                            ? '2px solid var(--color-gold-500)'
                            : '2px solid transparent',
                        background: hasOccasion ? 'var(--color-gold-100)' : 'transparent',
                        color: hasOccasion ? 'var(--color-on-gold)' : undefined,
                      }}
                    >
                      <span
                        className="tabular"
                        style={{
                          fontSize: 'var(--text-base)',
                          fontWeight: cell.isToday ? 'var(--weight-bold)' : 'var(--weight-regular)',
                          lineHeight: 1.1,
                        }}
                      >
                        {digits(cell.gregorianDay, locale)}
                      </span>
                      <span
                        className="tabular"
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: hasOccasion ? 'inherit' : 'var(--color-ink-faint)',
                          lineHeight: 1.1,
                        }}
                      >
                        {cell.hijri ? digits(cell.hijri.day, locale) : ''}
                      </span>
                      {hasOccasion ? (
                        <span className="visually-hidden">
                          {cell.occasions.map((o) => o.name).join(', ')}
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
      <div className="flex flex-wrap items-center gap-4">
        <p className="kicker">{t('legend')}</p>
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            style={{
              inlineSize: '1.25rem',
              blockSize: '1.25rem',
              borderRadius: 'var(--radius-baseline)',
              border: 'var(--rule-thick) solid var(--color-gold-500)',
            }}
          />
          {t('legendToday')}
        </span>
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            style={{
              inlineSize: '1.25rem',
              blockSize: '1.25rem',
              borderRadius: 'var(--radius-baseline)',
              border: '2px solid var(--color-gold-500)',
              background: 'var(--color-gold-100)',
            }}
          />
          {t('legendOccasion')}
        </span>
      </div>

      {/* Occasions in this month. */}
      <Card variant="soft">
        <p className="kicker">{t('occasions')}</p>
        {month.occasions.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            {t('occasionsNone')}
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 'var(--space-2)',
            }}
          >
            {month.occasions.map((occasion) => (
              <li key={`${occasion.id}-${occasion.iso}`} className="flex items-baseline gap-3">
                <span
                  className="tabular"
                  style={{
                    inlineSize: '3rem',
                    flexShrink: 0,
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-gold-text)',
                  }}
                >
                  {digits(occasion.gregorianDay, locale)}.
                </span>
                <span>
                  <span style={{ fontWeight: 'var(--weight-semibold)' }}>{occasion.name}</span>
                  {occasion.note ? (
                    <span style={{ color: 'var(--color-ink-muted)' }}> — {occasion.note}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
