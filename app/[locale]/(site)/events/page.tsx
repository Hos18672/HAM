import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import {
  getPageHeader,
  getUpcomingEvents,
  getPastEvents,
  getFeaturedEvent,
  getSettings,
} from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EventRow } from '@/components/site/event-row';
import { FilterableList } from '@/components/site/filterable-list';
import { digits } from '@/lib/i18n/format';
import { FeaturedEvent } from '@/components/site/featured-event';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { JsonLd, eventJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';
import { FACTS } from '@/lib/site-facts';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('events', locale, '/events');
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, upcoming, past, featured, settings] = await Promise.all([
    getPageHeader('events', typed),
    getUpcomingEvents(typed, 40),
    // Past events are archived, not deleted — they stay reachable below.
    getPastEvents(typed, 40),
    getFeaturedEvent(typed),
    getSettings(),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'events' });
  const showFeatured = settings.showOpeningEvent && featured;
  // The featured event has the band at the top; it is not listed twice.
  const list = showFeatured ? upcoming.filter((e) => e.id !== featured.id) : upcoming;
  const rows = list.map((event) => ({
    key: event.id,
    category: event.category,
    node: (
      <EditableEntry entity="event" id={event.id} isLast={upcoming.length + past.length <= 1}>
        <EventRow event={event} locale={typed} />
      </EditableEntry>
    ),
  }));

  return (
    <>
      {upcoming.map((event) => (
        <JsonLd key={event.id} data={eventJsonLd(event, typed, settings)} />
      ))}

      <PageHead header={header} locale={typed} />

      {/* The design leads this page with the opening, not with the list. */}
      {showFeatured ? (
        <section className="section" data-rise>
          <div className="page">
            <FeaturedEvent
              event={featured}
              locale={typed}
              address={settings.address || FACTS.street}
            />
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="page">
          <SectionHead title={t('upcoming')} />
          {list.length === 0 ? (
            <p style={{ color: 'var(--color-ink-muted)' }}>{t('none')}</p>
          ) : (
            <FilterableList
              items={rows}
              label={t('filterByCategory')}
              labelNamespace="events"
              emptyMessage={t('none')}
              className="event-list"
            />
          )}
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="event" />
          </div>

          {/* The archive, folded away: it is there to be found, not read. */}
          {past.length > 0 ? (
            <details className="event-archive">
              <summary>{t('pastCount', { count: digits(past.length, typed) })}</summary>
              <ul className="event-list">
                {past.map((event) => (
                  <li key={event.id}>
                    <EditableEntry entity="event" id={event.id} isLast={false}>
                      <EventRow event={event} locale={typed} past />
                    </EditableEntry>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>
    </>
  );
}
