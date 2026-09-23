import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getOffers, getWeekSchedule } from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
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

  const [header, offers, week] = await Promise.all([
    getPageHeader('activities', typed),
    getOffers(typed),
    getWeekSchedule(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'activities' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* The areas of work. The design plates these from the bottom corner. */}
      <section className="section section-alt" data-rise>
        <div className="page">
          <ul
            className="columns-feature columns-tight plate-rota"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {offers.map((offer) => (
              <li key={offer.id} data-rise>
                <EditableEntry entity="offer" id={offer.id} isLast={offers.length <= 1}>
                  <Card as="article" className="card-plate-bottom h-full" plate>
                    <CardStar>
                      <Icon name={offer.icon} size={27} />
                    </CardStar>
                    <EditableText
                      as="h2"
                      entity="offer"
                      id={offer.id}
                      field="title"
                      locale={typed}
                      value={offer.title}
                      className="card-title"
                      style={{ marginBlockStart: 'var(--space-2)' }}
                      words="tight"
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
                      rise
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

      {/* The week. The design closes this page on it, ruled in gold. */}
      {week.length > 0 ? (
        <section className="section" data-rise>
          <div className="page">
            <div style={{ maxInlineSize: '65rem' }}>
              <SectionHead title={t('weekTitle')}>
                <p className="lead">{t('weekLead')}</p>
              </SectionHead>
              <table className="table-week table">
                <caption className="visually-hidden">{t('weekTitle')}</caption>
                <tbody>
                  {week.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">
                        <EditableText
                          entity="week"
                          id={row.id}
                          field="label"
                          locale={typed}
                          value={row.label}
                        />
                      </th>
                      <td>
                        <EditableText
                          entity="week"
                          id={row.id}
                          field="detail"
                          locale={typed}
                          value={row.detail}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
