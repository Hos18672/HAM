import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getBlocks, getCommunityCards } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
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
  return pageMetadata('community', locale, '/community');
}

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, cards] = await Promise.all([
    getPageHeader('community', typed),
    getBlocks('community', typed),
    getCommunityCards(typed),
  ]);
  if (!header) notFound();

  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      <section className="section" data-rise>
        <div className="page">
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {cards.map((card) => (
              <li key={card.id} data-rise>
                <EditableEntry entity="community" id={card.id} isLast={cards.length <= 1}>
                  <Card as="article" className="h-full">
                    <EditableText
                      as="h2"
                      entity="community"
                      id={card.id}
                      field="title"
                      locale={typed}
                      value={card.title}
                      className="card-title"
                      words="tight"
                    />
                    <EditableText
                      as="p"
                      entity="community"
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
            <EditableAdd entity="community" />
          </div>
        </div>
      </section>

      {/* The two calls to action. */}
      <section className="section-loose section-alt" data-rise>
        <div className="page">
          <div style={{ display: 'grid', gap: 'var(--space-4)', maxInlineSize: 'var(--measure)' }}>
            {blocks.cta_note ? (
              <EditableText
                as="p"
                entity="block"
                id={blocks.cta_note.id}
                field="text"
                locale={typed}
                value={blocks.cta_note.text}
                className="lead"
                multiline
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/${locale}/contact?topic=volunteer`} size="lg">
                {tActions('volunteer')}
              </LinkButton>
              <LinkButton href={`/${locale}/support`} variant="secondary" size="lg">
                {tNav('support')}
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
