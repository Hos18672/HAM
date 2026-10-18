'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { CaretLeft, CaretRight, Pause, Play, Translate, X } from '@phosphor-icons/react/dist/ssr';
import { Portal } from './ui';
import { Ink, InkToggle } from './ink';
import type { Locale } from '@/lib/i18n/config';

/**
 * One verse — or one line of a du'a — at a time, for a room: deep green,
 * paper-coloured words, gold for the name and the progress.
 *
 * Tap the words or press → for the next, ← for the one before (the other
 * way round in Persian), Space to play, Esc to close, + and − for the size
 * of the words (remembered for next time). It asks for the whole
 * screen on the way in and keeps the screen awake while it is open. The pen
 * (or D) draws over it all, for teaching; Esc puts the pen down first.
 */

/** The step the Arabic is set at, by how much of it there is. */
export function presentSize(length: number): 'l' | 'm' | 's' | 'xs' {
  if (length < 90) return 'l';
  if (length < 220) return 'm';
  if (length < 480) return 's';
  return 'xs';
}

const SCALE_KEY = 'ham.present.scale';
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

function storedScale(): number {
  try {
    const value = Number(localStorage.getItem(SCALE_KEY));
    return value ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)) : 1;
  } catch {
    return 1;
  }
}

export function Present({
  locale,
  arabicName,
  title,
  progress,
  counter,
  above,
  arabic,
  length,
  translation,
  translated,
  silent,
  stepKey,
  playing,
  labels,
  onStep,
  onClose,
  onToggleTranslated,
  onPlay,
}: {
  locale: Locale;
  arabicName: string;
  title: string;
  /** Nought to one. */
  progress: number;
  counter: string;
  above?: ReactNode;
  arabic: ReactNode;
  /** Characters in the Arabic, for its size. */
  length: number;
  translation: string | null;
  translated: boolean;
  silent?: boolean;
  /** Changes with every step, so the words animate in afresh. */
  stepKey: string;
  playing?: boolean;
  labels: {
    dialog: string;
    close: string;
    translation: string;
    play?: string;
    pause?: string;
    next: string;
    previous: string;
    smaller: string;
    larger: string;
  };
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
  onToggleTranslated: () => void;
  /** Only where there is something to play. */
  onPlay?: () => void;
}) {
  const rtl = locale === 'fa';
  const root = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  useEffect(() => setScale(storedScale()), []);
  const resize = useCallback((by: number) => {
    setScale((was) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((was + by) * 10) / 10));
      try {
        localStorage.setItem(SCALE_KEY, String(next));
      } catch {
        /* private mode: this visit only */
      }
      return next;
    });
  }, []);

  // The whole screen, the screen kept awake, and the page behind held still.
  useEffect(() => {
    let asked = false;
    const element = document.documentElement;
    if (!document.fullscreenElement && element.requestFullscreen) {
      element.requestFullscreen({ navigationUI: 'hide' }).then(
        () => {
          asked = true;
        },
        () => {
          /* refused: the overlay is the whole feature without it */
        },
      );
    }
    let lock: WakeLockSentinel | null = null;
    const wake = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock.request('screen').then(
        (sentinel) => {
          lock = sentinel;
        },
        () => {},
      );
    };
    wake();
    document.addEventListener('visibilitychange', wake);
    const body = document.body.style;
    const was = body.overflow;
    body.overflow = 'hidden';
    root.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('visibilitychange', wake);
      void lock?.release().catch(() => {});
      body.overflow = was;
      if (asked && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Leaving fullscreen by the browser's own means closes the presentation.
  useEffect(() => {
    let was = Boolean(document.fullscreenElement);
    const onChange = () => {
      const now = Boolean(document.fullscreenElement);
      if (was && !now) onClose();
      was = now;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      // The drawing tools keep their own keys: Enter and Space press a
      // button, the arrows move the pen's width or the bar itself.
      const target = event.target as HTMLElement | null;
      if (
        event.key !== 'Escape' &&
        target?.closest?.('.rd-ink-bar input, .rd-ink-grip, .rd-ink-mini')
      )
        return;
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        target?.closest?.('.rd-ink-bar, .rd-ink-mini, .rd-ink-remove')
      )
        return;
      if ([forward, 'PageDown', 'ArrowDown', 'Enter'].includes(event.key)) {
        event.preventDefault();
        onStep(1);
      } else if ([back, 'PageUp', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        onStep(-1);
      } else if (event.key === ' ') {
        event.preventDefault();
        if (onPlay) onPlay();
        else onStep(1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        if (drawing) setDrawing(false);
        else onClose();
      } else if (event.ctrlKey || event.metaKey || event.altKey) return;
      else if (event.key.toLowerCase() === 't') onToggleTranslated();
      else if (event.key.toLowerCase() === 'd') setDrawing((on) => !on);
      else if (event.key === '+' || event.key === '=') resize(0.1);
      else if (event.key === '-' || event.key === '_') resize(-0.1);
      else return;
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rtl, drawing, onStep, onClose, onPlay, onToggleTranslated, resize]);

  const Back = rtl ? CaretRight : CaretLeft;
  const Forward = rtl ? CaretLeft : CaretRight;

  return (
    <Portal>
      <div
        ref={root}
        className="rd-present"
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        tabIndex={-1}
        data-silent={silent ? 'on' : 'off'}
        data-drawing={drawing ? 'on' : 'off'}
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ '--present-scale': scale } as CSSProperties}
      >
        <div className="rd-present-top">
          <div className="rd-present-where">
            <span lang="ar" dir="rtl" className="rd-present-name">
              {arabicName}
            </span>
            <span className="rd-present-title">{title}</span>
          </div>
          <div className="rd-present-tools">
            <div className="rd-present-size" role="group">
              <button
                type="button"
                className="rd-present-btn"
                onClick={() => resize(-0.1)}
                disabled={scale <= MIN_SCALE}
                aria-label={labels.smaller}
                title={labels.smaller}
              >
                <span aria-hidden="true" dir="ltr">
                  A−
                </span>
              </button>
              <button
                type="button"
                className="rd-present-btn rd-present-big"
                onClick={() => resize(0.1)}
                disabled={scale >= MAX_SCALE}
                aria-label={labels.larger}
                title={labels.larger}
              >
                <span aria-hidden="true" dir="ltr">
                  A+
                </span>
              </button>
            </div>
            <InkToggle active={drawing} onToggle={() => setDrawing((on) => !on)} />
            <button
              type="button"
              className="rd-present-btn"
              aria-pressed={translated}
              onClick={onToggleTranslated}
              aria-label={labels.translation}
              title={labels.translation}
            >
              <Translate size={20} weight="duotone" aria-hidden="true" />
            </button>
            {onPlay ? (
              <button
                type="button"
                className="rd-present-play"
                aria-pressed={playing}
                onClick={onPlay}
                aria-label={playing ? labels.pause : labels.play}
              >
                {playing ? (
                  <Pause size={20} weight="fill" aria-hidden="true" />
                ) : (
                  <Play size={20} weight="fill" aria-hidden="true" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="rd-present-btn"
              onClick={onClose}
              aria-label={labels.close}
            >
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="rd-present-track" aria-hidden="true">
          <i style={{ inlineSize: `${Math.round(progress * 1000) / 10}%` }} />
        </div>

        <div className="rd-present-stage" onClick={() => onStep(1)}>
          <div key={stepKey} className="rd-present-words">
            {above}
            <p lang="ar" dir="rtl" className="rd-present-ar" data-size={presentSize(length)}>
              {arabic}
            </p>
            {translated && translation ? (
              <p className="rd-present-tr" lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
                {translation}
              </p>
            ) : null}
          </div>
        </div>

        <Ink active={drawing} pageKey={stepKey} onDone={() => setDrawing(false)} />

        <div className="rd-present-foot">
          <button type="button" className="rd-present-step" onClick={() => onStep(-1)}>
            <Back size={18} weight="bold" aria-hidden="true" />
            <span>{labels.previous}</span>
          </button>
          <span className="rd-present-count tabular" aria-live="polite">
            {counter}
          </span>
          <button type="button" className="rd-present-step" onClick={() => onStep(1)}>
            <span>{labels.next}</span>
            <Forward size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Portal>
  );
}
