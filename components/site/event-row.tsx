import { getTranslations } from 'next-intl/server';
import { CalendarPlus, Clock, MapPin } from '@phosphor-icons/react/dist/ssr';
import { EditableText } from '@/components/editable/editable-text';
import { formatDate, formatDay, formatTime, timeRange } from '@/lib/i18n/format';
import { icsHref } from '@/lib/ics';
import type { Locale } from '@/lib/i18n/config';
import type { EventEntry } from '@/lib/db/queries/content';

/**
 * The date badge: weekday, day and month — and on Persian pages the
 * Gregorian date under it, since the invitation on the door uses that one.
 */
export function DateBadge({ date, locale }: { date: Date; locale: Locale }) {
  return (
    <div className="date-badge" aria-hidden="true">
      <span className="date-badge-wd">{formatDate(date, locale, { weekday: 'short' })}</span>
      <span className="date-badge-day tabular">{formatDate(date, locale, { day: 'numeric' })}</span>
      <span className="date-badge-mon">{formatDate(date, locale, { month: 'short' })}</span>
      {locale === 'fa' ? (
        <span className="date-badge-greg">
          {formatDay(locale, date, 'dayMonth', { calendar: 'gregory' })}
        </span>
      ) : null}
    </div>
  );
}

/** One event as a row: badge | category, title, time · place, one line. */
export async function EventRow({
  event,
  locale,
  past = false,
}: {
  event: EventEntry;
  locale: Locale;
  past?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'events' });
  const category = t.has(`category.${event.category}`)
    ? t(`category.${event.category}`)
    : event.category;
  // formatTime already gives the reader's digits; timeRange only joins them.
  const time = timeRange(
    formatTime(event.startsAt, locale),
    event.endsAt ? formatTime(event.endsAt, locale) : null,
    locale,
  );

  return (
    <article className="event-line" id={`event-${event.slug}`}>
      <DateBadge date={event.startsAt} locale={locale} />
      <div className="event-line-body">
        <p className="event-line-cat">{category}</p>
        <EditableText
          as="h3"
          entity="event"
          id={event.id}
          field="title"
          locale={locale}
          value={event.title}
          className="event-line-title"
        />
        <p className="event-line-meta">
          {/* The full date for anyone not looking at the badge. */}
          <span className="visually-hidden">{formatDay(locale, event.startsAt, 'full')} · </span>
          <span>
            <Clock size={15} weight="duotone" aria-hidden="true" />
            <time dateTime={event.startsAt.toISOString()} className="tabular">
              {time}
            </time>
          </span>
          {event.location ? (
            <span>
              <MapPin size={15} weight="duotone" aria-hidden="true" />
              <EditableText
                entity="event"
                id={event.id}
                field="location"
                locale={locale}
                value={event.location}
              />
            </span>
          ) : null}
        </p>
        {!past && event.body ? (
          <EditableText
            as="p"
            entity="event"
            id={event.id}
            field="body"
            locale={locale}
            value={event.body}
            className="event-line-text clamp-2"
            multiline
          />
        ) : null}
        {!past ? (
          <a
            className="event-line-ics"
            href={icsHref(event)}
            download={`${event.slug}.ics`}
            aria-label={`${t('addToCalendar')}: ${event.title}`}
          >
            <CalendarPlus size="1.3em" weight="bold" aria-hidden="true" style={{ flexShrink: 0 }} />
            {t('addToCalendar')}
          </a>
        ) : null}
      </div>
    </article>
  );
}
