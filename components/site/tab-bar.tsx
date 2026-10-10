'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpenText,
  CalendarBlank,
  Clock,
  House,
  SquaresFour,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { TABS, type TabIcon } from './nav.config';

const ICONS: Record<TabIcon, typeof House> = {
  home: House,
  prayer: Clock,
  quran: BookOpenText,
  events: CalendarBlank,
  more: SquaresFour,
};

/**
 * The bottom navigation on phones and tablets: five destinations, floating
 * above the bottom edge. One chip slides under the active tab, whose icon
 * fills and grows a little. A page that is none of the first four marks
 * "More", since that is where it lives.
 *
 * It steps aside while a phone's keyboard is up — the visual viewport drops
 * by more than a typical keyboard — so a form's fields and buttons are not
 * covered.
 */
export function TabBar({ isCurrent }: { isCurrent: (href: string) => boolean }) {
  const t = useTranslations('nav');
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const check = () => setKeyboard(window.innerHeight - viewport.height > 150);
    viewport.addEventListener('resize', check);
    return () => viewport.removeEventListener('resize', check);
  }, []);

  const found = TABS.slice(0, 4).findIndex((tab) => isCurrent(tab.href));
  const active = found < 0 ? TABS.length - 1 : found;

  return (
    <nav
      className="tab-bar"
      aria-label={t('bottomBar')}
      data-hidden={keyboard || undefined}
      style={{ '--tab': active } as React.CSSProperties}
    >
      <span className="tab-indicator" aria-hidden="true" />
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
            <Icon size={24} weight={on ? 'fill' : 'duotone'} aria-hidden="true" />
            <span>{t(tab.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
