import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import {
  getPageHeader,
  getBlocks,
  getCultureCards,
  getUpcomingEvents,
} from '@/lib/db/queries/content';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { EventRow } from '@/components/site/event-row';
import { PatternPlate } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Icon } from '@/components/site/icon';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

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
  const typed = requireLocale(locale);

  const [header, blocks, cards, upcoming] = await Promise.all([
    getPageHeader('culture', typed),
    getBlocks('culture', typed),
    getCultureCards(typed),
    getUpcomingEvents(typed, 40),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'culture' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });

  const themes = blocks.theme_chips?.items ?? [];
  const cultureEvents = upcoming.filter((event) => event.category === 'culture').slice(0, 4);

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* What happens here, as a list — and the themes it draws on as plain
          words, not chips that look like they could be pressed. */}
      <section className="section">
        <div className="page culture-layout">
          <div>
            <SectionHead title={t('formats')} />
            <ul className="info-list info-list-single">
              {cards.map((card, index) => (
                <li key={card.id} data-rise>
                  <EditableEntry entity="culture" id={card.id} isLast={cards.length <= 1}>
                    <div className="info-item">
                      <span className="link-row-icon">
                        <Icon name={CULTURE_ICONS[index % CULTURE_ICONS.length]} size={24} />
                      </span>
                      <EditableText
                        as="h3"
                        entity="culture"
                        id={card.id}
                        field="title"
                        locale={typed}
                        value={card.title}
                      />
                      <EditableText
                        as="p"
                        entity="culture"
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
              <EditableAdd entity="culture" />
            </div>
          </div>

          {themes.length > 0 ? (
            <aside className="surf culture-themes" aria-labelledby="culture-themes">
              <PatternPlate tiling="shesh" opacity={0.35} />
              <div style={{ position: 'relative' }}>
                <h2 id="culture-themes" className="kicker">
                  {t('themes')}
                </h2>
                <p className="culture-theme-words">
                  {themes.map((theme, index) => (
                    <span key={theme}>
                      {theme}
                      {index < themes.length - 1 ? (
                        <span aria-hidden="true" className="culture-dot">
                          {' · '}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      {/* What is coming up, from the events themselves. */}
      <section className="section section-alt">
        <div className="page">
          <SectionHead title={t('upcoming')} />
          {cultureEvents.length > 0 ? (
            <ul className="event-list">
              {cultureEvents.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} locale={typed} />
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--ink2)' }}>{t('noUpcoming')}</p>
          )}
          <p style={{ marginBlockStart: 'var(--space-4)' }}>
            <Link href="/events" className="inline-go">
              {tActions('allEvents')}
              <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
            </Link>
          </p>
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
