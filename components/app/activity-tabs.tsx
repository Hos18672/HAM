import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/config';

const TABS = [
  { href: '/activities', key: 'tabOverview' },
  { href: '/courses', key: 'courses' },
  { href: '/culture', key: 'culture' },
  { href: '/sport', key: 'sport' },
] as const;

/**
 * On a phone, the four activity pages are tabs of one screen: a segmented
 * strip across the top of each, the current one white.
 */
export async function ActivityTabs({ current, locale }: { current: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tApp = await getTranslations({ locale, namespace: 'app' });
  return (
    <nav className="m-view" aria-label={t('activities')}>
      <div className="a-screen" style={{ paddingBlockEnd: 4 }}>
        <div className="a-seg">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.href === current ? 'page' : undefined}
              style={{ fontSize: 14.5 }}
            >
              {tab.key === 'tabOverview' ? tApp('tabOverview') : t(tab.key)}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
