'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDots, ChatCircleText, House, List, Mosque } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { TABS } from './nav.config';

const ICONS = { home: House, prayer: Mosque, events: CalendarDots, contact: ChatCircleText };

/**
 * The tab bar on phones and tablets: four destinations and the menu, floating
 * above the bottom edge. One chip slides under the active tab. The menu tab
 * is active while the sheet is open.
 *
 * It steps aside while a phone's keyboard is up — the visual viewport drops
 * by more than a typical keyboard — so a form's fields and buttons are not
 * covered, and while the Quran reader fills the screen (CSS).
 */
export function TabBar({
  isCurrent,
  menuOpen,
  onMenu,
}: {
  isCurrent: (href: string) => boolean;
  menuOpen: boolean;
  onMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const t = useTranslations('nav');
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const check = () => setKeyboard(window.innerHeight - viewport.height > 150);
    viewport.addEventListener('resize', check);
    return () => viewport.removeEventListener('resize', check);
  }, []);

  const found = TABS.findIndex((tab) => isCurrent(tab.href));
  const active = menuOpen ? TABS.length : found;

  return (
    <nav
      className="tab-bar"
      aria-label={t('bottomBar')}
      data-hidden={keyboard || undefined}
      style={{ '--tab': active < 0 ? 0 : active } as React.CSSProperties}
    >
      {active >= 0 ? <span className="tab-indicator" aria-hidden="true" /> : null}
      {TABS.map((tab, index) => {
        const Icon = ICONS[tab.icon];
        const on = index === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="tab"
            aria-current={on ? 'page' : undefined}
          >
            <Icon size={24} weight="duotone" aria-hidden="true" />
            <span>{t(tab.key)}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className="tab"
        aria-expanded={menuOpen}
        aria-controls="menu-sheet"
        data-on={menuOpen || undefined}
        onClick={onMenu}
      >
        <List size={24} weight="duotone" aria-hidden="true" />
        <span>{t('tabMenu')}</span>
      </button>
    </nav>
  );
}
