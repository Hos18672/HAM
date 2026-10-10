import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  CalendarDots,
  CaretRight,
  Compass,
  GearSix,
  HandHeart,
  Handshake,
  HandsPraying,
  Images,
  Info,
  MapPin,
  MaskHappy,
  Scales,
  ShieldCheck,
  UsersThree,
  ChalkboardTeacher,
  SoccerBall,
} from '@phosphor-icons/react/dist/ssr';
import { requireLocale } from '@/lib/i18n/locale-param';
import { Link } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/config';
import { getSettings } from '@/lib/db/queries/content';
import { readTheme } from '@/lib/preferences';
import { LangSwitch } from '@/components/ui/lang-switch';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { ShareAppRow } from '@/components/app/share-app-row';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('more'), robots: { index: false } };
}

const TILES = [
  { href: '/calendar', key: 'calendar', icon: CalendarDots },
  { href: '/duas', key: 'duas', icon: HandsPraying },
  { href: '/qibla', key: 'qibla', icon: Compass },
  { href: '/activities', key: 'activities', icon: UsersThree },
  { href: '/gallery', key: 'gallery', icon: Images },
  { href: '/community', key: 'community', icon: Handshake },
  { href: '/support', key: 'support', icon: HandHeart },
  { href: '/contact', key: 'contact', icon: MapPin },
] as const;

const GROUPS = [
  {
    key: 'groupAssociation',
    items: [
      { href: '/about', key: 'about', icon: Info },
      { href: '/courses', key: 'courses', icon: ChalkboardTeacher },
      { href: '/culture', key: 'culture', icon: MaskHappy },
      { href: '/sport', key: 'sport', icon: SoccerBall },
    ],
  },
  {
    key: 'groupLegal',
    items: [
      { href: '/privacy', key: 'privacy', icon: ShieldCheck },
      { href: '/imprint', key: 'imprint', icon: Scales },
    ],
  },
] as const;

/**
 * "More", the bottom navigation's last tab: every page that is not a tab, as
 * eight tiles for the ones used most and grouped lists for the rest, with the
 * app's own settings between them.
 */
export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  requireLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tApp = await getTranslations({ locale, namespace: 'app' });
  const settings = await getSettings();
  const theme = await readTheme(settings.defaultTheme);

  const group = (
    key: string,
    items: readonly { href: string; key: string; icon: typeof Info }[],
  ) => (
    <section key={key} className="a-stack" style={{ gap: 6 }} aria-labelledby={`more-${key}`}>
      <h2 id={`more-${key}`} className="a-label">
        {tApp(key)}
      </h2>
      <div className="a-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="a-list-row">
              <Icon size={22} weight="duotone" aria-hidden="true" />
              <span className="a-grow">{t(item.key)}</span>
              <CaretRight size={14} weight="bold" aria-hidden="true" className="a-muted mirror" />
            </Link>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="a-screen more-page">
      <h1 className="visually-hidden">{t('more')}</h1>
      <ul className="more-tiles">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <li key={tile.href}>
              <Link href={tile.href} className="more-tile a-press">
                <span className="a-ico">
                  <Icon size={24} weight="duotone" aria-hidden="true" />
                </span>
                <span>{t(tile.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {group(GROUPS[0].key, GROUPS[0].items)}

      <section className="a-stack" style={{ gap: 6 }} aria-labelledby="more-app">
        <h2 id="more-app" className="a-label">
          {tApp('groupApp')}
        </h2>
        <div className="a-list">
          <Link href="/settings" className="a-list-row">
            <GearSix size={22} weight="duotone" aria-hidden="true" />
            <span className="a-grow">{t('settings')}</span>
            <CaretRight size={14} weight="bold" aria-hidden="true" className="a-muted mirror" />
          </Link>
          <div className="more-prefs a-list-row" style={{ cursor: 'default' }}>
            <span className="a-grow">{tApp('language')}</span>
            <LangSwitch labels="full" />
          </div>
          <div className="more-prefs a-list-row" style={{ cursor: 'default' }}>
            <span className="a-grow">{tApp('darkMode')}</span>
            <ThemeToggle theme={theme} className="a-circle" />
          </div>
          <ShareAppRow />
        </div>
      </section>

      {group(GROUPS[1].key, GROUPS[1].items)}
    </div>
  );
}
