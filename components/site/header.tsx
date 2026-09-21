'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { List, X, MagnifyingGlass, CaretDown } from '@phosphor-icons/react/dist/ssr';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { NAV, LEGAL_NAV } from './nav-links';
import { ThemeToggle } from './theme-toggle';
import { LocaleSwitch } from './locale-switch';
import { SearchPopup } from './search-popup';
import { Button, LinkButton } from '../ui/button';
import type { ThemeValue } from './theme';
import type { Locale } from '@/lib/i18n/config';

export function Header({ theme, locale }: { theme: ThemeValue; locale: Locale }) {
  const t = useTranslations('nav');
  const tActions = useTranslations('actions');
  const pathname = usePathname();

  const [condensed, setCondensed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Condense on scroll. Passive listener, and only a boolean changes, so this
  // never costs a layout pass.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Any navigation closes whatever is open.
  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // The drawer is a full-screen surface: lock the page behind it and trap focus.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = drawerRef.current?.querySelector<HTMLElement>('a, button');
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled)',
      );
      if (focusable.length === 0) return;
      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  // Click-away and Escape for the overflow menu.
  useEffect(() => {
    if (!moreOpen) return;
    function onDown(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const primary = NAV.filter((entry) => entry.primary);
  const overflow = NAV.filter((entry) => !entry.primary && entry.href !== '/');
  const isCurrent = (href: string) => pathname === href;

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>

      <header
        className="sticky top-0 z-40 border-b border-rule"
        style={{
          background: 'var(--color-bg)',
          borderBlockEndWidth: condensed ? 'var(--rule-hair)' : '0',
          transition: 'border-color var(--duration-base) var(--ease-standard)',
        }}
      >
        <div
          className="page flex items-center gap-2"
          style={{
            blockSize: condensed ? '3.5rem' : 'var(--header-height)',
            transition: 'block-size var(--duration-base) var(--ease-standard)',
          }}
        >
          <Brand condensed={condensed} />

          <nav className="nav ms-auto hidden lg:flex" aria-label={t('primary')}>
            {primary.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="nav-link"
                aria-current={isCurrent(entry.href) ? 'page' : undefined}
              >
                {t(entry.key)}
              </Link>
            ))}

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                className="nav-link"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => setMoreOpen((open) => !open)}
              >
                {t('more')}
                <CaretDown
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  style={{
                    marginInlineStart: 'var(--space-1)',
                    transform: moreOpen ? 'rotate(180deg)' : undefined,
                    transition: 'transform var(--duration-fast) var(--ease-standard)',
                  }}
                />
              </button>
              {moreOpen ? (
                <div
                  className="absolute"
                  style={{
                    insetInlineEnd: 0,
                    insetBlockStart: 'calc(100% + var(--space-1))',
                    minInlineSize: '14rem',
                    background: 'var(--color-bg)',
                    border: 'var(--rule-hair) solid var(--color-rule-strong)',
                    borderRadius: 'var(--radius-baseline)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-1)',
                    display: 'grid',
                  }}
                >
                  {overflow.map((entry) => (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className="nav-link"
                      aria-current={isCurrent(entry.href) ? 'page' : undefined}
                    >
                      {t(entry.key)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="ms-auto flex items-center gap-1 lg:ms-2">
            <Button
              ref={searchButtonRef}
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={tActions('openSearch')}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
            >
              <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
            </Button>

            <ThemeToggle theme={theme} />
            <LocaleSwitch className="hidden sm:flex" />

            <LinkButton
              href={`/${locale}/support`}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {t('support')}
            </LinkButton>

            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="lg:hidden"
              aria-label={drawerOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? (
                <X size={22} weight="bold" aria-hidden="true" />
              ) : (
                <List size={22} weight="bold" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div
          ref={drawerRef}
          id="mobile-drawer"
          className="fixed inset-0 lg:hidden"
          style={{ zIndex: 'var(--z-drawer)', background: 'var(--color-bg)' }}
          role="dialog"
          aria-modal="true"
          aria-label={t('menu')}
        >
          <div className="page flex items-center" style={{ blockSize: 'var(--header-height)' }}>
            <Brand condensed />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="ms-auto"
              aria-label={t('closeMenu')}
              onClick={() => setDrawerOpen(false)}
            >
              <X size={22} weight="bold" aria-hidden="true" />
            </Button>
          </div>

          <nav
            className="page flex flex-col overflow-y-auto"
            aria-label={t('primary')}
            style={{ gap: 'var(--space-1)', paddingBlock: 'var(--space-4)', maxBlockSize: 'calc(100dvh - var(--header-height))' }}
          >
            {NAV.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="nav-link"
                aria-current={isCurrent(entry.href) ? 'page' : undefined}
                style={{ fontSize: 'var(--text-xl)', paddingBlock: 'var(--space-2)' }}
              >
                {t(entry.key)}
              </Link>
            ))}

            <hr style={{ marginBlock: 'var(--space-3)' }} />

            {LEGAL_NAV.map((entry) => (
              <Link key={entry.href} href={entry.href} className="nav-link">
                {t(entry.key)}
              </Link>
            ))}

            <div className="flex items-center gap-2" style={{ marginBlockStart: 'var(--space-3)' }}>
              <LocaleSwitch />
            </div>

            <LinkButton
              href={`/${locale}/support`}
              size="lg"
              style={{ marginBlockStart: 'var(--space-3)' }}
            >
              {t('support')}
            </LinkButton>
          </nav>
        </div>
      ) : null}

      <SearchPopup
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        anchorRef={searchButtonRef}
        locale={locale}
      />
    </>
  );
}

function Brand({ condensed }: { condensed: boolean }) {
  const t = useTranslations('brand');
  return (
    <Link
      href="/"
      className="flex flex-col"
      style={{ textDecoration: 'none', color: 'var(--color-ink)', lineHeight: 1.1 }}
    >
      <span
        style={{
          fontSize: condensed ? 'var(--text-base)' : 'var(--text-lg)',
          fontWeight: 'var(--weight-bold)',
          letterSpacing: 'var(--tracking-tight)',
          transition: 'font-size var(--duration-base) var(--ease-standard)',
        }}
      >
        {t('name')}
      </span>
      {!condensed ? (
        <span className="kicker" style={{ marginBlockStart: '2px' }}>
          {t('sub')}
        </span>
      ) : null}
    </Link>
  );
}
