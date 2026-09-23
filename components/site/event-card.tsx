import { getTranslations } from 'next-intl/server';
import { Clock, MapPin } from '@phosphor-icons/react/dist/ssr';
import { Card, CardTitle, CardBody } from '../ui/card';
import { Tag } from '../ui/tag';
import { EditableText } from '@/components/editable/editable-text';
import { formatDayPlate, formatTime, formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import type { EventEntry } from '@/lib/db/queries/content';

/** The day/month plate that opens an event card — a dateline in miniature. */
export function DayPlate({ date, locale }: { date: Date; locale: Locale }) {
  const { day, month } = formatDayPlate(date, locale);
  return (
    <div aria-hidden="true" className="day-plate">
      <span className="tabular day-plate-day">{day}</span>
      <span className="day-plate-mon">{month}</span>
    </div>
  );
}

export async function EventCard({
  event,
  locale,
  showBody = true,
}: {
  event: EventEntry;
  locale: Locale;
  showBody?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'events' });

  return (
    <Card as="article" id={`event-${event.slug}`} className="event-row h-full">
      <div className="flex items-center gap-4">
        <DayPlate date={event.startsAt} locale={locale} />
        {/* `minInlineSize: 0` lets this column shrink below its content, so a
            long German compound in the title wraps instead of widening the
            card. The chip is kept from stretching with `justify-self` on the
            chip itself — `justify-items` here would size the *title* to its
            content too, which is what pushed the page sideways at 375px. */}
        <div style={{ display: 'grid', gap: '2px', minInlineSize: 0 }}>
          {/* An admin can type any category, so fall back to the raw key
              rather than rendering a missing-message error — but label the
              known ones, so a reader sees "Eröffnung" and not "opening". */}
          <Tag style={{ justifySelf: 'start' }}>
            {t.has(`category.${event.category}`) ? t(`category.${event.category}`) : event.category}
          </Tag>
          <EditableText
            as="h3"
            entity="event"
            id={event.id}
            field="title"
            locale={locale}
            value={event.title}
            className="card-title"
            words="tight"
          />
        </div>
      </div>

      {showBody && event.body ? (
        <EditableText
          as="p"
          entity="event"
          id={event.id}
          field="body"
          locale={locale}
          value={event.body}
          className="card-body"
          multiline
          rise
        />
      ) : (
        <span />
      )}

      {/* The practicals, each behind its own mark, as the design sets them. */}
      <div
        className="text-xs"
        style={{
          display: 'grid',
          gap: 'var(--space-1)',
          color: 'var(--color-ink-muted)',
        }}
      >
        <span className="flex items-center gap-2">
          <Clock
            size={16}
            weight="duotone"
            aria-hidden="true"
            style={{ flexShrink: 0, color: 'var(--green)' }}
          />
          <span className="visually-hidden">{t('time')}: </span>
          <time dateTime={event.startsAt.toISOString()}>
            {formatDate(event.startsAt, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            {', '}
            {formatTime(event.startsAt, locale)}
          </time>
        </span>
        {event.location ? (
          <span className="flex items-center gap-2">
            <MapPin
              size={16}
              weight="duotone"
              aria-hidden="true"
              style={{ flexShrink: 0, color: 'var(--green)' }}
            />
            <span className="visually-hidden">{t('location')}: </span>
            <EditableText
              entity="event"
              id={event.id}
              field="location"
              locale={locale}
              value={event.location}
            />
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function CourseCardShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export { CardTitle, CardBody };
