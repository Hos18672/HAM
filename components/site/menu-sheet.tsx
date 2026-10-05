'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { MENU_GROUPS } from './nav.config';
import { ThemeToggle } from './theme-toggle';
import { IconCircle } from '../ui/icon-circle';
import { LangSwitch } from '../ui/lang-switch';
import { PillLink } from '../ui/pill-button';
import type { ThemeValue } from './theme';

/**
 * The menu, from the tab bar's last tab: the whole site as four groups of
 * tiles over the paper, search at the top, and the language, the theme and
 * the two asks at the foot. The tab bar stays in view above it, with "Menü"
 * marked. A modal surface: the page behind is locked, focus stays inside,
 * Escape closes it and focus goes back to the tab that opened it.
 */
export function MenuSheet({
  theme,
  isCurrent,
  onClose,
  onSearch,
  opener,
}: {
  theme: ThemeValue;
  isCurrent: (href: string) => boolean;
  onClose: () => void;
  onSearch: () => void;
  /** Where focus returns when the sheet closes. */
  opener: HTMLElement | null;
}) {
  const t = useTranslations('nav');
  const tActions = useTranslations('actions');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('.menu-sheet-close')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, [onClose, opener]);

  return (
    <div
      ref={ref}
      id="menu-sheet"
      className="menu-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-sheet-title"
    >
      <div className="menu-sheet-head">
        <h2 id="menu-sheet-title" className="menu-sheet-title">
          {t('tabMenu')}
        </h2>
        <IconCircle className="menu-sheet-close" aria-label={t('closeMenu')} onClick={onClose}>
          <X size={20} weight="bold" aria-hidden="true" />
        </IconCircle>
      </div>

      <div className="menu-sheet-body">
        <button type="button" className="menu-sheet-search" onClick={onSearch}>
          <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
          {tActions('search')}
        </button>

        <nav aria-label={t('primary')} className="menu-sheet-groups">
          {MENU_GROUPS.map((group) => (
            <section key={group.key} aria-labelledby={`sheet-${group.key}`}>
              <h3 id={`sheet-${group.key}`} className="menu-sheet-label">
                {t(group.key)}
              </h3>
              <ul className="menu-sheet-tiles">
                {group.items!.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="menu-sheet-tile"
                      aria-current={isCurrent(item.href) ? 'page' : undefined}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <div className="menu-sheet-foot">
          <div className="menu-sheet-prefs">
            <LangSwitch variant="solid" labels="full" />
            <ThemeToggle theme={theme} className="icon-circle" />
          </div>
          <div className="menu-sheet-asks">
            <PillLink href="/support#member" size={50}>
              {t('join')}
            </PillLink>
            <PillLink href="/support#donate" variant="outline" size={50}>
              {t('donate')}
            </PillLink>
          </div>
        </div>
      </div>
    </div>
  );
}
