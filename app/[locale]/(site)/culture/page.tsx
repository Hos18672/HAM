import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getBlocks, getCultureCards } from '@/lib/db/queries/content';
import { Mark, PatternPlate } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Decorative badges, cycled. The cards themselves carry no icon field. */
const CULTURE_ICONS = ['BookOpen', 'Sparkle', 'MusicNotes', 'PaintBrush', 'Moon', 'Star'];

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

  const t = await getTranslations({ locale, namespace: 'culture' });

  const chips = blocks.theme_chips?.items ?? [];

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* The themes, set against a square panel — a photograph in the design,
          ornament here. */}
      {chips.length > 0 ? (
        <section className="section section-alt" data-rise>
          <div className="page">
            <div className="split">
              <div>
                <SectionHead title={t('themes')} />
                <ul
                  className="flex flex-wrap gap-2"
                  style={{ listStyle: 'none', margin: 0, padding: 0 }}
                  data-rise
                >
                  {chips.map((chip) => (
                    <li key={chip}>
                      <Tag>{chip}</Tag>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="frame ornament-panel"
                style={{ aspectRatio: '1 / 1', maxBlockSize: '520px' }}
                data-rise
              >
                <PatternPlate tiling="shesh" opacity={0.5} />
                <div className="ornament-mark">
                  <Mark className="" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" data-rise>
        <div className="page">
          <ul
            className="columns-tight plate-rota"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {cards.map((card, index) => (
              <li key={card.id} data-rise>
                <EditableEntry entity="culture" id={card.id} isLast={cards.length <= 1}>
                  <Card as="article" className="h-full" plate>
                    <CardStar>
                      <Icon name={CULTURE_ICONS[index % CULTURE_ICONS.length]} size={24} />
                    </CardStar>
                    <EditableText
                      as="h2"
                      entity="culture"
                      id={card.id}
                      field="title"
                      locale={typed}
                      value={card.title}
                      className="card-title"
                      style={{ fontSize: 'var(--text-lg)', marginBlockStart: 'var(--space-2)' }}
                      words="tight"
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
                      rise
                    />
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="culture" />
          </div>
        </div>
      </section>

      {/* The poem block: serif italic, generous leading, poet attribution. */}
      {blocks.poem_text ? (
        <section className="section-loose section-alt" data-rise>
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
                  rise
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
