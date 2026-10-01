'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import type { Line } from '@/lib/dua-texts';
import type { Locale } from '@/lib/i18n/config';
import { Rosette } from './ornaments';
import { useReader } from './use-reader';
import { ReaderControls } from './reader-controls';
import { ReaderShell } from './reader-shell';

/** Where the next and previous du'a are, for the swipe and the buttons. */
export interface Neighbour {
  slug: string;
  title: string;
}

/**
 * A du'a read the way the mushaf is read: the Arabic line by line with the
 * translation under it, the whole screen if you want it, the letters at the
 * size you want them, and a swipe to the next text.
 *
 * It shares the mushaf's hook, its controls and its framed sheet on purpose.
 * Somebody who has learnt to read the Quran on this site already knows how
 * to read a du'a on it.
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

  const go = (to: Neighbour | null) => {
    if (to) router.push(`${basePath}/${to.slug}`);
  };

  const reader = useReader({
    storageKey: 'dua',
    // Leftwards is onwards, as in the mushaf: these are read right to left.
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
  function toggleTranslated() {
    const on = !translated;
    setTranslated(on);
    try {
      localStorage.setItem('dua-translated', on ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  }

  // Which column of the tuple this reader reads.
  const column = locale === 'fa' ? 1 : 2;
  let spoken = 0;

  return (
    <ReaderShell
      reader={reader}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-5)' }}
    >
      <div className="mushaf-toolbar">
        <button
          type="button"
          role="switch"
          aria-checked={translated}
          className="mushaf-switch"
          onClick={toggleTranslated}
        >
          <span className="mushaf-switch-track" aria-hidden="true" />
          {t('showTranslation')}
        </button>
        <ReaderControls reader={reader} locale={locale} />
      </div>

      <div className="mushaf-stage" id="dua-text" {...reader.swipe}>
        <article className="mushaf dua-sheet" aria-label={title}>
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />
          <Rosette className="mushaf-corner" />

          <header className="mushaf-head">
            <span lang="ar" dir="rtl">
              {arabicTitle}
            </span>
            <span className="mushaf-head-mark" aria-hidden="true" />
            <span>{t(`category.dua`)}</span>
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
              spoken += 1;
              const number = spoken;
              return (
                <li key={index} className="dua-line">
                  <p className="dua-ar" lang="ar" dir="rtl">
                    <span className="dua-num" aria-hidden="true">
                      {digits(number, locale)}
                    </span>
                    {arabic}
                  </p>
                  {rendering ? <p className="dua-tr">{rendering}</p> : null}
                </li>
              );
            })}
          </ol>

          {/* Onwards to the next du'a, in the order the page lists them. */}
          <footer className="mushaf-foot" dir="rtl">
            <button
              type="button"
              className="mushaf-turn"
              onClick={() => go(previous)}
              disabled={!previous}
              aria-label={previous ? `${t('previousDua')}: ${previous.title}` : t('previousDua')}
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
            </button>
            <span className="dua-foot-title">{title}</span>
            <button
              type="button"
              className="mushaf-turn"
              onClick={() => go(next)}
              disabled={!next}
              aria-label={next ? `${t('nextDua')}: ${next.title}` : t('nextDua')}
            >
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          </footer>
        </article>
      </div>

      <p className="reader-hint text-xs">{tReader('turnHintDua')}</p>
    </ReaderShell>
  );
}
