'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CaretLeft,
  CaretRight,
  CornersIn,
  CornersOut,
  Minus,
  Plus,
  Presentation,
  SlidersHorizontal,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import type { Line } from '@/lib/dua-texts';
import type { Locale } from '@/lib/i18n/config';
import { Rosette } from './ornaments';
import { useReader } from './use-reader';
import { DuaPresent } from './dua-present';
import { Fixed } from './reader-fixed';

/** Where the next and previous du'a are, for the swipe and the buttons. */
export interface Neighbour {
  slug: string;
  title: string;
}

/**
 * A du'a read the way the Quran is read on this site: the same sheet, the
 * same bar, the same full screen and the same presentation overlay.
 *
 * It was the last page still wearing the reader these two shared before the
 * Quran was rebuilt — its own fullscreen, which portalled the whole page to
 * the body, and its own presentation, which was the same sheet set larger.
 * Both are the Quran's now, so somebody who has learnt to read one text here
 * has learnt to read the other.
 */
export function DuaReader({
  lines,
  locale,
  arabicTitle,
  title,
  basePath,
  previous,
  next,
}: {
  lines: readonly Line[];
  locale: Locale;
  arabicTitle: string;
  title: string;
  /** Locale-prefixed, e.g. `/de/duas`. */
  basePath: string;
  previous: Neighbour | null;
  next: Neighbour | null;
}) {
  const t = useTranslations('duas');
  const tReader = useTranslations('reader');
  const router = useRouter();

  const go = useCallback(
    (to: Neighbour | null) => {
      if (to) router.push(`${basePath}/${to.slug}`);
    },
    [basePath, router],
  );

  const reader = useReader({
    storageKey: 'dua',
    // Carried rightwards is onwards, as in the mushaf: bound on the right,
    // the leaf you have finished goes over the spine.
    onNext: next ? () => go(next) : undefined,
    onPrevious: previous ? () => go(previous) : undefined,
  });

  /** Whether the translation is shown under each line. */
  const [translated, setTranslated] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem('dua-translated') === 'off') setTranslated(false);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggleTranslated = useCallback(() => {
    setTranslated((on) => {
      try {
        localStorage.setItem('dua-translated', on ? 'off' : 'on');
      } catch {
        /* storage unavailable */
      }
      return !on;
    });
  }, []);

  /** The controls that fold away on a narrow screen. */
  const [open, setOpen] = useState(false);

  // Which column of the tuple this reader reads.
  const column = locale === 'fa' ? 1 : 2;

  /** Only the spoken lines: a rubric is an instruction, not words to say. */
  const spoken = useMemo(
    () =>
      lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line[0] !== null)
        .map(({ line, index }) => ({
          arabic: line[0] as string,
          rendering: (line[column] ?? '') as string,
          index,
        })),
    [lines, column],
  );

  /* ── Presentation ───────────────────────────────────────────────────── */
  const [presenting, setPresenting] = useState(false);
  const [at, setAt] = useState(0);
  const present = useCallback((from = 0) => {
    setAt(from);
    setPresenting(true);
    setOpen(false);
  }, []);
  const step = useCallback(
    (by: 1 | -1) => {
      setAt((current) => Math.min(spoken.length - 1, Math.max(0, current + by)));
    },
    [spoken.length],
  );

  /* ── The whole screen, the way the Quran does it ────────────────────── */
  useEffect(() => {
    const root = document.documentElement;
    if (reader.full || presenting) root.dataset.readerFull = 'true';
    else delete root.dataset.readerFull;
    return () => {
      delete root.dataset.readerFull;
    };
  }, [reader.full, presenting]);

  /* ── Keys ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (el?.closest('input, select, textarea, [contenteditable]') && event.key !== 'Escape')
        return;

      if (presenting) {
        if (['ArrowLeft', ' ', 'PageDown', 'Enter', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          step(1);
        } else if (['ArrowRight', 'PageUp', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'Escape') setPresenting(false);
        else if (event.key.toLowerCase() === 't') toggleTranslated();
        return;
      }

      if (event.key === 'ArrowLeft') go(next);
      else if (event.key === 'ArrowRight') go(previous);
      else if (event.key.toLowerCase() === 'f') reader.toggleFull();
      else if (event.key.toLowerCase() === 'p') present(0);
      else if (event.key.toLowerCase() === 't') toggleTranslated();
      else if (event.key === 'Escape' && reader.full) reader.toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, step, toggleTranslated, go, next, previous, reader, present]);

  const here = spoken[Math.min(at, spoken.length - 1)];
  let number = 0;

  return (
    <div
      ref={reader.shellRef}
      className="qr dua-reader"
      data-full={reader.full || undefined}
      // Two names for one number: `--qr-scale` is what the shared chrome
      // reads, `--reader-scale` what the du'a's own lines have always read.
      style={
        {
          ['--qr-scale' as string]: reader.scale,
          ['--reader-scale' as string]: reader.scale,
        } as React.CSSProperties
      }
    >
      {/* ── Every choice there is ────────────────────────────────────── */}
      <div className="qr-bar">
        <div className="qr-compact">
          <button
            type="button"
            className="qr-chip"
            aria-expanded={open}
            aria-controls="dua-controls"
            onClick={() => setOpen((on) => !on)}
            aria-label={tReader('settings')}
          >
            <SlidersHorizontal size={18} weight="duotone" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="qr-chip"
            aria-pressed={reader.full}
            onClick={reader.toggleFull}
            aria-label={reader.full ? tReader('exitFullscreen') : tReader('fullscreen')}
          >
            {reader.full ? (
              <CornersIn size={18} weight="duotone" aria-hidden="true" />
            ) : (
              <CornersOut size={18} weight="duotone" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="qr-chip qr-present"
            onClick={() => present(0)}
            aria-label={tReader('presentation')}
          >
            <Presentation size={18} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        <div className="qr-controls" id="dua-controls" data-open={open || undefined}>
          <button
            type="button"
            role="switch"
            aria-checked={translated}
            className="qr-chip qr-chip-wide"
            onClick={toggleTranslated}
          >
            <Translate size={17} weight="duotone" aria-hidden="true" />
            <span className="qr-chip-word">{t('showTranslation')}</span>
          </button>

          <div className="qr-size" role="group" aria-label={tReader('textSize')}>
            <button
              type="button"
              onClick={reader.smaller}
              disabled={!reader.canReduce}
              aria-label={tReader('smaller')}
            >
              <Minus size={13} weight="bold" aria-hidden="true" />
            </button>
            <span className="tabular" aria-hidden="true">
              {digits(Math.round(reader.scale * 100), locale)}%
            </span>
            <button
              type="button"
              onClick={reader.larger}
              disabled={!reader.canEnlarge}
              aria-label={tReader('larger')}
            >
              <Plus size={13} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div className="qr-screen">
            <button
              type="button"
              className="qr-chip qr-chip-wide"
              aria-pressed={reader.full}
              onClick={reader.toggleFull}
            >
              {reader.full ? (
                <CornersIn size={17} weight="duotone" aria-hidden="true" />
              ) : (
                <CornersOut size={17} weight="duotone" aria-hidden="true" />
              )}
              {reader.full ? tReader('exitFullscreen') : tReader('fullscreen')}
            </button>
            <button
              type="button"
              className="qr-chip qr-present qr-chip-wide"
              onClick={() => present(0)}
            >
              <Presentation size={17} weight="duotone" aria-hidden="true" />
              {tReader('presentation')}
            </button>
          </div>
        </div>
      </div>

      {/* ── The sheet ────────────────────────────────────────────────── */}
      <div className="qr-main" {...reader.swipe}>
        <article className="mushaf qr-paper dua-sheet" aria-label={title}>
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />

          <header className="mushaf-head qr-head-band">
            <span className="qr-head-juz">{t('category.dua')}</span>
            <h2 className="qr-banner mushaf-banner" lang="ar" dir="rtl">
              <Rosette className="mushaf-banner-star" />
              <span>{arabicTitle}</span>
              <Rosette className="mushaf-banner-star" />
            </h2>
          </header>

          <ol className="dua-lines" data-translated={translated ? 'on' : 'off'}>
            {lines.map((line, index) => {
              const [arabic] = line;
              const rendering = line[column] ?? '';
              if (arabic === null) {
                return (
                  <li key={index} className="dua-rubric">
                    {rendering}
                  </li>
                );
              }
              number += 1;
              const from = number - 1;
              return (
                <li key={index} className="dua-line">
                  <div className="qr-verse-top">
                    <span className="qr-pill">{digits(number, locale)}</span>
                    <button
                      type="button"
                      className="qr-from"
                      onClick={() => present(from)}
                      title={tReader('presentFrom')}
                    >
                      <Presentation size={18} weight="duotone" aria-hidden="true" />
                      <span>{tReader('presentFrom')}</span>
                    </button>
                  </div>
                  <p className="dua-ar" lang="ar" dir="rtl">
                    {arabic}
                  </p>
                  {rendering ? <p className="dua-tr">{rendering}</p> : null}
                </li>
              );
            })}
          </ol>

          <footer className="mushaf-foot">
            <span className="mushaf-folio">{digits(spoken.length, locale)}</span>
          </footer>
        </article>
      </div>

      <Fixed scale={reader.scale} silent={false}>
        {/* ── Along the foot: the du'a before and the one after ───────── */}
        <div className="qr-foot">
          <div className="qr-foot-inner" dir="rtl">
            <button
              type="button"
              className="qr-step"
              onClick={() => go(previous)}
              disabled={!previous}
              aria-label={previous ? `${t('previousDua')}: ${previous.title}` : t('previousDua')}
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
              <span className="qr-step-word">{t('previousDua')}</span>
            </button>
            <p className="qr-foot-title">{title}</p>
            <button
              type="button"
              className="qr-step qr-step-next"
              onClick={() => go(next)}
              disabled={!next}
              aria-label={next ? `${t('nextDua')}: ${next.title}` : t('nextDua')}
            >
              <span className="qr-step-word">{t('nextDua')}</span>
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        {presenting && here ? (
          <DuaPresent
            arabic={here.arabic}
            translation={here.rendering || null}
            index={Math.min(at, spoken.length - 1) + 1}
            count={spoken.length}
            arabicTitle={arabicTitle}
            locale={locale}
            translated={translated}
            scale={reader.scale}
            onStep={step}
            onClose={() => setPresenting(false)}
            onToggleTranslated={toggleTranslated}
            onLarger={reader.larger}
            onSmaller={reader.smaller}
          />
        ) : null}
      </Fixed>

      <p className="reader-hint text-xs">{tReader('turnHintDua')}</p>
    </div>
  );
}
