'use client';

import { useEffect, type ReactNode } from 'react';
import { CaretLeft, CaretRight, Minus, Plus, Translate, X } from '@phosphor-icons/react/dist/ssr';
import type { Locale } from '@/lib/i18n/config';

/**
 * One passage at a time, on a dark ground, for a room.
 *
 * This is a reader turned into a projector: nothing on the screen but the
 * words, their translation and where you are. It takes the keys a
 * presenter's remote sends — the clickers all send page up and page down,
 * or an arrow pair — and a click anywhere on the stage, because in a hall
 * the nearest control is the screen itself.
 *
 * The Quran reads verses from it and the du'a reader lines; what differs
 * between them is which words and what to call the place you are at, which
 * is why both are handed in rather than worked out here.
 */
export function PresentOverlay({
  label,
  heading,
  position,
  progress,
  above,
  arabic,
  arabicSize,
  translation,
  locale,
  translated,
  silent,
  keyHint,
  stepLabels,
  closeLabel,
  translationLabel,
  largerLabel,
  smallerLabel,
  onStep,
  onClose,
  onToggleTranslated,
  onLarger,
  onSmaller,
}: {
  /** What the dialog is called to a screen reader. */
  label: string;
  /** The Arabic name of what is being read. */
  heading: string;
  /** Where in it we are, already written out. */
  position: string;
  /** How far through, nought to a hundred. */
  progress: number;
  /** Anything that stands above the words, such as the Basmala. */
  above?: ReactNode;
  arabic: ReactNode;
  arabicSize: string;
  translation: string | null;
  locale: Locale;
  translated: boolean;
  silent: boolean;
  keyHint: string;
  stepLabels: { next: string; previous: string };
  closeLabel: string;
  translationLabel: string;
  largerLabel: string;
  smallerLabel: string;
  /** +1 onwards, -1 back; crossing whatever boundary the reader has. */
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
  onToggleTranslated: () => void;
  onLarger: () => void;
  onSmaller: () => void;
}) {
  // The whole screen, asked of the document: a browser leaves fullscreen the
  // moment the element it was showing is taken out of the page, and this
  // overlay is unmounted on the way out.
  useEffect(() => {
    const element = document.documentElement;
    let asked = false;
    if (!document.fullscreenElement && element.requestFullscreen) {
      element.requestFullscreen({ navigationUI: 'hide' }).then(
        () => {
          asked = true;
        },
        () => {
          /* refused — the overlay is the whole feature without it */
        },
      );
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      if (asked && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <div
      className="qp"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-silent={silent ? 'on' : 'off'}
    >
      <div className="qp-top">
        <div className="qp-where">
          <span lang="ar" dir="rtl" className="qp-surah">
            {heading}
          </span>
          <span className="qp-pos">{position}</span>
        </div>
        {/* Kept together, so that on a narrow screen they drop to a row of
            their own instead of squeezing the name into a column four
            characters wide. */}
        <div className="qp-tools">
          <button
            type="button"
            className="qp-btn"
            aria-pressed={translated}
            onClick={onToggleTranslated}
            title={translationLabel}
            aria-label={translationLabel}
          >
            <Translate size={20} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" className="qp-btn" onClick={onSmaller} aria-label={smallerLabel}>
            <Minus size={16} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="qp-btn" onClick={onLarger} aria-label={largerLabel}>
            <Plus size={16} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="qp-btn" onClick={onClose} aria-label={closeLabel}>
            <X size={20} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The stage itself advances: in a hall the nearest control is the
          screen, and a presenter should not have to find a button. */}
      <div className="qp-stage" onClick={() => onStep(1)}>
        {above}
        <p lang="ar" dir="rtl" className="qp-ar" style={{ fontSize: arabicSize }}>
          {arabic}
        </p>
        {translated && translation ? (
          <p className="qp-tr" lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {translation}
          </p>
        ) : null}
      </div>

      <div className="qp-foot">
        <div className="qp-track" dir="rtl">
          <div className="qp-fill" style={{ inlineSize: `${progress}%` }} />
        </div>
        <div className="qp-nav" dir="rtl">
          <button
            type="button"
            className="qp-step"
            onClick={() => onStep(-1)}
            aria-label={stepLabels.previous}
          >
            <CaretRight size={22} weight="bold" aria-hidden="true" />
          </button>
          <p className="qp-keys" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {keyHint}
          </p>
          <button
            type="button"
            className="qp-step"
            onClick={() => onStep(1)}
            aria-label={stepLabels.next}
          >
            <CaretLeft size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
