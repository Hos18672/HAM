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
const CLOSE_MS = 420;
const EASE = 'cubic-bezier(.22,1,.3,1)';
const PILL_H = 60;

/** Where the open pill comes to rest, in viewport pixels. */
function restingBox() {
  const width = Math.min(window.innerWidth * 0.92, 620);
  return {
    width,
    left: (window.innerWidth - width) / 2,
    top: Math.min(150, Math.max(72, window.innerHeight * 0.14)),
  };
}

/**
 * The search pill.
 *
 * Opening grows the pill out of the header button's exact box and closes back
 * into it, with the results panel arriving after the pill has settled and
 * leaving before it collapses.
 *
 * The flight animates the box itself — `left`, `top`, `width` on the wrapper
 * and `height`/`padding` on the pill — rather than a transform. A transform
 * scaling a 40px disc into a 620px bar is non-uniform, and a non-uniform scale
 * drags the border-radius out into ellipses, so the thing in flight reads as a
 * stretched rectangle. Animating the box keeps the radius resolving against
 * the real size, so it is a true circle at the button and a true pill at rest.
 * That costs layout on each frame, for one small fixed-position element.
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

  const popRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const reduced = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Geometry of the header button, to grow from and collapse back into. */
  const anchorRect = useCallback(
    () => anchorRef.current?.getBoundingClientRect() ?? null,
    [anchorRef],
  );

  /* ── Open ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const pop = popRef.current;
    const pill = pillRef.current;
    const backdrop = backdropRef.current;
    if (!pop || !pill) return;

    // The wrapper is fixed and sized in script, so the panel below the pill
    // never reflows while the box is in flight.
    const to = restingBox();
    pop.style.width = `${to.width}px`;
    pop.style.left = `${to.left}px`;
    pop.style.top = `${to.top}px`;

    const from = anchorRect();

    if (!reduced() && from) {
      pop.animate(
        [
          { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` },
          { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px` },
        ],
        { duration: OPEN_MS, easing: EASE, fill: 'both' },
      );
      pill.animate(
        [
          { height: `${from.height}px`, paddingInline: '10px' },
          { height: `${PILL_H}px`, paddingInline: '20px' },
        ],
        { duration: OPEN_MS, easing: EASE, fill: 'both' },
      );
      backdrop?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS * 0.6,
        easing: EASE,
        fill: 'both',
      });
    }

    // Focus once the pill has opened enough to hold a caret, so it does not
    // appear inside the button-sized disc first.
    const timer = window.setTimeout(() => inputRef.current?.focus(), reduced() ? 0 : 260);
    return () => window.clearTimeout(timer);
    // `query` is deliberately absent: typing must not restart this.
  }, [open, mounted, anchorRect]);

  /* ── Close ────────────────────────────────────────────────────────────── */
  const runClose = useCallback(() => {
    const pop = popRef.current;
    const pill = pillRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const to = anchorRect();

    const finish = () => {
      setMounted(false);
      setQuery('');
      setHits([]);
      anchorRef.current?.focus();
    };

    if (reduced() || !pop || !pill || !to) {
      finish();
      return;
    }

    // The results card leaves first …
    panel?.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(.97)' }], {
      duration: 160,
      easing: 'cubic-bezier(.4,0,1,1)',
      fill: 'both',
    });
    // … the pill empties, so there is no text to squeeze into the disc …
    pill.querySelectorAll<HTMLElement>('input, svg, button').forEach((child) =>
      child.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 140,
        easing: 'ease-in',
        fill: 'both',
      }),
    );

    const from = pop.getBoundingClientRect();

    // … and the box shrinks back into the button it came out of.
    const collapse = pop.animate(
      [
        { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` },
        { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px` },
      ],
      { duration: CLOSE_MS, easing: EASE, fill: 'both' },
    );
    pill.animate(
      [
        { height: `${PILL_H}px`, paddingInline: '20px' },
        { height: `${to.height}px`, paddingInline: '10px' },
      ],
      { duration: CLOSE_MS, easing: EASE, fill: 'both' },
    );
    backdrop?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: 'ease-out',
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
      const focusable = root?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input',
      );
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
          background: 'rgba(10, 24, 20, 0.5)',
          backdropFilter: 'blur(7px)',
        }}
      />

      <div ref={popRef} className="search-pop">
        <div ref={pillRef} className="search-pill">
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
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={tActions('closeSearch')}
            onClick={onClose}
          >
            <X size={18} weight="bold" aria-hidden="true" />
          </Button>
        </div>

        <div
          ref={panelRef}
          id={listId}
          className="search-panel"
        >
          <p id={`${listId}-hint`} className="visually-hidden">
            {t('hint')}
          </p>

          {!showResults ? <p className="search-idle">{t('idleHint')}</p> : null}

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
                <a href={hit.href} onClick={onClose} className="search-hit">
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
