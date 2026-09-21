import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MapPin, Phone, EnvelopeSimple, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { getPageHeader, getBlocks, getSettings } from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { ContactForm } from '@/components/site/contact-form';
import { EditableText } from '@/components/editable/editable-text';
import { JsonLd, placeJsonLd } from '@/lib/seo';
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
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, settings] = await Promise.all([
    getPageHeader('contact', typed),
    getBlocks('contact', typed),
    getSettings(),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'contact' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });

  const hours = blocks.opening_hours?.items ?? [];

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', ...placeJsonLd(settings) }} />

      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page">
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-7)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(20rem, 100%), 1fr))',
              alignItems: 'start',
            }}
          >
            {/* Details */}
            <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <p className="kicker">{t('address')}</p>
                <p className="flex items-start gap-2">
                  <MapPin size={20} weight="duotone" aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span className="ltr-island">{settings.address}</span>
                </p>
                {settings.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone
                      size={20}
                      weight="duotone"
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    />
                    <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                      <span className="ltr-island">{settings.phone}</span>
                    </a>
                  </p>
                ) : null}
                {settings.contactEmail ? (
                  <p className="flex items-center gap-2">
                    <EnvelopeSimple
                      size={20}
                      weight="duotone"
                      aria-hidden="true"
                      style={{ flexShrink: 0 }}
                    />
                    <a href={`mailto:${settings.contactEmail}`}>
                      <span className="ltr-island">{settings.contactEmail}</span>
                    </a>
                  </p>
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

              {hours.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                  <p className="kicker">{t('openingHours')}</p>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'grid',
                      gap: '2px',
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
              ) : null}
            </div>

            {/* Form */}
            <div>
              <SectionHead kicker={t('topic')} />
              <ContactForm locale={typed} defaultTopic={topic} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
