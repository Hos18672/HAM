'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { timeRange } from '@/lib/i18n/format';
import { WEEK_DAYS, viennaWeekday, weekdayName, type ScheduleItem } from '@/lib/schedule';
import type { Locale } from '@/lib/i18n/config';

/**
 * The week, Monday first.
 *
 * One list of days in the markup. Wide screens lay it out as seven columns;
 * narrow ones stack the days and lift today's to the top. "Today" is worked
 * out in the browser — the page is built once and served for days.
 */
export function WeekSchedule({ items, locale }: { items: ScheduleItem[]; locale: Locale }) {
  const t = useTranslations('schedule');
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(viennaWeekday()), []);

  const time = (item: ScheduleItem) => {
    if (!item.startTime) return item.timeNote;
    return timeRange(item.startTime, item.endTime, locale);
  };

  return (
    <div className="week">
      {WEEK_DAYS.map((day) => {
        const own = items.filter((item) => item.day === day);
        const isToday = day === today;
        return (
          <section
            key={day}
            className="week-day"
            data-today={isToday ? 'true' : undefined}
            aria-labelledby={`week-day-${day}`}
          >
            <h3 id={`week-day-${day}`} className="week-day-name">
              {weekdayName(day, locale)}
              {isToday ? <span className="week-today">{t('today')}</span> : null}
            </h3>
            {own.length === 0 ? (
              <p className="week-empty">{t('nothing')}</p>
            ) : (
              <ul className="week-items">
                {own.map((item) => {
                  const body = (
                    <>
                      <span className="week-time tabular">{time(item)}</span>
                      <span className="week-title">{item.title}</span>
                      <span className="week-meta">
                        {item.group !== 'all' ? (
                          <span className="week-group" data-group={item.group}>
                            {t(`groups.${item.group}`)}
                          </span>
                        ) : null}
                        {item.rhythm !== 'weekly' ? (
                          <span className="week-rhythm">{t(`rhythm.${item.rhythm}`)}</span>
                        ) : null}
                      </span>
                    </>
                  );
                  return (
                    <li key={item.key} className="week-item" data-kind={item.kind}>
                      {item.href ? (
                        <Link href={item.href} className="week-link">
                          {body}
                        </Link>
                      ) : (
                        <div className="week-link">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
