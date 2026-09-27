'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits } from '@/lib/i18n/format';
import type { SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';
import { Card } from '../ui/card';

/** Arabic without its marks, and Latin without case, punctuation or doubled vowels. */
const bare = (text: string) =>
  text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0671/g, '\u0627')
    // Persian keyboards type these letters in their Persian forms.
    .replace(/\u06A9/g, '\u0643')
    .replace(/[\u06CC\u0649]/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    // The API's spellings double their long vowels (Yaseen, Al-Faatiha);
    // readers mostly do not.
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a');

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const latinDigits = (text: string) =>
  text.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));

/**
 * The 114 surahs as the site's card grid, with a search that takes a number
 * (in either script), the transliterated name, or the Arabic one.
 */
export function SurahIndex({
  surahs,
  startPage,
  locale,
}: {
  surahs: SurahInfo[];
  /** Index 1–114: the book page each surah begins on. */
  startPage: number[];
  locale: Locale;
}) {
  const t = useTranslations('quran');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = latinDigits(query.trim());
    if (!q) return surahs;
    if (/^\d+$/.test(q)) return surahs.filter((s) => String(s.number).startsWith(q));
    const needle = bare(q);
    return surahs.filter(
      (s) => bare(s.transliteration).includes(needle) || bare(s.name).includes(needle),
    );
  }, [query, surahs]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <label style={{ display: 'grid', gap: 'var(--space-2)', maxInlineSize: '24rem' }}>
        <span className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
          {t('search')}
        </span>
        <span style={{ position: 'relative', display: 'block' }}>
          <MagnifyingGlass
            size={18}
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetInlineStart: '14px',
              insetBlockStart: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-ink-muted)',
            }}
          />
          <input
            type="search"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            style={{ paddingInlineStart: '42px', inlineSize: '100%' }}
          />
        </span>
      </label>

      {shown.length === 0 ? (
        <p aria-live="polite" style={{ color: 'var(--color-ink-muted)' }}>
          {t('none')}
        </p>
      ) : (
        <ul className="surah-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map((surah) => (
            <li key={surah.number}>
              <Card variant="soft" interactive className="h-full" style={{ padding: 0 }}>
                {/* Straight to the page, at the surah's banner — not through the
                    surah's own address, which only a server can redirect. */}
                <Link
                  href={`/quran/page/${startPage[surah.number] ?? 1}#surah-${surah.number}`}
                  className="surah-card"
                >
                  <span className="ayah-mark" aria-hidden="true">
                    {digits(surah.number, locale)}
                  </span>
                  <span style={{ display: 'grid', gap: '2px', minInlineSize: 0 }}>
                    <span className="surah-arabic" lang="ar" dir="rtl">
                      {surah.name}
                    </span>
                    <span style={{ fontWeight: 'var(--weight-semibold)' }}>
                      <span className="visually-hidden">
                        {t('surah')} {surah.number}:{' '}
                      </span>
                      <span className="ltr-island">{surah.transliteration}</span>
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                      {t(surah.revelation)} ·{' '}
                      {t('ayahs', { count: digits(surah.ayahCount, locale) })}
                    </span>
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
