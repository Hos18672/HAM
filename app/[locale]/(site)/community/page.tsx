import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { contactHref } from '@/lib/topics';
import { getPageHeader, getBlocks, getCommunityCards } from '@/lib/db/queries/content';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead } from '@/components/site/page-head';
import { Words } from '@/components/site/words';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { LinkButton } from '@/components/ui/button';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

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
  const typed = requireLocale(locale);

  const [header, blocks, cards] = await Promise.all([
    getPageHeader('community', typed),
    getBlocks('community', typed),
    getCommunityCards(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'community' });

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* Two ways in, first: for someone who needs a hand, and for someone
          who wants to give one. */}
      <section className="section section-tight">
        <div className="page">
          <div className="cta-panel" data-rise>
            <PatternPlate tiling="shesh" drift opacity={0.55} />
            <div className="cta-panel-in">
              <div>
                <Words as="h2" style={{ fontSize: 'var(--text-3xl)' }}>
                  {t('helpTitle')}
                </Words>
                <p
                  style={{
                    marginBlockStart: 'var(--space-3)',
                    color: 'var(--bandDim)',
                    maxInlineSize: '50ch',
                  }}
                >
                  {t('helpLead')}
                </p>
              </div>
              <div className="cta-actions">
                <LinkButton href={contactHref(typed, 'help')} size="lg" className="btn-band">
                  {t('askForHelp')}
                </LinkButton>
                <LinkButton href={contactHref(typed, 'volunteer')} variant="on-scrim" size="lg">
                  {t('volunteer')}
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What the neighbourhood help covers: information, not links, so a
          plain list rather than cards that look clickable. */}
      <section className="section section-alt">
        <div className="page">
          <ul className="info-list">
            {cards.map((card, index) => (
              <li key={card.id} data-rise>
                <EditableEntry entity="community" id={card.id} isLast={cards.length <= 1}>
                  <div className="info-item">
                    <span className="link-row-icon">
                      <Icon name={COMMUNITY_ICONS[index % COMMUNITY_ICONS.length]} size={24} />
                    </span>
                    <EditableText
                      as="h2"
                      entity="community"
                      id={card.id}
                      field="title"
                      locale={typed}
                      value={card.title}
                    />
                    <EditableText
                      as="p"
                      entity="community"
                      id={card.id}
                      field="body"
                      locale={typed}
                      value={card.body}
                      multiline
                    />
                  </div>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="community" />
          </div>
          {blocks.cta_note ? (
            <EditableText
              as="p"
              entity="block"
              id={blocks.cta_note.id}
              field="text"
              locale={typed}
              value={blocks.cta_note.text}
              className="lead"
              style={{ marginBlockStart: 'var(--space-6)', maxInlineSize: '65ch' }}
              multiline
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
