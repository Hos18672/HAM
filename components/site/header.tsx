'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  MagnifyingGlass,
  CaretDown,
  Clock,
  CalendarDots,
  ChatCircleText,
  List,
} from '@phosphor-icons/react/dist/ssr';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { NAV_GROUPS, LEGAL_NAV, type NavGroup } from './nav-links';
import { ThemeToggle } from './theme-toggle';
import { Mark, PatternPlate } from './ornaments';
import { LocaleSwitch } from './locale-switch';
import { SearchPopup } from './search-popup';
import { LinkButton } from '../ui/button';
import type { ThemeValue } from './theme';
import type { Locale } from '@/lib/i18n/config';

/**
 * The site header.
 *
 * Wide screens (≥ 1100px): the mark and name, five top-level items — three of
 * them dropdowns grouping the thirteen pages — search, the language switch
 * and the one ask, "become a member". The theme toggle joins them from
 * 1280px; below that it lives in the menu and the footer.
 *
 * Phones and tablets: a slim 56px bar with the mark, a compact FA | DE switch
 * and the menu button, a full-height menu sheet with the same groups as
 * collapsible sections, and a bottom bar for the three things people come
 * for most — prayer times, events, contact — plus the menu.
 *
 * The bar never changes shape or size on scroll; it only takes a shadow once
 * it is no longer at the top of the page. A header that resizes as you start
 * reading moves the page under your eyes.
 */
