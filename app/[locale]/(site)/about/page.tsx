import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getBlocks, getValues } from '@/lib/db/queries/content';
import { Mark, PatternPlate, ViennaSkyline } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * The badge inside a value card's star.
 *
 * The design gives every card in this grid an icon. The values themselves are
 * managed content and carry none, so the badge cycles a fixed set: it is
 * `aria-hidden` ornament, and no meaning rides on which one a card gets.
 */
const VALUE_ICONS = ['Sparkle', 'Heart', 'Translate', 'UsersThree', 'Compass', 'Star'];

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
  const typed = requireLocale(locale);

  const [header, blocks, values] = await Promise.all([
    getPageHeader('about', typed),
    getBlocks('about', typed),
    getValues(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'about' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* Self-description. The design sets the two paragraphs and the pulled
          quote beside a tall panel — a photograph there, ornament here. */}
      <section className="section section-alt" data-rise>
        <div className="page">
          <div className="split">
            <div
              className="frame ornament-panel"
              style={{ aspectRatio: '4 / 5', maxBlockSize: '640px' }}
              data-rise
            >
              <PatternPlate tiling="shesh" opacity={0.5} />
              <div className="ornament-mark">
                <Mark className="" />
              </div>
              <ViennaSkyline tone="var(--gold)" opacity={0.3} />
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {blocks.body_1 ? (
                <div data-rise>
                  <EditableText
                    as="p"
                    entity="block"
                    id={blocks.body_1.id}
                    field="text"
                    locale={typed}
                    value={blocks.body_1.text}
                    multiline
                    rise
                  />
                </div>
              ) : null}

              {blocks.body_2 ? (
                <div data-rise>
                  <EditableText
                    as="p"
                    entity="block"
                    id={blocks.body_2.id}
                    field="text"
                    locale={typed}
                    value={blocks.body_2.text}
                    multiline
                    rise
                  />
                </div>
              ) : null}

              {blocks.pull_quote ? (
                <blockquote className="pull-quote pull-quote-plated" data-rise>
                  <PatternPlate tiling="shesh" opacity={0.45} />
                  <EditableText
                    entity="block"
                    id={blocks.pull_quote.id}
                    field="text"
                    locale={typed}
                    value={blocks.pull_quote.text}
                  />
                </blockquote>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Values — the design's card grid, every card plated and badged. */}
      <section className="section" data-rise>
        <div className="page">
          <SectionHead title={t('values')} />
          <ul
            className="columns-tight plate-rota"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {values.map((item, index) => (
              <li key={item.id} data-rise>
                <EditableEntry entity="values" id={item.id} isLast={values.length <= 1}>
                  <Card as="article" className="h-full" plate>
                    <CardStar>
                      <Icon name={VALUE_ICONS[index % VALUE_ICONS.length]} size={24} />
                    </CardStar>
                    <EditableText
                      as="h3"
                      entity="values"
                      id={item.id}
                      field="title"
                      locale={typed}
                      value={item.title}
                      className="card-title"
                      style={{ fontSize: 'var(--text-lg)', marginBlockStart: 'var(--space-2)' }}
                      words="tight"
                    />
                    <EditableText
                      as="p"
                      entity="values"
                      id={item.id}
                      field="body"
                      locale={typed}
                      value={item.body}
                      className="card-body"
                      multiline
                      rise
                    />
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="values" />
          </div>
        </div>
      </section>
    </>
  );
}
