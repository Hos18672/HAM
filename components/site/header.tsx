'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, MagnifyingGlass, CaretDown } from '@phosphor-icons/react/dist/ssr';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { NAV, LEGAL_NAV } from './nav-links';
import { ThemeToggle } from './theme-toggle';
import { Mark, PatternPlate } from './ornaments';
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
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerButtonRef = useRef<HTMLButtonElement>(null);

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
    // Captured here rather than read in cleanup: by the time cleanup runs the
    // ref may already point somewhere else.
    const opener = drawerButtonRef.current;
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
      // Focus goes back to the control that opened the drawer. Without this a
      // keyboard user closing it lands at the top of the document and has to
      // tab all the way back to where they were.
      opener?.focus();
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
    const opener = moreButtonRef.current;
    const menu = moreRef.current;
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      // Only pull focus back if it is still inside the menu — a click on a
      // link elsewhere on the page must not be yanked back to the button.
      if (opener && menu?.contains(document.activeElement)) opener.focus();
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

      {/* The design's header does not sit on the page, it detaches from it: at
          the top it is a flush glass strip, and once you scroll it pulls in
          8px, rounds to a full pill, takes a hairline and casts a shadow —
          all on the same .45s curve. */}
      <header
        className="sticky top-0"
        style={{
          zIndex: 'var(--z-header)',
          padding: `${condensed ? '8px' : '0px'} clamp(10px, 2vw, 20px) 0`,
          transition: 'padding 0.45s var(--ease-out-expressive)',
        }}
      >
        <div
          style={{
            position: 'relative',
            background: 'var(--glass)',
            backdropFilter: 'blur(18px) saturate(1.3)',
            border: `var(--rule-hair) solid ${condensed ? 'var(--line)' : 'transparent'}`,
            borderRadius: condensed ? 'var(--radius-pill)' : '0px',
            boxShadow: condensed ? '0 20px 44px -26px rgba(7, 59, 41, 0.5)' : 'none',
            transition:
              'border-color 0.45s ease, box-shadow 0.45s ease, border-radius 0.45s var(--ease-out-expressive)',
          }}
        >
          <PatternPlate opacity={0.18} rounded />
          <div
            className="flex items-center gap-2"
            style={{
              position: 'relative',
              maxInlineSize: '1320px',
              marginInline: 'auto',
              padding: `${condensed ? '8px' : '15px'} clamp(16px, 4vw, 48px)`,
              transition: 'padding 0.45s var(--ease-out-expressive)',
            }}
          >
            <Brand condensed={condensed} />

            {/* The desktop nav appears at the width it actually fits.

                Measured rather than chosen: masthead, seven items, the two
                chrome discs and the language switch need about 1180px once
                the bar's gutters are counted. `lg` — 1024px — was 140px short
                of that and pushed the bar off the side of the page. */}
            <nav className="nav ms-auto hidden min-[1180px]:flex" aria-label={t('primary')}>
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
                  ref={moreButtonRef}
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
                    className="caret"
                    style={{ marginInlineStart: 'var(--space-1)' }}
                  />
                </button>
                <div
                  className="pop absolute"
                  data-open={moreOpen ? 'true' : 'false'}
                  style={{
                    insetInlineEnd: 0,
                    insetBlockStart: 'calc(100% + var(--space-1))',
                    minInlineSize: '14rem',
                    background: 'var(--card)',
                    border: 'var(--rule-hair) solid var(--line)',
                    borderRadius: 'var(--radius-soft)',
                    boxShadow: 'var(--shadow)',
                    padding: 'var(--space-1)',
                    display: 'grid',
                    zIndex: 'var(--z-header)',
                  }}
                >
                  {overflow.map((entry) => (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className="nav-link pop-item"
                      aria-current={isCurrent(entry.href) ? 'page' : undefined}
                    >
                      {t(entry.key)}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="ms-auto flex items-center gap-2 min-[1180px]:ms-2">
              <button
                type="button"
                ref={searchButtonRef}
                className="chrome-btn"
                aria-label={tActions('openSearch')}
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen(true)}
              >
                <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
              </button>

              <ThemeToggle theme={theme} />
              <LocaleSwitch className="hidden sm:flex" />

              {/* The ask, only where there is room for it.

                  The measurement, not a breakpoint off the shelf: the
                  masthead, the seven nav items, the two discs and the
                  language switch come to about 1240px of content plus the
                  bar's own gutters, so below ~1360px this is what has to go.
                  The drawer and the footer both carry it regardless. */}
              <LinkButton
                href={`/${locale}/support`}
                size="sm"
                className="hidden min-[1360px]:inline-flex"
              >
                {t('support')}
              </LinkButton>

              <button
                type="button"
                className="burger min-[1180px]:hidden"
                ref={drawerButtonRef}
                aria-label={drawerOpen ? t('closeMenu') : t('openMenu')}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((open) => !open)}
              >
                <span className="burger-ring" aria-hidden="true" />
                <span className="bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div
          ref={drawerRef}
          id="mobile-drawer"
          className="drawer fixed inset-0 min-[1180px]:hidden"
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
            style={{
              gap: 'var(--space-1)',
              paddingBlock: 'var(--space-4)',
              maxBlockSize: 'calc(100dvh - var(--header-height))',
            }}
          >
            {NAV.map((entry) => (
              <Link
                key={entry.href}
                href={entry.href}
                className="nav-link drawer-item"
                aria-current={isCurrent(entry.href) ? 'page' : undefined}
                style={{ fontSize: 'var(--text-xl)', paddingBlock: 'var(--space-2)' }}
              >
                {t(entry.key)}
              </Link>
            ))}

            <hr style={{ marginBlock: 'var(--space-3)' }} />

            {LEGAL_NAV.map((entry) => (
              <Link key={entry.href} href={entry.href} className="nav-link drawer-item">
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
      className="brand flex items-center"
      // Below 480px the name is not rendered, so the link would otherwise be
      // an aria-hidden drawing and nothing else. The label is the same string
      // the masthead shows when there is room for it.
      aria-label={t('name')}
      style={{
        textDecoration: 'none',
        color: 'var(--color-ink)',
        lineHeight: 1.1,
        gap: '14px',
        flex: '0 0 auto',
        minInlineSize: 0,
      }}
    >
      {/* The mark and the ring that settles around it on hover. The wrapper
          shrinks with the bar, and the ring is hung off it rather than off the
          link, so it stays a circle around the mark alone. */}
      <span
        style={{
          position: 'relative',
          display: 'block',
          inlineSize: condensed ? '34px' : '44px',
          blockSize: condensed ? '34px' : '44px',
          flex: '0 0 auto',
          transition:
            'inline-size 0.5s var(--ease-out-expressive), block-size 0.5s var(--ease-out-expressive)',
        }}
      >
        <span className="brand-ring" aria-hidden="true" />
        <Mark />
      </span>

      {/* On a phone the mark stands alone: the name, the two chrome discs and
          the menu control do not fit on one line under about 480px, and the
          mark is the part that still says whose house this is. */}
      <span className="hidden flex-col min-[480px]:flex" style={{ minInlineSize: 0 }}>
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
      </span>
    </Link>
  );
}
