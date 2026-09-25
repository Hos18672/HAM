import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getSports } from '@/lib/db/queries/content';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Decorative badges, cycled. A sport row carries no icon field. */
const SPORT_ICONS = ['Volleyball', 'UsersThree', 'Heart', 'Sparkle', 'Star', 'Compass'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('sport', locale, '/sport');
}

export default async function SportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, sports] = await Promise.all([getPageHeader('sport', typed), getSports(typed)]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'sport' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* The design sets the sports as cards, each headed by a figure and
          closed on the training time in gold. The figure is a photograph
          there; here it is the girih ground with the card's own badge.

          The three facts stay labelled — the labels are read out, not seen,
          so the card keeps the table's clarity without its grid. */}
      <section className="section section-alt" data-rise>
        <div className="page">
          <ul className="columns-tight" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sports.map((sport, index) => (
              <li key={sport.id} data-rise>
                <EditableEntry entity="sport" id={sport.id} isLast={sports.length <= 1}>
                  <Card as="article" className="card-figured h-full">
                    <div className="card-figure">
                      <PatternPlate tiling="khatam" opacity={0.85} />
                      <CardStar>
                        <Icon name={SPORT_ICONS[index % SPORT_ICONS.length]} size={26} />
                      </CardStar>
                    </div>

                    <div className="card-inner">
                      <h2 className="card-title" style={{ fontSize: 'var(--text-lg)' }}>
                        <span className="visually-hidden">{t('activity')}: </span>
                        <EditableText
                          entity="sport"
                          id={sport.id}
                          field="activity"
                          locale={typed}
                          value={sport.activity}
                        />
                      </h2>

                      <p className="card-body">
                        <span className="visually-hidden">{t('audience')}: </span>
                        <EditableText
                          entity="sport"
                          id={sport.id}
                          field="audience"
                          locale={typed}
                          value={sport.audience}
                        />
                      </p>

                      <p className="card-meta">
                        <span className="visually-hidden">{t('schedule')}: </span>
                        <EditableText
                          entity="sport"
                          id={sport.id}
                          field="schedule"
                          locale={typed}
                          value={sport.schedule}
                        />
                      </p>
                    </div>
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="sport" />
          </div>
        </div>
      </section>
    </>
  );
}