export function Header({ theme, locale }: { theme: ThemeValue; locale: Locale }) {
  const t = useTranslations('nav');
  const tActions = useTranslations('actions');
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Any navigation closes whatever is open.
  useEffect(() => {
    setSheetOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // The sheet is a modal surface: lock the page behind it and trap focus.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    const opener = sheetOpenerRef.current;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('button, a')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSheetOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), summary'),
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
  }, [sheetOpen]);

  // Click-away and Escape for the desktop dropdowns.
  useEffect(() => {
    if (!openGroup) return;
    function onDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const button = navRef.current?.querySelector<HTMLElement>(
        `[data-group="${openGroup}"] > button`,
      );
      setOpenGroup(null);
      button?.focus();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const groupIsCurrent = (group: NavGroup) =>
    group.href ? isCurrent(group.href) : (group.items ?? []).some((i) => isCurrent(i.href));

  function openSheet(event: React.MouseEvent<HTMLElement>) {
    sheetOpenerRef.current = event.currentTarget;
    setSheetOpen(true);
  }

  // The reader pages carry their own controls along the bottom edge.
  const readerPage = /^\/(quran|duas)\/.+/.test(pathname);

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>

      <header className="site-header hc-header" data-scrolled={scrolled ? 'true' : undefined}>
        <div className="site-header-bar">
          <Brand />

          <nav ref={navRef} className="main-nav" aria-label={t('primary')}>
            <ul>
              {NAV_GROUPS.map((group) =>
                group.href ? (
                  <li key={group.key}>
                    <Link
                      href={group.href}
                      className="nav-link"
                      aria-current={isCurrent(group.href) ? 'page' : undefined}
                    >
                      {t(group.key)}
                    </Link>
                  </li>
                ) : (
                  <li key={group.key} className="nav-group" data-group={group.key}>
                    <button
                      type="button"
                      className="nav-link"
                      data-current={groupIsCurrent(group) ? 'true' : undefined}
                      aria-expanded={openGroup === group.key}
                      aria-controls={`menu-${group.key}`}
                      onClick={() => setOpenGroup((g) => (g === group.key ? null : group.key))}
                    >
                      {t(group.key)}
                      <CaretDown size={13} weight="bold" aria-hidden="true" className="caret" />
                    </button>
                    <ul
                      id={`menu-${group.key}`}
                      className="nav-menu"
                      hidden={openGroup !== group.key}
                    >
                      {group.items!.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="nav-menu-item"
                            aria-current={isCurrent(item.href) ? 'page' : undefined}
                          >
                            {t(item.key)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className="site-header-tools">
            <button
              type="button"
              ref={searchButtonRef}
              className="chrome-btn header-search"
              aria-label={tActions('openSearch')}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
            </button>
            <span className="header-theme">
              <ThemeToggle theme={theme} />
            </span>
            <LocaleSwitch compact className="header-locale" />
            <LinkButton href={`/${locale}/support#member`} size="sm" className="header-cta">
              {t('join')}
            </LinkButton>
            <button
              type="button"
              className="chrome-btn header-burger"
              aria-label={t('openMenu')}
              aria-expanded={sheetOpen}
              aria-controls="menu-sheet"
              onClick={openSheet}
            >
              <List size={22} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {sheetOpen ? (
        <div
          ref={sheetRef}
          id="menu-sheet"
          className="menu-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
        >
          <PatternPlate opacity={0.35} />
          <div className="menu-sheet-head">
            <Brand />
            <button
              type="button"
              className="chrome-btn"
              aria-label={t('closeMenu')}
              onClick={() => setSheetOpen(false)}
            >
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div className="menu-sheet-body">
            <button
              type="button"
              className="menu-sheet-search"
              onClick={() => {
                setSheetOpen(false);
                setSearchOpen(true);
              }}
            >
              <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
              {tActions('search')}
            </button>

            <nav aria-label={t('primary')}>
              <ul className="menu-sheet-groups">
                {NAV_GROUPS.map((group) =>
                  group.href ? (
                    <li key={group.key}>
                      <Link
                        href={group.href}
                        className="menu-sheet-link menu-sheet-top"
                        aria-current={isCurrent(group.href) ? 'page' : undefined}
                      >
                        {t(group.key)}
                      </Link>
                    </li>
                  ) : (
                    <li key={group.key}>
                      <details open={groupIsCurrent(group) || undefined}>
                        <summary className="menu-sheet-top">
                          {t(group.key)}
                          <CaretDown size={16} weight="bold" aria-hidden="true" className="caret" />
                        </summary>
                        <ul>
                          {group.items!.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="menu-sheet-link"
                                aria-current={isCurrent(item.href) ? 'page' : undefined}
                              >
                                {t(item.key)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="menu-sheet-extra">
              <LocaleSwitch />
              <ThemeToggle theme={theme} />
            </div>
            <ul className="menu-sheet-legal">
              {LEGAL_NAV.map((entry) => (
                <li key={entry.href}>
                  <Link href={entry.href}>{t(entry.key)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* The two asks, pinned to the bottom of the sheet. */}
          <div className="menu-sheet-cta">
            <LinkButton href={`/${locale}/support#member`} className="btn-gold">
              {t('join')}
            </LinkButton>
            <LinkButton href={`/${locale}/support#donate`} variant="secondary">
              {t('donate')}
            </LinkButton>
          </div>
        </div>
      ) : null}

      {readerPage ? null : (
        <nav className="bottom-bar" aria-label={t('bottomBar')}>
          <Link href="/prayer" aria-current={isCurrent('/prayer') ? 'page' : undefined}>
            <Clock size={22} weight="duotone" aria-hidden="true" />
            <span>{t('prayer')}</span>
          </Link>
          <Link href="/events" aria-current={isCurrent('/events') ? 'page' : undefined}>
            <CalendarDots size={22} weight="duotone" aria-hidden="true" />
            <span>{t('events')}</span>
          </Link>
          <Link href="/contact" aria-current={isCurrent('/contact') ? 'page' : undefined}>
            <ChatCircleText size={22} weight="duotone" aria-hidden="true" />
            <span>{t('contact')}</span>
          </Link>
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="menu-sheet"
            onClick={openSheet}
          >
            <List size={22} weight="bold" aria-hidden="true" />
            <span>{t('menu')}</span>
          </button>
        </nav>
      )}

      <SearchPopup
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        anchorRef={searchButtonRef}
        locale={locale}
      />
    </>
  );
}

function Brand() {
  const t = useTranslations('brand');
  return (
    <Link href="/" className="brand" aria-label={t('name')}>
      <span className="brand-mark">
        <span className="brand-ring" aria-hidden="true" />
        <Mark />
      </span>
      <span className="brand-text">
        <span className="brand-name">{t('name')}</span>
        <span className="brand-sub">{t('sub')}</span>
      </span>
    </Link>
  );
}
