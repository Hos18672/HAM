import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getBlocks, getValues, getWeekSchedule } from '@/lib/db/queries/content';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
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
  return pageMetadata('about', locale, '/about');
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, values, week] = await Promise.all([
    getPageHeader('about', typed),
    getBlocks('about', typed),
    getValues(typed),
    getWeekSchedule(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'about' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* Self-description: two paragraphs and a pull quote. */}
      <section className="section" data-rise>
        <div className="page">
          <div className="rail">
            <div />
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {blocks.body_1 ? (
                <EditableText
                  as="p"
                  entity="block"
                  id={blocks.body_1.id}
                  field="text"
                  locale={typed}
                  value={blocks.body_1.text}
                  multiline
                />
              ) : null}

              {blocks.pull_quote ? (
                <blockquote className="pull-quote">
                  <EditableText
                    entity="block"
                    id={blocks.pull_quote.id}
                    field="text"
                    locale={typed}
                    value={blocks.pull_quote.text}
                  />
                </blockquote>
              ) : null}

              {blocks.body_2 ? (
                <EditableText
                  as="p"
                  entity="block"
                  id={blocks.body_2.id}
                  field="text"
                  locale={typed}
                  value={blocks.body_2.text}
                  multiline
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section section-alt" style={{ position: 'relative' }} data-rise>
        <PatternPlate opacity={0.35} />
        <div className="page">
          <SectionHead title={t('values')} />
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 'var(--space-4)',
              maxInlineSize: 'var(--measure)',
            }}
          >
            {values.map((item) => (
              <li key={item.id} data-rise>
                <EditableEntry entity="values" id={item.id} isLast={values.length <= 1}>
                  <div style={{ display: 'grid', gap: '2px' }}>
                    <EditableText
                      as="h3"
                      entity="values"
                      id={item.id}
                      field="title"
                      locale={typed}
                      value={item.title}
                      style={{ fontSize: 'var(--text-lg)' }}
                    />
                    <EditableText
                      as="p"
                      entity="values"
                      id={item.id}
                      field="body"
                      locale={typed}
                      value={item.body}
                      style={{ color: 'var(--color-ink-muted)' }}
                      multiline
                    />
                  </div>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="values" />
          </div>
        </div>
      </section>

      {/* Weekly schedule */}
      <section className="section" data-rise>
        <div className="page">
          <SectionHead title={t('schedule')} />
          <table className="table" style={{ maxInlineSize: 'var(--measure)' }}>
            <caption className="visually-hidden">{t('schedule')}</caption>
            <tbody>
              {week.map((row) => (
                <tr key={row.id}>
                  <th
                    scope="row"
                    style={{ borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)' }}
                  >
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
      </section>
    </>
  );
}
