import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getSports } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
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
  return pageMetadata('sport', locale, '/sport');
}

export default async function SportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, sports] = await Promise.all([getPageHeader('sport', typed), getSports(typed)]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'sport' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page">
          {/* A table is the honest shape here: three parallel facts per row.
              This is one of the few places the set permits horizontal rules.
              Below its own minimum width it scrolls inside its frame rather
              than pushing the page sideways. */}
          <div className="table-scroll" style={{ maxInlineSize: '56rem' }}>
            <table className="table">
              <caption className="visually-hidden">{header.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('activity')}</th>
                  <th scope="col">{t('audience')}</th>
                  <th scope="col">{t('schedule')}</th>
                </tr>
              </thead>
              <tbody>
                {sports.map((sport) => (
                  <tr key={sport.id}>
                    <th
                      scope="row"
                      style={{
                        borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)',
                        textTransform: 'none',
                        letterSpacing: 0,
                        fontSize: 'var(--text-base)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      <EditableEntry entity="sport" id={sport.id} isLast={sports.length <= 1}>
                        <EditableText
                          entity="sport"
                          id={sport.id}
                          field="activity"
                          locale={typed}
                          value={sport.activity}
                        />
                      </EditableEntry>
                    </th>
                    <td>
                      <EditableText
                        entity="sport"
                        id={sport.id}
                        field="audience"
                        locale={typed}
                        value={sport.audience}
                      />
                    </td>
                    <td>
                      <EditableText
                        entity="sport"
                        id={sport.id}
                        field="schedule"
                        locale={typed}
                        value={sport.schedule}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="sport" />
          </div>
        </div>
      </section>
    </>
  );
}
