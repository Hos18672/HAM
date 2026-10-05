'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react/dist/ssr';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { NAV_GROUPS, type NavGroup } from './nav.config';
import { Mark } from './ornaments';
import { SearchPopup } from './search-popup';
import { IconCircle } from '../ui/icon-circle';
import { LangCircle, LangSwitch } from '../ui/lang-switch';
import { PillLink } from '../ui/pill-button';
import { NextPrayerInline } from '../ui/next-prayer';
import { TabBar } from './tab-bar';
import { MenuSheet } from './menu-sheet';
import { formatDate } from '@/lib/i18n/format';
import { localPrayerDay } from '@/lib/prayer-local';
import { VIENNA } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import type { ThemeValue } from './theme';
import type { Locale } from '@/lib/i18n/config';

/** How long the pointer must rest on a group before it opens, or leave before it closes. */
const HOVER_INTENT_MS = 150;

/**
 * The site header.
 *
 * Wide screens (≥ 1100px): an 80px bar on the paper — the mark and name, the
 * five items as pills (three of them dropdowns), search, the language switch
 * and the one ask. On the home page a dateline sits above it: today's date
 * and the next prayer. The bar never changes size on scroll; it only takes a
 * soft shadow.
 *
 * Phones and tablets: a floating pill with the mark and name, the other
 * language and search. Everything else is in the tab bar along the bottom
 * and the menu sheet it opens.
 */
export function Header({ theme, locale }: { theme: ThemeValue; locale: Locale }) {
  const t = useTranslations('nav');
  const tActions = useTranslations('actions');
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  /** The search button that opened the popup — the bar has one per width. */
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

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

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  const groupIsCurrent = (group: NavGroup) =>
    group.href ? isCurrent(group.href) : (group.items ?? []).some((i) => isCurrent(i.href));

  function openSheet(event: React.MouseEvent<HTMLElement>) {
    if (sheetOpen) {
      setSheetOpen(false);
      return;
    }
    sheetOpenerRef.current = event.currentTarget;
    setSheetOpen(true);
  }
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  function openSearch(event: React.MouseEvent<HTMLButtonElement>) {
    searchButtonRef.current = event.currentTarget;
    setSearchOpen(true);
  }

  /** Open or close a group after the pointer has rested a moment. */
  function intend(group: string | null) {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpenGroup(group), HOVER_INTENT_MS);
  }

  /** The links of the open group, for the arrow keys. */
  function items(group: string) {
    return Array.from(navRef.current?.querySelectorAll<HTMLElement>(`#menu-${group} a`) ?? []);
  }

  function onButtonKey(event: React.KeyboardEvent, group: string) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setOpenGroup(group);
    // The menu is drawn on the next frame.
    requestAnimationFrame(() => {
      const list = items(group);
      (event.key === 'ArrowDown' ? list[0] : list[list.length - 1])?.focus();
    });
  }

  function onMenuKey(event: React.KeyboardEvent, group: string) {
    const list = items(group);
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => list[(i + list.length) % list.length]?.focus();
    if (event.key === 'ArrowDown') go(at + 1);
    else if (event.key === 'ArrowUp') go(at - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(list.length - 1);
    else return;
    event.preventDefault();
  }

  // The reader pages carry their own controls along the bottom edge.
  const readerPage = /^\/(quran|duas)\/.+/.test(pathname);
  const home = pathname === '/';

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>

      <header
        className="site-header"
        data-scrolled={scrolled ? 'true' : undefined}
        data-home={home || undefined}
      >
        {home ? <Dateline locale={locale} /> : null}

        <div className="site-header-bar">
          <Brand />

          <nav ref={navRef} className="main-nav" aria-label={t('primary')}>
            <ul>
              {NAV_GROUPS.map((group) =>
                group.href ? (
                  <li key={group.key}>
                    <Link
                      href={group.href}
                      className="nav-pill"
                      aria-current={isCurrent(group.href) ? 'page' : undefined}
                    >
                      {t(group.key)}
                    </Link>
                  </li>
                ) : (
                  <li
                    key={group.key}
                    className="nav-group"
                    data-group={group.key}
                    onMouseEnter={() => intend(group.key)}
                    onMouseLeave={() => intend(null)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                        setOpenGroup((g) => (g === group.key ? null : g));
                    }}
                  >
                    <button
                      type="button"
                      className="nav-pill"
                      data-current={groupIsCurrent(group) ? 'true' : undefined}
                      aria-expanded={openGroup === group.key}
                      aria-controls={`menu-${group.key}`}
                      onClick={() => {
                        window.clearTimeout(hoverTimer.current);
                        setOpenGroup((g) => (g === group.key ? null : group.key));
                      }}
                      onKeyDown={(event) => onButtonKey(event, group.key)}
                    >
                      {t(group.key)}
                      <CaretDown size={13} weight="bold" aria-hidden="true" className="caret" />
                    </button>
                    <ul
                      id={`menu-${group.key}`}
                      className="nav-menu"
                      hidden={openGroup !== group.key}
                      onKeyDown={(event) => onMenuKey(event, group.key)}
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
            <LangCircle className="header-lang-m" />
            <IconCircle
              className="header-search"
              aria-label={tActions('openSearch')}
              aria-expanded={searchOpen}
              onClick={openSearch}
            >
              <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
            </IconCircle>
            <LangSwitch className="header-lang" />
            <PillLink href="/support#member" className="header-cta">
              {t('join')}
            </PillLink>
          </div>
        </div>
      </header>

      {sheetOpen ? (
        <MenuSheet
          theme={theme}
          isCurrent={isCurrent}
          onClose={closeSheet}
          onSearch={() => {
            setSheetOpen(false);
            searchButtonRef.current = null;
            setSearchOpen(true);
          }}
          opener={sheetOpenerRef.current}
        />
      ) : null}

      {readerPage ? null : <TabBar isCurrent={isCurrent} menuOpen={sheetOpen} onMenu={openSheet} />}

      <SearchPopup
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        anchorRef={searchButtonRef}
        locale={locale}
      />
    </>
  );
}

/**
 * Above the bar on the home page: today's date and the house's district on
 * one side, the next prayer on the other. Both depend on the moment they are
 * read, so they are filled in once the page is in the browser — the pill
 * itself is there from the first paint and nothing moves.
 */
function Dateline({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const [now, setNow] = useState<{ date: string; day: PrayerDay } | null>(null);
  useEffect(() => {
    const at = new Date();
    setNow({
      date: formatDate(at, locale, { weekday: 'long', day: 'numeric', month: 'long' }),
      day: localPrayerDay(at, VIENNA),
    });
  }, [locale]);
  return (
    <div className="dateline">
      <p className="dateline-where">
        {now ? <span>{now.date}</span> : null}
        <span aria-hidden="true">·</span>
        <span>{t('dateline')}</span>
      </p>
      {now ? <NextPrayerInline day={now.day} locale={locale} /> : null}
    </div>
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
