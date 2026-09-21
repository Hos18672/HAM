import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getUpcomingEvents, getPastEvents, getSettings } from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EventCard } from '@/components/site/event-card';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { JsonLd, eventJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';

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

  const [header, upcoming, past, settings] = await Promise.all([
    getPageHeader('events', typed),
    getUpcomingEvents(typed, 40),
    // Past events are archived, not deleted — they stay reachable below.
    getPastEvents(typed, 40),
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

      <section className="section">
        <div className="page">
          <SectionHead kicker={t('upcoming')} />
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--color-ink-muted)' }}>{t('none')}</p>
          ) : (
            <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {upcoming.map((event) => (
                <li key={event.id} data-rise>
                  <EditableEntry entity="event" id={event.id} isLast={upcoming.length + past.length <= 1}>
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
        <section className="section" data-rise>
          <div className="page">
            <SectionHead kicker={t('past')} />
            <ul
              className="columns-feature"
              style={{ listStyle: 'none', margin: 0, padding: 0, opacity: 0.75 }}
            >
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
