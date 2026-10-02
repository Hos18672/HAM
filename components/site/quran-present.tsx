'use client';

import { useTranslations } from 'next-intl';
import { arabicIndic, digits } from '@/lib/i18n/format';
import { BASMALA } from '@/lib/quran-constants';
import { PresentOverlay } from './present-overlay';
import type { PageAyah, SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';

/**
 * The Quran presented: one verse at a time, on the shared overlay.
 *
 * What is the Quran's own here is the step the Arabic is set at — a
 * three-word ayah set at the size of a forty-word one wastes the whole
 * wall, and the other way round is unreadable from the back — the Basmala
 * where a surah opens, and the verse-end sign.
 */

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
  onToggleSilent,
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
  onToggleSilent: () => void;
  onLarger: () => void;
  onSmaller: () => void;
}) {
  const t = useTranslations('quran');

  const text = ayah ? ayah.segments.map((s) => s.text).join('') : '';
  const position = ayah
    ? `${t('verseOf', { n: digits(ayah.number, locale), of: digits(surah?.ayahCount ?? 0, locale) })} · ${t('pageShort', { n: digits(pageNumber, locale) })}`
    : t('loading');

  return (
    <PresentOverlay
      label={t('present')}
      heading={surah?.name ?? ''}
      position={position}
      progress={ayah && surah?.ayahCount ? (ayah.number / surah.ayahCount) * 100 : 0}
      // Where a surah opens, the Basmala stands on its own line: it is
      // taken off the first verse when the page is built.
      above={
        ayah && ayah.number === 1 && ayah.surah !== 1 && ayah.surah !== 9 ? (
          <p lang="ar" dir="rtl" className="qp-bism">
            {BASMALA}
          </p>
        ) : null
      }
      arabic={
        <>
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
        </>
      }
      arabicSize={`calc(${scale} * ${verseSize(text.length)})`}
      translation={ayah?.translation ?? null}
      locale={locale}
      translated={translated}
      silent={silent}
      keyHint={t('presentKeys')}
      stepLabels={{ next: t('nextVerse'), previous: t('previousVerse') }}
      closeLabel={t('exitPresent')}
      translationLabel={t('translationToggle')}
      silentLabel={t('markSilent')}
      largerLabel={t('larger')}
      smallerLabel={t('smaller')}
      onStep={onStep}
      onClose={onClose}
      onToggleTranslated={onToggleTranslated}
      onToggleSilent={onToggleSilent}
      onLarger={onLarger}
      onSmaller={onSmaller}
    />
  );
}
