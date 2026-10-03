import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getBlocks } from '@/lib/db/queries/content';
import { FACTS, HISTORY, BOARD } from '@/lib/site-facts';
import { digits } from '@/lib/i18n/format';
import { Mark, PatternPlate, ViennaSkyline } from '@/components/site/ornaments';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { EditableText } from '@/components/editable/editable-text';
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

  const [header, blocks] = await Promise.all([
    getPageHeader('about', typed),
    getBlocks('about', typed),
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

      {/* The house's history, as a timeline. */}
      <section className="section">
        <div className="page about-layout">
          <div>
            <SectionHead title={t('history')} />
            <ol className="timeline">
              {HISTORY.map((step) => (
                <li key={step.de}>
                  <span className="timeline-dot" aria-hidden="true" />
                  {step.year ? (
                    <span className="timeline-year tabular">{digits(step.year, typed)}</span>
                  ) : null}
                  <p>{step[typed]}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Who is behind it: the registered association, and its board once
              the names are known. */}
          <aside className="surf about-facts" aria-labelledby="about-facts">
            <h2 id="about-facts" className="kicker">
              {t('association')}
            </h2>
            <dl className="meta-grid">
              <div>
                <dt>{t('name')}</dt>
                <dd>{typed === 'fa' ? FACTS.nameFa : FACTS.nameDe}</dd>
              </div>
              <div>
                <dt>{t('form')}</dt>
                <dd>{t('formValue')}</dd>
              </div>
              <div>
                <dt>{t('seat')}</dt>
                <dd>
                  <span className="ltr-island">
                    {FACTS.street}, {FACTS.postcode} {FACTS.city}
                  </span>
                </dd>
              </div>
              {FACTS.zvr ? (
                <div>
                  <dt>{t('zvr')}</dt>
                  <dd className="ltr-island">{FACTS.zvr}</dd>
                </div>
              ) : null}
            </dl>
            {BOARD.length > 0 ? (
              <>
                <h3 className="kicker" style={{ marginBlockStart: 'var(--space-4)' }}>
                  {t('board')}
                </h3>
                <dl className="meta-grid">
                  {BOARD.map((member) => (
                    <div key={member.name}>
                      <dt>{member[typed]}</dt>
                      <dd>{member.name}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
