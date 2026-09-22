import { getTranslations } from 'next-intl/server';
import { Card, CardTitle, CardBody, CardFoot } from '../ui/card';
import { Tag } from '../ui/tag';
import { EditableText } from '@/components/editable/editable-text';
import { formatDayPlate, formatTime, formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import type { EventEntry } from '@/lib/db/queries/content';

/** The day/month plate that opens an event card — a dateline in miniature. */
export function DayPlate({ date, locale }: { date: Date; locale: Locale }) {
  const { day, month } = formatDayPlate(date, locale);
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        inlineSize: '3.5rem',
        blockSize: '3.5rem',
        flexShrink: 0,
        border: 'var(--rule-thick) solid var(--color-rule-strong)',
        borderRadius: 'var(--radius-baseline)',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>{day}</span>
      <span className="kicker" style={{ fontSize: '0.625rem' }}>
        {month}
      </span>
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
    <Card as="article" id={`event-${event.slug}`} className="h-full">
      <div className="flex items-start gap-3">
        <DayPlate date={event.startsAt} locale={locale} />
        {/* `justifyItems: start` keeps the category chip hugging its label —
            a grid item stretches to the track by default, which turned the
            tag into a pill the full width of the card. */}
        <div style={{ display: 'grid', gap: '2px', justifyItems: 'start', minInlineSize: 0 }}>
          {/* An admin can type any category, so fall back to the raw key
              rather than rendering a missing-message error — but label the
              known ones, so a reader sees "Eröffnung" and not "opening". */}
          <Tag>
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
        />
      ) : null}

      <CardFoot>
        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          <span className="visually-hidden">{t('time')}: </span>
          <time dateTime={event.startsAt.toISOString()}>
            {formatDate(event.startsAt, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            {', '}
            {formatTime(event.startsAt, locale)}
          </time>
        </span>
        {event.location ? (
          <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
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
      </CardFoot>
    </Card>
  );
}

export function CourseCardShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export { CardTitle, CardBody };
