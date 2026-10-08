import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getBlocks, getMemberships, getSettings } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { SupportTabs } from '@/components/site/support-tabs';
import { CopyButton } from '@/components/site/copy-button';
import { FACTS } from '@/lib/site-facts';
import { SupportForm } from '@/components/site/support-form';
import { EditableText } from '@/components/editable/editable-text';
import { FactPair } from '@/components/ui/card';
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
  return pageMetadata('support', locale, '/support');
}

export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, blocks, tiers, settings] = await Promise.all([
    getPageHeader('support', typed),
    getBlocks('support', typed),
    getMemberships(typed),
    getSettings(),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'support' });

  const tierOptions = tiers.map((tier) => ({
    value: tier.tierKey,
    label: tier.title,
    price: tier.priceLabel,
    benefits: tier.benefits,
  }));
  const purposes = blocks.donation_purposes?.items ?? [];
  const purposeOptions = purposes.map((purpose) => ({ value: purpose, label: purpose }));

  const member = (
    <div className="support-panel">
      <h2 className="support-h">{t('memberTitle')}</h2>
      <p className="support-lead">{t('memberLead')}</p>
      <div className="form-card">
        <SupportForm locale={typed} mode="membership" options={tierOptions} />
      </div>
    </div>
  );

  const donate = (
    <div className="support-panel support-donate">
      <div>
        <h2 className="support-h">{t('donationTitle')}</h2>
        <p className="support-lead">{t('donationLead')}</p>
        {purposeOptions.length > 0 ? (
          <div className="form-card">
            <SupportForm locale={typed} mode="donation" options={purposeOptions} />
          </div>
        ) : null}
      </div>

      {/* The bank details, with the IBAN one tap from the clipboard. Hidden
          entirely until a real IBAN is known — never a row of zeros. */}
      <aside className="surf bank-card" aria-labelledby="bank-title">
        <h3 id="bank-title" className="kicker">
          {t('bankDetails')}
        </h3>
        {settings.iban ? (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p className="support-lead" style={{ margin: 0 }}>
              {t('bankLead')}
            </p>
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
              value={<span className="ltr-island tabular iban">{settings.iban}</span>}
            />
            {FACTS.bic ? (
              <FactPair
                label={t('bic')}
                value={<span className="ltr-island tabular">{FACTS.bic}</span>}
              />
            ) : null}
            <CopyButton value={settings.iban.replace(/\s/g, '')} label={t('copyIban')} />
          </div>
        ) : (
          <p className="support-lead" style={{ margin: 0 }}>
            {t('bankMissing')}
          </p>
        )}
      </aside>
    </div>
  );

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section">
        <div className="page">
          <SupportTabs member={member} donate={donate} />
        </div>
      </section>
    </>
  );
}
