'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, BookOpenText, Play } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits } from '@/lib/i18n/format';
import { PAGE_COUNT } from '@/lib/quran-constants';
import { readLast, type LastRead } from '@/components/site/use-quran-store';
import type { Locale } from '@/lib/i18n/config';

/** A surah's name for the reader's language, from the API's list. */
export interface SurahName {
  number: number;
  name: string;
  transliteration: string;
}

/** "البقرة" from "سُورَةُ البَقَرَةِ": the name without the word "surah" and the marks. */
export function surahLabel(surah: SurahName | undefined, locale: Locale, fallback: string) {
  if (!surah) return fallback;
  if (locale === 'de') return surah.transliteration;
  return surah.name
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/^سورة\s+/, '');
}

/**
 * Where the reader left off in the Quran, from this device's storage, in one
 * of two looks: a mint card with a play button (home) or the dark card with
 * a gold "continue" button (the Quran index). Somebody who has not read here
 * yet is offered the first page instead.
 */
export function QuranContinueCard({
  surahs,
  locale,
  variant,
}: {
  surahs: SurahName[];
  locale: Locale;
  variant: 'mint' | 'dark';
}) {
  const t = useTranslations('quran');
  const tApp = useTranslations('app');
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(readLast()), []);

  const page = last?.page ?? 1;
  const surah = surahs.find((s) => s.number === (last?.s ?? 1));
  const name = surahLabel(surah, locale, digits(last?.s ?? 1, locale));
  const where = last
    ? tApp('surahAyah', { surah: name, n: digits(last.n, locale) })
    : tApp('startReading');
  const href = last ? `/quran/page/${last.page}#${last.s}:${last.n}` : '/quran/page/1';

  if (variant === 'dark') {
    return (
      <Link href={href} className="a-dark a-continue-dark a-press">
        <span className="a-stack a-grow">
          <span className="a-dark-dim" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
            {last ? t('continue') : t('readAsBook')}
          </span>
          <span style={{ fontSize: 'calc(18px * var(--a-fs))', fontWeight: 800 }}>{where}</span>
          <span className="a-gold-text" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
            {t('pageShort', { n: digits(page, locale) })}
          </span>
        </span>
        <span className="a-btn" data-variant="gold">
          {tApp('continueShort')}
          <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="a-mint a-row a-continue a-press a-rise">
      <span className="a-ico" data-on="white">
        <BookOpenText size={24} weight="duotone" aria-hidden="true" />
      </span>
      <span className="a-stack a-grow">
        <span className="a-sub" style={{ fontSize: 'calc(13px * var(--a-fs))' }}>
          {last ? t('continue') : t('readAsBook')}
        </span>
        <span className="a-title">{where}</span>
        <span className="a-progress" aria-hidden="true">
          <span style={{ inlineSize: `${Math.max(2, Math.round((page / PAGE_COUNT) * 100))}%` }} />
        </span>
      </span>
      <span className="a-play" aria-hidden="true">
        <Play size={18} weight="fill" />
      </span>
    </Link>
  );
}
