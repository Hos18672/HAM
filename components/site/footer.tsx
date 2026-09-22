import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import { NAV, LEGAL_NAV } from './nav-links';
import { getBlocks, getSettings } from '@/lib/db/queries/content';
import { EditableText } from '@/components/editable/editable-text';
import { digits } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import { ASSOCIATION } from '@/lib/db/seed-data';

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  const settings = await getSettings();
  const blocks = await getBlocks('home', locale);
  const mission = blocks.footer_mission;

  const participate = NAV.filter((entry) =>
    ['courses', 'events', 'community', 'gallery'].includes(entry.key),
  );

  return (
    <footer className="section" style={{ paddingBlockStart: 'var(--space-9)' }}>
      <div className="page">
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-6)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
            alignItems: 'start',
          }}
        >
          {/* Mission */}
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            <p className="kicker">{t('mission')}</p>
            <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
              {tBrand('name')}
            </p>
            {mission ? (
              <EditableText
                as="p"
                entity="block"
                id={mission.id}
                field="text"
                locale={locale}
                value={mission.text}
                className="text-sm"
                style={{ color: 'var(--color-ink-muted)' }}
              />
            ) : null}
          </div>

          {/* Contact */}
          <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
            <p className="kicker">{t('contact')}</p>
            <p className="text-sm">
              <span className="ltr-island">{settings.address || ASSOCIATION.street}</span>
            </p>
            {settings.phone ? (
              <p className="text-sm">
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                  <span className="ltr-island">{settings.phone}</span>
                </a>
              </p>
            ) : null}
            {settings.contactEmail ? (
              <p className="text-sm">
                <a href={`mailto:${settings.contactEmail}`}>
                  <span className="ltr-island">{settings.contactEmail}</span>
                </a>
              </p>
            ) : null}
          </div>

          {/* Participate */}
          <nav style={{ display: 'grid', gap: 'var(--space-1)' }} aria-label={t('participate')}>
            <p className="kicker">{t('participate')}</p>
            {participate.map((entry) => (
              <Link key={entry.href} href={entry.href} className="text-sm">
                {tNav(entry.key)}
              </Link>
            ))}
            <Link href="/support" className="text-sm">
              {tNav('support')}
            </Link>
          </nav>

          {/* Legal */}
          <nav style={{ display: 'grid', gap: 'var(--space-1)' }} aria-label={t('legal')}>
            <p className="kicker">{t('legal')}</p>
            {LEGAL_NAV.map((entry) => (
              <Link key={entry.href} href={entry.href} className="text-sm">
                {tNav(entry.key)}
              </Link>
            ))}
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              {t('zvr')} <span className="ltr-island">{ASSOCIATION.zvr}</span>
            </p>
          </nav>
        </div>

        <p
          className="text-xs"
          style={{ color: 'var(--color-ink-faint)', marginBlockStart: 'var(--space-7)' }}
        >
          {/* The year is a number the reader reads, so it takes their numerals
              — it was the one Latin digit left on every Persian page. */}
          © {digits(new Date().getFullYear(), locale)} {tBrand('name')}. {t('rights')}
        </p>
      </div>
    </footer>
  );
}
