'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookmarkSimple, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits } from '@/lib/i18n/format';
import { JUZ_COUNT } from '@/lib/quran-constants';
import { filterSurahs } from '@/components/site/surah-index';
import type { Bookmark } from '@/components/site/use-quran-store';
import type { SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';
import { QuranContinueCard, surahLabel } from './quran-continue-card';

type Tab = 'surahs' | 'juz' | 'bookmarks';

function readBookmarks(): Bookmark[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem('ham:quran:bm') ?? '{}') as Record<
      string,
      Bookmark
    >;
    return Object.values(raw)
      .filter((b) => Number.isInteger(b?.page))
      .sort((a, b) => b.en - a.en);
  } catch {
    return [];
  }
}

/**
 * The Quran's index on a phone: search, three tabs (surahs, juz, bookmarks),
 * where the reader left off, and the surahs as rows with the eight-point
 * medallion, the name and the Arabic name.
 */
export function QuranIndexMobile({
  surahs,
  surahPage,
  juzPage,
  locale,
}: {
  surahs: SurahInfo[];
  surahPage: number[];
  juzPage: number[];
  locale: Locale;
}) {
  const t = useTranslations('quran');
  const [tab, setTab] = useState<Tab>('surahs');
  const [query, setQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => setBookmarks(readBookmarks()), []);

  const shown = useMemo(() => filterSurahs(surahs, query), [surahs, query]);
  const name = (n: number) => surahLabel(surahs[n - 1], locale, digits(n, locale));

  return (
    <div className="a-screen" style={{ gap: 12 }}>
      <h1 className="visually-hidden">{t('header.title')}</h1>
      <label className="a-search">
        <MagnifyingGlass size={21} weight="duotone" aria-hidden="true" />
        <span className="visually-hidden">{t('search')}</span>
        <input
          type="search"
          value={query}
          placeholder={t('searchSurahs')}
          onChange={(event) => {
            setQuery(event.target.value);
            setTab('surahs');
          }}
        />
      </label>
      <div className="a-seg" role="tablist" aria-label={t('surahSelect')}>
        {(['surahs', 'juz', 'bookmarks'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {t(key === 'surahs' ? 'tabSurahs' : key === 'juz' ? 'tabJuz' : 'tabBookmarks')}
            {key === 'bookmarks' && bookmarks.length ? (
              <span className="a-seg-count">{digits(bookmarks.length, locale)}</span>
            ) : null}
          </button>
        ))}
      </div>

      <QuranContinueCard surahs={surahs} locale={locale} variant="dark" />

      {tab === 'surahs' ? (
        shown.length === 0 ? (
          <p className="a-sub">{t('none')}</p>
        ) : (
          <ul className="a-surahs">
            {shown.map((surah) => (
              <li key={surah.number}>
                <Link href={`/quran/page/${surahPage[surah.number] ?? 1}`} className="a-surah">
                  <span className="a-medal">
                    <span>{digits(surah.number, locale)}</span>
                  </span>
                  <span className="a-stack a-grow">
                    <span className="a-title" style={{ fontSize: 'calc(16.5px * var(--a-fs))' }}>
                      {name(surah.number)}
                    </span>
                    <span className="a-sub">
                      {t('surahMeta', {
                        n: digits(surah.ayahCount, locale),
                        place: t(surah.revelation === 'meccan' ? 'placeMeccan' : 'placeMedinan'),
                      })}
                    </span>
                  </span>
                  {/* In Persian the name above is already the Arabic one. */}
                  {locale === 'de' ? (
                    <span className="a-surah-ar" lang="ar" dir="rtl">
                      {surahLabel(surah, 'fa', '')}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === 'juz' ? (
        <ul className="a-juz">
          {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((juz) => (
            <li key={juz}>
              <Link href={`/quran/page/${juzPage[juz] ?? 1}`} className="a-juz-tile a-press">
                <span className="a-juz-n">{digits(juz, locale)}</span>
                <span className="a-sub">
                  {t('juzTile', { n: digits(juzPage[juz] ?? 1, locale) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'bookmarks' ? (
        bookmarks.length === 0 ? (
          <p
            className="a-card a-sub"
            style={{ padding: 16, fontSize: 'calc(14px * var(--a-fs))', lineHeight: 1.8 }}
          >
            {t('bookmarksEmpty')}
          </p>
        ) : (
          <ul className="a-surahs">
            {bookmarks.map((b) => (
              <li key={`${b.s}:${b.n}`}>
                <Link href={`/quran/page/${b.page}#${b.s}:${b.n}`} className="a-surah">
                  <span className="a-ico" data-size="44">
                    <BookmarkSimple size={22} weight="fill" aria-hidden="true" />
                  </span>
                  <span className="a-stack a-grow">
                    <span className="a-title">
                      {t('verseTitle', { surah: name(b.s), n: digits(b.n, locale) })}
                    </span>
                    <span className="a-sub">{t('pageShort', { n: digits(b.page, locale) })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
