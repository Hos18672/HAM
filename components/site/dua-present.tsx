'use client';

import { useTranslations } from 'next-intl';
import { digits } from '@/lib/i18n/format';
import { PresentOverlay } from './present-overlay';
import type { Locale } from '@/lib/i18n/config';

/**
 * A du'a presented, on the same overlay as the Quran: one line at a time,
 * on the dark ground, for a room reciting together.
 *
 * A du'a's lines are far longer than a verse and vary much more, so the
 * ladder is gentler at the top than the Quran's — the longest lines here
 * run to several hundred characters and must still be read from the back.
 */

export function lineSize(length: number): string {
  if (length < 70) return 'clamp(34px, 5.4vw, 88px)';
  if (length < 180) return 'clamp(28px, 4.2vw, 66px)';
  if (length < 380) return 'clamp(24px, 3.2vw, 50px)';
  return 'clamp(20px, 2.4vw, 38px)';
}

export function DuaPresent({
  arabic,
  translation,
  index,
  count,
  arabicTitle,
  locale,
  translated,
  scale,
  onStep,
  onClose,
  onToggleTranslated,
  onLarger,
  onSmaller,
}: {
  arabic: string;
  translation: string | null;
  /** Which spoken line this is, counting from one. */
  index: number;
  count: number;
  arabicTitle: string;
  locale: Locale;
  translated: boolean;
  scale: number;
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
  onToggleTranslated: () => void;
  onLarger: () => void;
  onSmaller: () => void;
}) {
  const t = useTranslations('reader');

  return (
    <PresentOverlay
      label={t('presentation')}
      heading={arabicTitle}
      position={t('lineOf', { n: digits(index, locale), of: digits(count, locale) })}
      progress={count ? (index / count) * 100 : 0}
      arabic={arabic}
      arabicSize={`calc(${scale} * ${lineSize(arabic.length)})`}
      translation={translation}
      locale={locale}
      translated={translated}
      silent={false}
      keyHint={t('presentKeys')}
      stepLabels={{ next: t('nextLine'), previous: t('previousLine') }}
      closeLabel={t('exitPresentation')}
      translationLabel={t('translationToggle')}
      largerLabel={t('larger')}
      smallerLabel={t('smaller')}
      onStep={onStep}
      onClose={onClose}
      onToggleTranslated={onToggleTranslated}
      onLarger={onLarger}
      onSmaller={onSmaller}
    />
  );
}
