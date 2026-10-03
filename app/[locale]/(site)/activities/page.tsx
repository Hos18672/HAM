import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { requireLocale } from '@/lib/i18n/locale-param';
import {
  getPageHeader,
  getOffers,
  getWeekSchedule,
  getCourses,
  getSports,
} from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Icon } from '@/components/site/icon';
import { WeekSchedule } from '@/components/site/week-schedule';
import { LinkButton } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';
import { buildSchedule } from '@/lib/schedule';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

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
  const typed = requireLocale(locale);

  const [header, offers, week, courses, sports] = await Promise.all([
    getPageHeader('activities', typed),
    getOffers(typed),
    getWeekSchedule(typed),
    getCourses(typed),
    getSports(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'activities' });
  const schedule = buildSchedule(courses, sports, week);

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* The areas of work, as a list of ways in rather than a second copy of
          the home page's cards: each row goes to the page that holds it. */}
      <section className="section section-tight" data-rise>
        <div className="page">
          <SectionHead title={t('areasTitle')} />
          <ul className="link-list">
            {offers.map((offer) => {
              const row = (
                <>
                  <span className="link-row-icon">
                    <Icon name={offer.icon} size={24} />
                  </span>
                  <span style={{ minInlineSize: 0 }}>
                    <EditableText
                      as="span"
                      entity="offer"
                      id={offer.id}
                      field="title"
                      locale={typed}
                      value={offer.title}
                      className="link-row-title"
                    />
                    <EditableText
                      as="span"
                      entity="offer"
                      id={offer.id}
                      field="body"
                      locale={typed}
                      value={offer.body}
                      className="link-row-text"
                      multiline
                    />
                  </span>
                  {offer.href ? (
                    <ArrowRight
                      size={20}
                      weight="bold"
                      aria-hidden="true"
                      className="mirror link-row-go"
                    />
                  ) : (
                    <span />
                  )}
                </>
              );
              return (
                <li key={offer.id}>
                  <EditableEntry entity="offer" id={offer.id} isLast={offers.length <= 1}>
                    {offer.href ? (
                      <Link href={offer.href} className="link-row">
                        {row}
                      </Link>
                    ) : (
                      <div className="link-row">{row}</div>
                    )}
                  </EditableEntry>
                </li>
              );
            })}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="offer" />
          </div>
        </div>
      </section>

      {/* The week, built from the courses', the sports' and the recurring
          activities' own times — so it cannot disagree with them. */}
      <section className="section section-alt" data-rise>
        <div className="page">
          <SectionHead title={t('weekTitle')}>
            <p className="lead" style={{ maxInlineSize: '65ch' }}>
              {t('weekLead')}
            </p>
          </SectionHead>
          <WeekSchedule items={schedule} locale={typed} />

          <div className="cta-row" style={{ marginBlockStart: 'var(--space-6)' }}>
            <LinkButton href={`/${typed}/courses`}>{t('ctaCourses')}</LinkButton>
            <LinkButton href={`/${typed}/contact`} variant="secondary">
              {t('ctaVisit')}
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
