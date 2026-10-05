import { getTranslations } from 'next-intl/server';
import { EnvelopeSimple, Phone, MapPin, InstagramLogo } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { NAV_GROUPS, LEGAL_NAV } from './nav.config';
import { getSettings } from '@/lib/db/queries/content';
import { LocaleSwitch } from './locale-switch';
import { ThemeToggle } from './theme-toggle';
import { PatternPlate } from './ornaments';
import { FooterSkyline } from './footer-skyline';
import { OpeningHours } from './house-info';
import { digits } from '@/lib/i18n/format';
import { FACTS } from '@/lib/site-facts';
import type { ThemeValue } from './theme';
import type { Locale } from '@/lib/i18n/config';

/**
 * The closing band: the house in one line, the same groups the header has,
 * how to reach it (each fact once), the language and theme, the two asks,
 * and the legal line. Nothing is linked twice.
 */
export async function Footer({ locale, theme }: { locale: Locale; theme: ThemeValue }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  const tHouse = await getTranslations({ locale, namespace: 'house' });
  const settings = await getSettings();

  return (
    <div className="footer-city">
      <FooterSkyline />
      <footer className="footer-band">
        <PatternPlate tiling="shesh" drift opacity={0.6} />

        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-name">{tBrand('name')}</p>
            <p className="footer-tagline">{t('tagline')}</p>
            <div className="footer-asks">
              <Link href="/support#member" className="btn btn-sm btn-gold">
                {tNav('join')}
              </Link>
              <Link href="/support#donate" className="btn btn-sm btn-on-scrim">
                {tNav('donate')}
              </Link>
            </div>
          </div>

          <nav aria-label={tNav('footer')} className="footer-nav">
            {NAV_GROUPS.filter((g) => g.items).map((group) => (
              <div key={group.key}>
                <h2 className="footer-head">{tNav(group.key)}</h2>
                <ul>
                  {group.items!.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href}>{tNav(item.key)}</Link>
                    </li>
                  ))}
                  {group.key === 'groupHouse' ? (
                    <>
                      <li>
                        <Link href="/events">{tNav('events')}</Link>
                      </li>
                    </>
                  ) : null}
                </ul>
              </div>
            ))}
          </nav>

          <div className="footer-contact">
            <h2 className="footer-head">
              <Link href="/contact">{tNav('contact')}</Link>
            </h2>
            <ul>
              <li>
                <MapPin size={18} weight="duotone" aria-hidden="true" />
                <span className="ltr-island">{settings.address || FACTS.street}</span>
              </li>
              {settings.contactEmail ? (
                <li>
                  <EnvelopeSimple size={18} weight="duotone" aria-hidden="true" />
                  <a href={`mailto:${settings.contactEmail}`}>
                    <span className="ltr-island">{settings.contactEmail}</span>
                  </a>
                </li>
              ) : null}
              {settings.phone ? (
                <li>
                  <Phone size={18} weight="duotone" aria-hidden="true" />
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>
                    <span className="ltr-island">{settings.phone}</span>
                  </a>
                </li>
              ) : null}
              <li>
                <InstagramLogo size={18} weight="duotone" aria-hidden="true" />
                <a
                  href={`https://www.instagram.com/${FACTS.instagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="ltr-island">@{FACTS.instagram}</span>
                </a>
              </li>
            </ul>
            <h3 className="footer-subhead">{tHouse('hours')}</h3>
            <OpeningHours locale={locale} />
          </div>
        </div>

        <div className="footer-rule">
          <p className="ltr-island" style={{ opacity: 0.8 }}>
            © {digits(new Date().getFullYear(), locale)} {tBrand('name')} · Wien
          </p>
          <div className="footer-prefs">
            <LocaleSwitch className="seg-dark" />
            <ThemeToggle theme={theme} />
          </div>
          <ul className="footer-legal">
            {LEGAL_NAV.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href}>{tNav(entry.key)}</Link>
              </li>
            ))}
            {FACTS.zvr ? (
              <li style={{ opacity: 0.8 }}>
                {t('zvr')} <span className="ltr-island">{FACTS.zvr}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </footer>
    </div>
  );
}
