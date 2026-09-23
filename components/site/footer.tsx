import { getTranslations } from 'next-intl/server';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { NAV, LEGAL_NAV } from './nav-links';
import { getBlocks, getSettings } from '@/lib/db/queries/content';
import { EditableText } from '@/components/editable/editable-text';
import { LocaleSwitch } from './locale-switch';
import { PatternPlate } from './ornaments';
import { LinkButton } from '../ui/button';
import { digits } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import { ASSOCIATION } from '@/lib/db/seed-data';

/**
 * The closing band.
 *
 * The design ends every page on near-black green with the girih ground
 * drifting behind it: four columns under gold heads, then a hairline and the
 * legal line. The plate is the same tiling the cards use, at 0.8, and it is
 * the one place on the site where the pattern is allowed to move.
 */
export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const settings = await getSettings();
  const blocks = await getBlocks('home', locale);
  const mission = blocks.footer_mission;

  const participate = NAV.filter((entry) =>
    ['courses', 'events', 'community', 'gallery'].includes(entry.key),
  );

  return (
    <footer className="footer-band">
      <PatternPlate tiling="shesh" drift opacity={0.6} />

      <div className="footer-inner">
        {/* The association, and the two ways to reach it directly. */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18.5px',
              fontWeight: 'var(--weight-bold)',
              color: '#ffffff',
            }}
          >
            {tBrand('name')}
          </p>
          <p className="footer-head" style={{ marginBlockStart: '3px', letterSpacing: '0.16em' }}>
            {tBrand('sub')}
          </p>

          {mission ? (
            <EditableText
              as="p"
              entity="block"
              id={mission.id}
              field="text"
              locale={locale}
              value={mission.text}
              style={{
                marginBlockStart: '22px',
                fontSize: '14.5px',
                lineHeight: 1.9,
                maxInlineSize: '30em',
              }}
            />
          ) : null}

          <div
            style={{
              marginBlockStart: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {settings.contactEmail ? (
              <a
                className="band-icon lift"
                href={`mailto:${settings.contactEmail}`}
                aria-label={t('contact')}
              >
                <EnvelopeSimple size={21} weight="duotone" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        {/* Where to go next. */}
        <nav aria-label={t('participate')}>
          <p className="footer-head">{t('participate')}</p>
          <div
            style={{
              marginBlockStart: '20px',
              display: 'grid',
              gap: '12px',
              justifyItems: 'start',
            }}
          >
            {participate.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="lift"
                style={{ fontSize: '14.5px' }}
              >
                {tNav(entry.key)}
              </Link>
            ))}
            <Link href="/support" className="lift" style={{ fontSize: '14.5px' }}>
              {tNav('support')}
            </Link>
          </div>
        </nav>

        {/* Where the house is, and in which language you would like it. */}
        <div>
          <p className="footer-head">{t('contact')}</p>
          <p style={{ marginBlockStart: '20px', fontSize: '14.5px', lineHeight: 1.95 }}>
            <span className="ltr-island">{settings.address || ASSOCIATION.street}</span>
          </p>
          <p style={{ marginBlockStart: '14px', fontSize: '14.5px', lineHeight: 1.95 }}>
            {settings.contactEmail ? (
              <a href={`mailto:${settings.contactEmail}`}>
                <span className="ltr-island">{settings.contactEmail}</span>
              </a>
            ) : null}
            {settings.phone ? (
              <>
                <br />
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                  <span className="ltr-island">{settings.phone}</span>
                </a>
              </>
            ) : null}
          </p>

          <LocaleSwitch
            className="seg-dark"
            style={{ marginBlockStart: '22px', justifySelf: 'start', maxInlineSize: '230px' }}
          />
        </div>

        {/* The ask. */}
        <div>
          <p className="footer-head">{t('join')}</p>
          <p style={{ marginBlockStart: '20px', fontSize: '14.5px', lineHeight: 1.9 }}>
            {t('joinText')}
          </p>
          <div
            style={{
              marginBlockStart: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <LinkButton href="/support" size="sm" className="btn-gold">
              {tActions('join')}
            </LinkButton>
            <LinkButton href="/support" size="sm" className="btn-on-scrim">
              {tActions('donate')}
            </LinkButton>
          </div>
        </div>
      </div>

      <div className="footer-rule">
        <p className="ltr-island" style={{ opacity: 0.8 }}>
          {/* The year is a number the reader reads, so it takes their numerals
              — it was the one Latin digit left on every Persian page. */}
          © {digits(new Date().getFullYear(), locale)} {tBrand('name')} · {tBrand('sub')} · Wien
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          {LEGAL_NAV.map((entry) => (
            <Link key={entry.href} href={entry.href}>
              {tNav(entry.key)}
            </Link>
          ))}
          <span style={{ opacity: 0.8 }}>
            {t('zvr')} <span className="ltr-island">{ASSOCIATION.zvr}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
