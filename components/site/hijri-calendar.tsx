import { getTranslations } from 'next-intl/server';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits, formatDate } from '@/lib/i18n/format';
import { HIJRI_MONTHS } from '@/lib/hijri';
import type { CalendarMonth } from '@/lib/prayer-page';
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
        gap: 'clamp(28px, 3.5vw, 56px)',
        alignItems: 'start',
      }}
    >
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <div>
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

          {/* Arrows are mirrored in RTL by the stylesheet, so "previous" always
              points backwards in reading order. */}
          <nav className="nav ms-auto" aria-label={t('calendar')}>
            <Link
              href={`${basePath}?y=${previous.y}&m=${previous.m}`}
              className="btn btn-secondary btn-sm btn-icon"
              aria-label={t('previousMonth')}
              scroll={false}
            >
              <CaretLeft size={16} weight="bold" aria-hidden="true" className="mirror" />
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
              <CaretRight size={16} weight="bold" aria-hidden="true" className="mirror" />
            </Link>
          </nav>
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
            {chunk(month.cells, 7).map((week, weekIndex) => (
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
        {month.occasions.length === 0 ? (
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
            {month.occasions.map((occasion) => (
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
