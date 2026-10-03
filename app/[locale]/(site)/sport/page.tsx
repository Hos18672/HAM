import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getSports } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { LinkButton } from '@/components/ui/button';
import { FilterableList } from '@/components/site/filterable-list';
import { formatTiming } from '@/lib/schedule';
import { contactHref } from '@/lib/topics';
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
  const tActions = await getTranslations({ locale, namespace: 'actions' });

  const rows = sports.map((sport, index) => {
    const when = formatTiming(sport, typed) || sport.schedule;
    return {
      key: sport.id,
      category: sport.group,
      node: (
        <EditableEntry entity="sport" id={sport.id} isLast={sports.length <= 1}>
          <article className="sport-row" id={`sport-${sport.id}`}>
            <span className="link-row-icon">
              <Icon name={SPORT_ICONS[index % SPORT_ICONS.length]} size={24} />
            </span>
            <div className="sport-row-body">
              <h2 className="sport-row-title">
                <EditableText
                  entity="sport"
                  id={sport.id}
                  field="activity"
                  locale={typed}
                  value={sport.activity}
                />
              </h2>
              <dl className="meta-grid">
                <div>
                  <dt>{t('audience')}</dt>
                  <dd>
                    <EditableText
                      entity="sport"
                      id={sport.id}
                      field="audience"
                      locale={typed}
                      value={sport.audience}
                    />
                  </dd>
                </div>
                {when ? (
                  <div>
                    <dt>{t('schedule')}</dt>
                    <dd>{when}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <LinkButton
              href={contactHref(typed, 'sport', sport.id)}
              size="sm"
              className="sport-row-cta"
              aria-label={`${tActions('signUp')}: ${sport.activity}`}
            >
              {tActions('signUp')}
            </LinkButton>
          </article>
        </EditableEntry>
      ),
    };
  });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* One compact row per sport — what, for whom, when — filtered by group,
          each with its own way to sign up. */}
      <section className="section section-alt">
        <div className="page">
          <FilterableList
            items={rows}
            label={t('filterByGroup')}
            labelNamespace="sport"
            emptyMessage={t('none')}
            className="sport-list"
          />
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="sport" />
          </div>
        </div>
      </section>
    </>
  );
}
