import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Check } from '@phosphor-icons/react/dist/ssr';
import { getPageHeader, getBlocks, getMemberships, getSettings } from '@/lib/db/queries/content';
import { PageHead, SectionHead } from '@/components/site/page-head';
import { SupportForm } from '@/components/site/support-form';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, FactPair } from '@/components/ui/card';
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
  return pageMetadata('support', locale, '/support');
}

export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, tiers, settings] = await Promise.all([
    getPageHeader('support', typed),
    getBlocks('support', typed),
    getMemberships(typed),
    getSettings(),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'support' });

  const tierOptions = tiers.map((tier) => ({ value: tier.tierKey, label: tier.title }));
  const purposes = blocks.donation_purposes?.items ?? [];
  const purposeOptions = purposes.map((purpose) => ({ value: purpose, label: purpose }));

  return (
    <>
      <PageHead header={header} locale={typed} />

      {/* Membership tiers, each with its own form. */}
      <section className="section">
        <div className="page">
          <SectionHead kicker={t('membership')} />
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {tiers.map((tier) => (
              <li key={tier.id} data-rise>
                <EditableEntry entity="membership" id={tier.id} isLast={tiers.length <= 1}>
                  <Card as="article" className="h-full">
                    <EditableText
                      as="h2"
                      entity="membership"
                      id={tier.id}
                      field="title"
                      locale={typed}
                      value={tier.title}
                      className="card-title"
                    />
                    <EditableText
                      as="p"
                      entity="membership"
                      id={tier.id}
                      field="priceLabel"
                      locale={typed}
                      value={tier.priceLabel}
                      style={{
                        fontSize: 'var(--text-xl)',
                        color: 'var(--color-accent-text)',
                        fontWeight: 'var(--weight-bold)',
                      }}
                    />
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'grid',
                        gap: 'var(--space-1)',
                      }}
                    >
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 text-sm">
                          <Check
                            size={16}
                            weight="bold"
                            aria-hidden="true"
                            style={{
                              color: 'var(--color-accent)',
                              flexShrink: 0,
                              marginBlockStart: '0.25em',
                            }}
                          />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginBlockStart: 'auto', paddingBlockStart: 'var(--space-4)' }}>
                      <SupportForm
                        locale={typed}
                        mode="membership"
                        options={tierOptions}
                        preselected={tier.tierKey}
                        compact
                      />
                    </div>
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="membership" />
          </div>
        </div>
      </section>

      {/* Donation */}
      {purposeOptions.length > 0 ? (
        <section className="section" data-rise>
          <div className="page">
            <div className="rail">
              <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
                <p className="kicker">{t('donation')}</p>
              </div>
              <div style={{ maxInlineSize: '36rem' }}>
                <SupportForm locale={typed} mode="donation" options={purposeOptions} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Bank details — an LTR island inside Persian text. */}
      {settings.iban ? (
        <section className="section-loose" data-rise>
          <div className="page">
            <Card variant="soft" style={{ maxInlineSize: '36rem' }}>
              <p className="kicker">{t('bankDetails')}</p>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {blocks.account_holder ? (
                  <FactPair
                    label={t('accountHolder')}
                    value={
                      <EditableText
                        entity="block"
                        id={blocks.account_holder.id}
                        field="text"
                        locale={typed}
                        value={blocks.account_holder.text}
                      />
                    }
                  />
                ) : null}
                <FactPair
                  label={t('iban')}
                  value={
                    <span
                      className="ltr-island tabular"
                      style={{ fontSize: 'var(--text-lg)', letterSpacing: '0.04em' }}
                    >
                      {settings.iban}
                    </span>
                  }
                />
              </div>
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
