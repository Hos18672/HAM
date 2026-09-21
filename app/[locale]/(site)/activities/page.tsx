import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getPageHeader, getOffers } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/site/icon';
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
  return pageMetadata('activities', locale, '/activities');
}

export default async function ActivitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, offers] = await Promise.all([
    getPageHeader('activities', typed),
    getOffers(typed),
  ]);
  if (!header) notFound();

  return (
    <>
      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page">
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {offers.map((offer) => (
              <li key={offer.id} data-rise>
                <EditableEntry entity="offer" id={offer.id} isLast={offers.length <= 1}>
                  <Card as="article" className="h-full">
                    <Icon name={offer.icon} size={32} />
                    <EditableText
                      as="h2"
                      entity="offer"
                      id={offer.id}
                      field="title"
                      locale={typed}
                      value={offer.title}
                      className="card-title"
                    />
                    <EditableText
                      as="p"
                      entity="offer"
                      id={offer.id}
                      field="body"
                      locale={typed}
                      value={offer.body}
                      className="card-body"
                      multiline
                    />
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="offer" />
          </div>
        </div>
      </section>
    </>
  );
}
