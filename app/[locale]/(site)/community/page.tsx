import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getBlocks, getCommunityCards } from '@/lib/db/queries/content';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead } from '@/components/site/page-head';
import { Words } from '@/components/site/words';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Decorative badges, cycled. A community card carries no icon field. */
const COMMUNITY_ICONS = ['Handshake', 'Translate', 'UsersThree', 'Heart', 'Coffee', 'Sparkle'];

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

  const t = await getTranslations({ locale, namespace: 'community' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      <section className="section section-alt" data-rise>
        <div className="page">
          <ul
            className="columns-tight plate-rota"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {cards.map((card, index) => (
              <li key={card.id} data-rise>
                <EditableEntry entity="community" id={card.id} isLast={cards.length <= 1}>
                  <Card as="article" className="card-plate-bottom h-full" plate>
                    <CardStar>
                      <Icon name={COMMUNITY_ICONS[index % COMMUNITY_ICONS.length]} size={26} />
                    </CardStar>
                    <EditableText
                      as="h2"
                      entity="community"
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
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="community" />
          </div>
        </div>
      </section>

      {/* The closing ask. The design sets this as a rounded panel of the band
          inside the page, with the ground drifting behind it — not as a
          full-bleed section. */}
      <section className="section" data-rise>
        <div className="page">
          <div className="cta-panel glow" data-rise>
            <PatternPlate tiling="shesh" drift opacity={0.55} />
            <div className="cta-panel-in">
              <div>
                <Words as="h2" style={{ fontSize: 'var(--text-3xl)' }}>
                  {t('volunteerTitle')}
                </Words>
                {blocks.cta_note ? (
                  <EditableText
                    as="p"
                    entity="block"
                    id={blocks.cta_note.id}
                    field="text"
                    locale={typed}
                    value={blocks.cta_note.text}
                    style={{
                      marginBlockStart: 'var(--space-3)',
                      color: 'var(--bandDim)',
                      maxInlineSize: '36em',
                    }}
                    multiline
                  />
                ) : null}
              </div>
              <div className="cta-actions">
                <LinkButton
                  href={`/${locale}/contact?topic=volunteer`}
                  size="lg"
                  className="btn-gold"
                >
                  {tActions('volunteer')}
                </LinkButton>
                <LinkButton href={`/${locale}/support`} variant="on-scrim" size="lg">
                  {tNav('support')}
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
