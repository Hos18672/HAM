import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import {
  MapPin,
  Phone,
  EnvelopeSimple,
  Clock,
  ArrowSquareOut,
} from '@phosphor-icons/react/dist/ssr';
import { getPageHeader, getBlocks, getSettings } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { ContactForm } from '@/components/site/contact-form';
import { PatternPlate } from '@/components/site/ornaments';
import { EditableText } from '@/components/editable/editable-text';
import { JsonLd, placeJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('contact', locale, '/contact');
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string }>;
}) {
  const { locale } = await params;
  const { topic } = await searchParams;
  const typed = requireLocale(locale);

  const [header, blocks, settings] = await Promise.all([
    getPageHeader('contact', typed),
    getBlocks('contact', typed),
    getSettings(),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'contact' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });

  const hours = blocks.opening_hours?.items ?? [];

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', ...placeJsonLd(settings) }} />

      <PageHead header={header} locale={typed} />

      <section className="section" data-rise>
        <div className="page">
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-7)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(20rem, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            {/* Form.

                The design opens the page with the invitation to write, and
                keeps the house's own details beside it. */}
            <div>
              <h2 style={{ fontSize: 'clamp(25px, 3vw, 36px)' }}>{t('formTitle')}</h2>
              <div style={{ marginBlockStart: 'var(--space-5)' }}>
                <ContactForm locale={typed} defaultTopic={topic} />
              </div>
            </div>

            {/* Details.

                The design puts these in a panel of their own rather than
                loose in a column: a card with the girih plate behind it, the
                house's name at the top, and each fact behind its own icon. */}
            <div
              className="surf"
              data-rise
              style={{
                position: 'relative',
                background: 'var(--card)',
                border: 'var(--rule-hair) solid var(--line)',
                padding: 'clamp(22px, 3vw, 32px)',
              }}
            >
              <PatternPlate opacity={0.4} />

              <div style={{ position: 'relative', display: 'grid', gap: 'var(--space-2)' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--weight-bold)',
                  }}
                >
                  {tBrand('name')}
                </p>
                <p className="kicker">{tBrand('sub')}</p>

                <div
                  style={{
                    marginBlockStart: 'var(--space-4)',
                    display: 'grid',
                    gap: 'var(--space-4)',
                  }}
                >
                  <p className="flex items-start gap-3">
                    <MapPin
                      size={20}
                      weight="duotone"
                      aria-hidden="true"
                      style={{ flexShrink: 0, color: 'var(--green)' }}
                    />
                    <span className="ltr-island">{settings.address}</span>
                  </p>
                  {settings.contactEmail ? (
                    <p className="flex items-start gap-3">
                      <EnvelopeSimple
                        size={20}
                        weight="duotone"
                        aria-hidden="true"
                        style={{ flexShrink: 0, color: 'var(--green)' }}
                      />
                      <a href={`mailto:${settings.contactEmail}`}>
                        <span className="ltr-island">{settings.contactEmail}</span>
                      </a>
                    </p>
                  ) : null}
                  {settings.phone ? (
                    <p className="flex items-start gap-3">
                      <Phone
                        size={20}
                        weight="duotone"
                        aria-hidden="true"
                        style={{ flexShrink: 0, color: 'var(--green)' }}
                      />
                      <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                        <span className="ltr-island">{settings.phone}</span>
                      </a>
                    </p>
                  ) : null}
                  {hours.length > 0 ? (
                    <div className="flex items-start gap-3">
                      <Clock
                        size={20}
                        weight="duotone"
                        aria-hidden="true"
                        style={{ flexShrink: 0, color: 'var(--green)' }}
                      />
                      <div>
                        <p className="kicker">{t('openingHours')}</p>
                        <ul
                          style={{
                            listStyle: 'none',
                            margin: 0,
                            padding: 0,
                            display: 'grid',
                            gap: '2px',
                            marginBlockStart: 'var(--space-1)',
                          }}
                        >
                          {hours.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        {blocks.opening_hours ? (
                          <EditableText
                            as="p"
                            entity="block"
                            id={blocks.opening_hours.id}
                            field="items"
                            locale={typed}
                            value={hours.join('\n')}
                            multiline
                            className="visually-hidden"
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {settings.mapUrl ? (
                    <p>
                      <a
                        href={settings.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                        style={{ width: 'fit-content' }}
                      >
                        {t('showOnMap')}
                        <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
                        <span className="visually-hidden">{tA11y('externalLink')}</span>
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
