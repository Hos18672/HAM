'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpenText } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits } from '@/lib/i18n/format';
import type { SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';
import { readLast, type LastRead } from './use-quran-store';

/**
 * "Continue: Al-Baqara 2:106 · page 17" — the place the reader was last at,
 * from this browser's own storage. Nothing is shown to somebody who has not
 * read here yet, and nothing at all on the server's first pass.
 */
export function QuranContinue({ surahs, locale }: { surahs: SurahInfo[]; locale: Locale }) {
  const t = useTranslations('quran');
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(readLast()), []);
  if (!last) return null;

  const surah = surahs.find((s) => s.number === last.s);
  const name = (locale === 'fa' ? surah?.name : surah?.transliteration) ?? '';
  return (
    <Link href={`/quran/page/${last.page}#${last.s}:${last.n}`} className="rd-continue">
      <span className="rd-continue-icon">
        <BookOpenText size={22} weight="duotone" aria-hidden="true" />
      </span>
      <span className="rd-continue-text">
        <span className="rd-continue-kicker">{t('continue')}</span>
        <span className="rd-continue-where">
          {t('continueAt', {
            surah: name,
            ref: `${digits(last.s, locale)}:${digits(last.n, locale)}`,
            page: digits(last.page, locale),
          })}
        </span>
      </span>
    </Link>
  );
}
