import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getPageHeader,
  getUpcomingEvents,
  getPastEvents,
  getFeaturedEvent,
  getSettings,
} from '@/lib/db/queries/content';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EventCard } from '@/components/site/event-card';
import { FeaturedEvent } from '@/components/site/featured-event';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { JsonLd, eventJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';
import { ASSOCIATION } from '@/lib/db/seed-data';

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
  setRequestLocale(locale);
  const typed = locale as Locale;

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

  return (
    <>
      {upcoming.map((event) => (
        <JsonLd key={event.id} data={eventJsonLd(event, typed, settings)} />
      ))}

      <PageHead header={header} locale={typed} />

      {/* The design leads this page with the opening, not with the list. */}
      {settings.showOpeningEvent && featured ? (
        <section className="section" data-rise>
          <div className="page">
            <FeaturedEvent
              event={featured}
              locale={typed}
              address={settings.address || ASSOCIATION.street}
            />
          </div>
        </section>
      ) : null}

      <section className="section" data-rise>
        <div className="page">
          <SectionHead kicker={t('upcoming')} />
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--color-ink-muted)' }}>{t('none')}</p>
          ) : (
            <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {upcoming.map((event) => (
                <li key={event.id} data-rise>
                  <EditableEntry
                    entity="event"
                    id={event.id}
                    isLast={upcoming.length + past.length <= 1}
                  >
                    <EventCard event={event} locale={typed} />
                  </EditableEntry>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="event" />
          </div>
        </div>
      </section>

      {past.length > 0 ? (
        <section className="section section-alt" style={{ position: 'relative' }} data-rise>
          <PatternPlate opacity={0.35} />
          <div className="page">
            <SectionHead kicker={t('past')} />
            {/* No opacity here. Dimming the whole list was how this said
                "already happened", and against the cream paper it dragged
                every label in it under 4.5:1 — 0.75 turns the faint ink into
                #918f85, which is 2.7:1. The heading above already says these
                are past, so the meaning does not depend on the dimming. */}
            <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {past.map((event) => (
                <li key={event.id} data-rise>
                  <EditableEntry entity="event" id={event.id} isLast={false}>
                    <EventCard event={event} locale={typed} showBody={false} />
                  </EditableEntry>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
