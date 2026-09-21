import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getPageHeader, getBlocks, getCultureCards } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
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
  return pageMetadata('culture', locale, '/culture');
}

export default async function CulturePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, cards] = await Promise.all([
    getPageHeader('culture', typed),
    getBlocks('culture', typed),
    getCultureCards(typed),
  ]);
  if (!header) notFound();

  const chips = blocks.theme_chips?.items ?? [];

  return (
    <>
      <PageHead header={header} locale={typed} />

      {chips.length > 0 ? (
        <section className="section-tight">
          <div className="page">
            <ul className="flex flex-wrap gap-2" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {chips.map((chip) => (
                <li key={chip}>
                  <Tag>{chip}</Tag>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="section" data-rise>
        <div className="page">
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {cards.map((card) => (
              <li key={card.id} data-rise>
                <EditableEntry entity="culture" id={card.id} isLast={cards.length <= 1}>
                  <Card as="article" className="h-full">
                    <EditableText
                      as="h2"
                      entity="culture"
                      id={card.id}
                      field="title"
                      locale={typed}
                      value={card.title}
                      className="card-title"
                    />
                    <EditableText
                      as="p"
                      entity="culture"
                      id={card.id}
                      field="body"
                      locale={typed}
                      value={card.body}
                      className="card-body"
                      multiline
                    />
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="culture" />
          </div>
        </div>
      </section>

      {/* The poem block: serif italic, generous leading, poet attribution. */}
      {blocks.poem_text ? (
        <section className="section-loose" data-rise>
          <div className="page">
            <figure style={{ margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
              <blockquote className="poem" style={{ margin: 0 }}>
                <EditableText
                  as="span"
                  entity="block"
                  id={blocks.poem_text.id}
                  field="text"
                  locale={typed}
                  value={blocks.poem_text.text}
                  multiline
                  style={{ whiteSpace: 'pre-line' }}
                />
              </blockquote>
              {blocks.poem_attribution ? (
                <figcaption className="kicker">
                  <EditableText
                    entity="block"
                    id={blocks.poem_attribution.id}
                    field="text"
                    locale={typed}
                    value={blocks.poem_attribution.text}
                  />
                </figcaption>
              ) : null}
            </figure>
          </div>
        </section>
      ) : null}
    </>
  );
}
