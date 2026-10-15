import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CalendarBlank, CalendarPlus, MapPin } from '@phosphor-icons/react/dist/ssr';
import { requireLocale } from '@/lib/i18n/locale-param';
import { isLocale } from '@/lib/i18n/config';
import { formatDay, formatTime, timeRange } from '@/lib/i18n/format';
import { icsHref } from '@/lib/ics';
import { houseMapUrl, FACTS } from '@/lib/site-facts';
import {
  getPastEvents,
  getSettings,
  getUpcomingEvents,
  type EventEntry,
} from '@/lib/db/queries/content';
import { JsonLd, eventJsonLd } from '@/lib/seo';
import { EventCover } from '@/components/app/event-cover';
import { EventDetailBar } from '@/components/app/event-detail-bar';

/**
 * None built ahead; each one is rendered on its first visit and then served
 * from the host's cache like the rest of the site. Without this — even an
 * empty list — the route counts as dynamic and renders on every request.
 */
export function generateStaticParams() {
  return [];
}

/** Events are few; one is found among the lists the events page already caches. */
async function findEvent(locale: Parameters<typeof getUpcomingEvents>[0], slug: string) {
  const [upcoming, past] = await Promise.all([
    getUpcomingEvents(locale, 200),
    getPastEvents(locale, 200),
  ]);
  const event = upcoming.find((e) => e.slug === slug) ?? past.find((e) => e.slug === slug);
  return event ? { event, past: !upcoming.includes(event) } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const found = await findEvent(locale, slug);
  if (!found) return {};
  const canonical = `/${locale}/events/${slug}`;
  return {
    title: found.event.title,
    description: found.event.body.slice(0, 160),
    alternates: {
      canonical,
      languages: { fa: `/fa/events/${slug}`, de: `/de/events/${slug}` },
    },
    openGraph: { title: found.event.title, url: canonical },
  };
}

/**
 * One event: a cover (its photo, or the lattice with the category's icon), a
 * sheet over it with the category, the title, the date and the place, and
 * the text. Along the bottom a reminder and "add to calendar".
 */
export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const typed = requireLocale(locale);
  const found = await findEvent(typed, slug);
  if (!found) notFound();
  const { event, past } = found;

  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'events' }),
    getSettings(),
  ]);
  const tApp = await getTranslations({ locale, namespace: 'app' });
  const category = t.has(`category.${event.category}`)
    ? t(`category.${event.category}`)
    : event.category;
  const time = timeRange(
    formatTime(event.startsAt, typed),
    event.endsAt ? formatTime(event.endsAt, typed) : null,
    typed,
  );

  return (
    <article className="a-detail">
      <JsonLd data={eventJsonLd(event as EventEntry, typed, settings)} />
      <EventCover
        category={event.category}
        imageUrl={event.imageUrl}
        imageAlt={event.imageAlt}
        size={112}
        className="a-detail-cover"
      />
      <div className="a-detail-sheet">
        <div className="a-stack" style={{ gap: 6 }}>
          <p className="a-label" style={{ padding: 0, fontSize: 'calc(13px * var(--a-fs))' }}>
            {category}
          </p>
          <h1 className="a-detail-title">{event.title}</h1>
        </div>
        <div className="a-stack" style={{ gap: 8 }}>
          <div className="a-card a-row a-detail-fact">
            <span className="a-ico" data-size="42">
              <CalendarBlank size={21} weight="duotone" aria-hidden="true" />
            </span>
            <span className="a-stack">
              <span className="a-title" style={{ fontSize: 'calc(15px * var(--a-fs))' }}>
                {formatDay(typed, event.startsAt, 'weekday')}
              </span>
              <span className="a-sub" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
                {time}
                {typed === 'fa'
                  ? ` · ${formatDay(typed, event.startsAt, 'dayMonth', { calendar: 'gregory' })}`
                  : ''}
              </span>
            </span>
          </div>
          <div className="a-card a-row a-detail-fact">
            <span className="a-ico" data-size="42">
              <MapPin size={21} weight="duotone" aria-hidden="true" />
            </span>
            <span className="a-stack a-grow">
              <span className="a-title" style={{ fontSize: 'calc(15px * var(--a-fs))' }}>
                {event.location || FACTS.street}
              </span>
              <span className="a-sub ltr-island" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
                {settings.address || FACTS.street}
              </span>
            </span>
            <a
              href={houseMapUrl(settings.mapUrl)}
              className="a-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tApp('directions')}
            </a>
          </div>
        </div>
        {event.body ? <p className="a-detail-body">{event.body}</p> : null}
        {event.programme.length > 0 ? (
          <section className="a-stack" style={{ gap: 8 }}>
            <h2 className="a-head" style={{ fontSize: 'calc(17px * var(--a-fs))' }}>
              {t('programme')}
            </h2>
            <ol className="a-list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {event.programme.map((item) => (
                <li key={item.id} className="a-list-row" style={{ cursor: 'default' }}>
                  <span className="a-val" style={{ minInlineSize: 52 }}>
                    {item.timeLabel}
                  </span>
                  <span className="a-grow">{item.title}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
      {past ? null : (
        <EventDetailBar
          slug={event.slug}
          title={event.title}
          startsAtIso={event.startsAt.toISOString()}
          ics={icsHref(event)}
          addLabel={t('addToCalendar')}
        >
          <CalendarPlus size={21} weight="duotone" aria-hidden="true" />
        </EventDetailBar>
      )}
    </article>
  );
}
