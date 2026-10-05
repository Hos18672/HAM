import { getTranslations } from 'next-intl/server';
import {
  EnvelopeSimple,
  InstagramLogo,
  MapPin,
  NavigationArrow,
  Phone,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { FOOTER_GROUPS, LEGAL_NAV } from './nav.config';
import { getSettings } from '@/lib/db/queries/content';
import { ThemeToggle } from './theme-toggle';
import { Mark } from './ornaments';
import { OpeningHours } from './house-info';
import { OpenStatus, RouteLink } from './contact-visit';
import { LangSwitch } from '../ui/lang-switch';
import { digits } from '@/lib/i18n/format';
import { weekdayName } from '@/lib/schedule';
import { FACTS, OPENING_HOURS } from '@/lib/site-facts';
import type { ThemeValue } from './theme';
import type { Locale } from '@/lib/i18n/config';

/**
 * The footer, on the paper. Wide screens: one rounded container with five
 * columns — the house, its three groups of pages, and how to visit — over a
 * chip-coloured bar with the legal line, the language and the theme. Phones:
 * the house, its address, whether it is open today, three quick ways to reach
 * it, the groups in two columns, and the legal line. Every link once.
 */
export async function Footer({ locale, theme }: { locale: Locale; theme: ThemeValue }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  const tHouse = await getTranslations({ locale, namespace: 'house' });
  const tContact = await getTranslations({ locale, namespace: 'contact' });
  const settings = await getSettings();

  const dayNames = [1, 2, 3, 4, 5, 6, 7].map((day) => weekdayName(day, locale));
  const clocks = Object.fromEntries(
    OPENING_HOURS.flatMap((w) => [w.open, w.close])
      .filter((clock): clock is string => Boolean(clock))
      .map((clock) => [clock, digits(clock, locale)]),
  );
  const email = settings.contactEmail;
  const phone = settings.phone;

  return (
    <footer className="site-footer">
      <div className="footer-box">
        <div className="footer-brand">
          <Link href="/" className="footer-brand-link">
            <span className="footer-mark">
              <Mark className="" />
            </span>
            <span className="footer-name">{tBrand('name')}</span>
          </Link>
          <p className="footer-tagline">{t('tagline')}</p>
        </div>

        <div className="footer-contact">
          <h2 className="footer-head">{t('visit')}</h2>
          <p className="footer-address">
            <MapPin size={18} weight="duotone" aria-hidden="true" />
            <span className="ltr-island">{settings.address || FACTS.street}</span>
          </p>
          <OpenStatus dayNames={dayNames} clocks={clocks} />
          <ul className="footer-quick">
            {email ? (
              <li>
                <a className="pill pill-soft pill-44" href={`mailto:${email}`}>
                  <EnvelopeSimple size={18} weight="duotone" aria-hidden="true" />
                  {tContact('emailAction')}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li>
                <a className="pill pill-soft pill-44" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                  <Phone size={18} weight="duotone" aria-hidden="true" />
                  <span className="ltr-island">{phone}</span>
                </a>
              </li>
            ) : null}
            <li>
              <a
                className="pill pill-soft pill-44"
                href={`https://www.instagram.com/${FACTS.instagram}/`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tHouse('instagram')} @${FACTS.instagram}`}
              >
                <InstagramLogo size={18} weight="duotone" aria-hidden="true" />
                {tHouse('instagram')}
              </a>
            </li>
            <li>
              <RouteLink className="pill pill-soft pill-44">
                <NavigationArrow size={18} weight="duotone" aria-hidden="true" className="mirror" />
                {tContact('route')}
              </RouteLink>
            </li>
          </ul>
          <div className="footer-hours">
            <h3 className="footer-subhead">{tHouse('hours')}</h3>
            <OpeningHours locale={locale} />
          </div>
        </div>

        <nav aria-label={tNav('footer')} className="footer-nav">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.key} className="footer-group">
              <h2 className="footer-head">{tNav(group.key)}</h2>
              <ul>
                {group.items!.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{tNav(item.key)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="footer-bar">
          <ul className="footer-legal">
            <li className="ltr-island">
              © {digits(new Date().getFullYear(), locale)} {tBrand('name')}
            </li>
            {LEGAL_NAV.map((entry) => (
              <li key={entry.href}>
                <Link href={entry.href}>{tNav(entry.key)}</Link>
              </li>
            ))}
            {FACTS.zvr ? (
              <li>
                {t('zvr')} <span className="ltr-island">{FACTS.zvr}</span>
              </li>
            ) : null}
          </ul>
          <div className="footer-prefs">
            <LangSwitch labels="full" />
            <ThemeToggle theme={theme} className="icon-circle footer-theme" />
          </div>
        </div>
      </div>
    </footer>
  );
}
