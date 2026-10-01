'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CaretLeft, CaretRight, Minus, Plus, Translate, X } from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import { BASMALA } from '@/lib/quran-constants';
import type { PageAyah, SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';

/**
 * One verse at a time, on a dark ground, for a room.
 *
 * This is the reader turned into a projector: nothing on the screen but the
 * verse, its translation and where you are. It takes the keys a presenter's
 * remote sends — the clickers all send page up and page down, or an arrow
 * pair — and a click anywhere on the stage, because in a hall the nearest
 * control is the screen itself.
 *
 * The Arabic grows and shrinks with the length of the verse: a three-word
 * ayah set at the size of a forty-word one wastes the whole wall, and the
 * other way round is unreadable from the back.
 */

const arabicIndic = (n: number) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));

/** The step the Arabic is set at, by how much of it there is. */
export function verseSize(length: number): string {
  if (length < 90) return 'clamp(40px, 6.6vw, 108px)';
  if (length < 220) return 'clamp(32px, 5vw, 80px)';
  if (length < 450) return 'clamp(26px, 3.6vw, 58px)';
  return 'clamp(22px, 2.7vw, 44px)';
}

export function QuranPresent({
  ayah,
  surah,
  pageNumber,
  locale,
  translated,
  silent,
  scale,
  onStep,
  onClose,
  onToggleTranslated,
  onLarger,
  onSmaller,
}: {
  ayah: PageAyah | null;
  surah: SurahInfo | undefined;
  pageNumber: number;
  locale: Locale;
  translated: boolean;
  silent: boolean;
  scale: number;
  /** +1 for the next verse, -1 for the one before; the reader crosses pages. */
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
  onToggleTranslated: () => void;
  onLarger: () => void;
  onSmaller: () => void;
}) {
  const t = useTranslations('quran');

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

  const text = ayah ? ayah.segments.map((s) => s.text).join('') : '';
  const size = `calc(${scale} * ${verseSize(text.length)})`;
  const position = ayah
    ? `${t('verseOf', { n: digits(ayah.number, locale), of: digits(surah?.ayahCount ?? 0, locale) })} · ${t('pageShort', { n: digits(pageNumber, locale) })}`
    : t('loading');
  const progress = ayah && surah?.ayahCount ? (ayah.number / surah.ayahCount) * 100 : 0;

  return (
    <div
      className="qp"
      role="dialog"
      aria-modal="true"
      aria-label={t('present')}
      data-silent={silent ? 'on' : 'off'}
    >
      <div className="qp-top">
        <div className="qp-where">
          <span lang="ar" dir="rtl" className="qp-surah">
            {surah?.name}
          </span>
          <span className="qp-pos">{position}</span>
        </div>
        <button
          type="button"
          className="qp-btn"
          aria-pressed={translated}
          onClick={onToggleTranslated}
          title={t('translationToggle')}
          aria-label={t('translationToggle')}
        >
          <Translate size={20} weight="duotone" aria-hidden="true" />
        </button>
        <button type="button" className="qp-btn" onClick={onSmaller} aria-label={t('smaller')}>
          <Minus size={16} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="qp-btn" onClick={onLarger} aria-label={t('larger')}>
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="qp-btn" onClick={onClose} aria-label={t('exitPresent')}>
          <X size={20} weight="duotone" aria-hidden="true" />
        </button>
      </div>

      {/* The stage itself advances: in a hall the nearest control is the
          screen, and a presenter should not have to find a button. */}
      <div className="qp-stage" onClick={() => onStep(1)}>
        {/* Where a surah opens, the Basmala stands on its own line: it is
            taken off the first verse when the page is built. */}
        {ayah && ayah.number === 1 && ayah.surah !== 1 && ayah.surah !== 9 ? (
          <p lang="ar" dir="rtl" className="qp-bism">
            {BASMALA}
          </p>
        ) : null}
        <p lang="ar" dir="rtl" className="qp-ar" style={{ fontSize: size }}>
          {ayah?.segments.map((segment, i) =>
            segment.silent ? (
              <span key={i} className="silent" data-kind={segment.silent}>
                {segment.text}
              </span>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
          {ayah ? (
            <span className="qp-mark">
              {'۝'}
              {arabicIndic(ayah.number)}
            </span>
          ) : null}
        </p>
        {translated && ayah ? (
          <p className="qp-tr" lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {ayah.translation}
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
            aria-label={t('previousVerse')}
          >
            <CaretRight size={22} weight="bold" aria-hidden="true" />
          </button>
          <p className="qp-keys" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {t('presentKeys')}
          </p>
          <button
            type="button"
            className="qp-step"
            onClick={() => onStep(1)}
            aria-label={t('nextVerse')}
          >
            <CaretLeft size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
