'use client';

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import { useRouter } from '@/lib/i18n/navigation';
import { searchAction } from '@/app/actions/search';
import type { SearchHit } from '@/lib/search';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';

const OPEN_MS = 520;
const EASE = 'cubic-bezier(.22,1,.3,1)';

/**
 * The search pill.
 *
 * Opening grows an animated pill from the header button's exact position to a
 * centred bar, with the results panel fading in beneath it; closing runs the
 * reverse — results leave first, then the pill collapses back into the button.
 * Both are done with the Web Animations API on transform and opacity, so the
 * header button never moves and nothing reflows mid-flight.
 *
 * Typing must not restart the open animation: the animation is driven by the
 * `open` prop alone and the query lives in its own state, so a keystroke can
 * only ever re-render the results list.
 */
export function SearchPopup({
  open,
  onClose,
  anchorRef,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  locale: Locale;
}) {
  const t = useTranslations('search');
  const tActions = useTranslations('actions');
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, setPending] = useState(false);

  const pillRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const reduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Geometry of the header button, to grow from and collapse back into. */
  const anchorRect = useCallback(() => anchorRef.current?.getBoundingClientRect() ?? null, [anchorRef]);

  /* ── Open ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const pill = pillRef.current;
    const backdrop = backdropRef.current;
    if (!pill) return;

    const from = anchorRect();
    const to = pill.getBoundingClientRect();

    if (!reduced() && from) {
      // Translate and scale from the button's box to the pill's own box. Using
      // a transform (rather than animating width/left) keeps this off the
      // layout path entirely.
      const scaleX = from.width / to.width;
      const scaleY = from.height / to.height;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);

      pill.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, opacity: 0.4 },
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
        ],
        { duration: OPEN_MS, easing: EASE, fill: 'both' },
      );
      backdrop?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS * 0.6,
        easing: EASE,
        fill: 'both',
      });
    }

    // Focus after the growth has begun, so the caret does not appear at the
    // button's position first.
    const timer = window.setTimeout(() => inputRef.current?.focus(), reduced() ? 0 : 120);
    return () => window.clearTimeout(timer);
    // `query` is deliberately absent: typing must not restart this.
  }, [open, mounted, anchorRect]);

  /* ── Close ────────────────────────────────────────────────────────────── */
  const runClose = useCallback(() => {
    const pill = pillRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const from = anchorRect();

    const finish = () => {
      setMounted(false);
      setQuery('');
      setHits([]);
      anchorRef.current?.focus();
    };

    if (reduced() || !pill || !from) {
      finish();
      return;
    }

    // The results card leaves first …
    panel?.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], {
      duration: 140,
      easing: EASE,
      fill: 'both',
    });

    const to = pill.getBoundingClientRect();
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);

    // … then the pill collapses back into the button.
    const collapse = pill.animate(
      [
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`, opacity: 0.2 },
      ],
      { duration: 340, delay: 90, easing: EASE, fill: 'both' },
    );
    backdrop?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 340,
      delay: 90,
      easing: EASE,
      fill: 'both',
    });
    collapse.addEventListener('finish', finish, { once: true });
  }, [anchorRef, anchorRect]);

  useEffect(() => {
    if (!open && mounted) runClose();
  }, [open, mounted, runClose]);

  /* ── Query ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mounted) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setPending(false);
      return;
    }
    setPending(true);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await searchAction(trimmed, locale);
      if (cancelled) return;
      setHits(result.hits);
      setPending(false);
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, locale, mounted]);

  /* ── Escape and focus trap ────────────────────────────────────────────── */
  useEffect(() => {
    if (!mounted) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = pillRef.current?.parentElement;
      const focusable = root?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input');
      if (!focusable || focusable.length === 0) return;
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
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const showResults = query.trim().length >= 2;

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 'var(--z-search)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('label')}
    >
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'oklch(0.2369 0.0036 48.57 / 0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />

      <div
        className="page"
        style={{
          position: 'relative',
          paddingBlockStart: 'var(--space-7)',
          display: 'grid',
          justifyItems: 'center',
        }}
      >
        <div
          ref={pillRef}
          style={{
            inlineSize: 'min(38rem, 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-bg)',
            border: 'var(--rule-hair) solid var(--color-rule-strong)',
            borderRadius: 'var(--radius-pill)',
            paddingInline: 'var(--space-4)',
            paddingBlock: 'var(--space-2)',
            boxShadow: 'var(--shadow-lg)',
            transformOrigin: 'center',
          }}
        >
          <MagnifyingGlass size={20} weight="duotone" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Enter navigates to the first hit.
              if (event.key === 'Enter' && hits[0]) {
                event.preventDefault();
                const href = hits[0].href;
                onClose();
                router.push(href.replace(`/${locale}`, '') || '/');
              }
            }}
            placeholder={t('placeholder')}
            aria-label={t('label')}
            aria-controls={listId}
            aria-describedby={`${listId}-hint`}
            autoComplete="off"
            style={{
              flex: 1,
              border: 0,
              background: 'transparent',
              font: 'inherit',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-ink)',
              outline: 'none',
              minInlineSize: 0,
            }}
          />
          <Button variant="ghost" size="sm" iconOnly aria-label={tActions('closeSearch')} onClick={onClose}>
            <X size={18} weight="bold" aria-hidden="true" />
          </Button>
        </div>

        <div
          ref={panelRef}
          id={listId}
          style={{
            inlineSize: 'min(38rem, 100%)',
            marginBlockStart: 'var(--space-3)',
            background: 'var(--color-bg)',
            border: 'var(--rule-hair) solid var(--color-rule)',
            borderRadius: 'var(--radius-soft)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            maxBlockSize: '60vh',
            overflowY: 'auto',
            opacity: showResults ? 1 : 0,
            transition: `opacity var(--duration-base) ${EASE}`,
            pointerEvents: showResults ? 'auto' : 'none',
          }}
        >
          <p id={`${listId}-hint`} className="visually-hidden">
            {t('hint')}
          </p>

          <div aria-live="polite" aria-atomic="true">
            {showResults && !pending ? (
              <p className="visually-hidden">{t('results', { count: hits.length })}</p>
            ) : null}
          </div>

          {showResults && hits.length === 0 && !pending ? (
            <div style={{ padding: 'var(--space-5)' }}>
              <p style={{ fontWeight: 'var(--weight-bold)' }}>{t('empty')}</p>
              <p className="field-hint">{t('emptyHint')}</p>
            </div>
          ) : null}

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {hits.map((hit) => (
              <li key={hit.id}>
                <a
                  href={hit.href}
                  onClick={onClose}
                  style={{
                    display: 'grid',
                    gap: '2px',
                    padding: 'var(--space-3) var(--space-4)',
                    textDecoration: 'none',
                    color: 'var(--color-ink)',
                    borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)',
                  }}
                >
                  <span className="kicker">{hit.kind}</span>
                  <span style={{ fontWeight: 'var(--weight-bold)' }}>{hit.title}</span>
                  {hit.excerpt ? (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
                      {hit.excerpt}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
