'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  BookOpen,
  Stack,
  Files,
  MagnifyingGlass,
} from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import { BASMALA, JUZ_COUNT, PAGE_COUNT } from '@/lib/quran-constants';
import type { MushafPage, PageAyah } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';

/**
 * Pages fetched so far, kept outside the component. Changing the page number
 * in the address bar makes Next remount the route's client tree with the page
 * it was first rendered for; the reader then reads the address and takes the
 * page it names from here, instead of jumping back.
 */
const loaded = new Map<string, MushafPage>();
const pending = new Map<string, Promise<MushafPage>>();
const pageFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const match = /\/quran\/page\/(\d+)/.exec(window.location.pathname);
  return match ? Number(match[1]) : null;
};

/**
 * The Quran as a book, one page at a time.
 *
 * The first page arrives with the site page. After that, turning a page swaps
 * only the book: the next page's data comes from `/api/quran/page/[n]`
 * (cached for a month), the address bar is updated so every page can still
 * be linked to and the back button still goes back a page, and nothing else
 * on the site page renders again. The pages either side are fetched ahead,
 * so a turn is usually instant.
 */
export function MushafReader({
  initialPage,
  surahs,
  surahPage,
  juzPage,
  locale,
}: {
  initialPage: MushafPage;
  surahs: { number: number; name: string; transliteration: string }[];
  surahPage: number[];
  juzPage: number[];
  locale: Locale;
}) {
  const t = useTranslations('quran');
  loaded.set(`${locale}:${initialPage.number}`, initialPage);
  const [page, setPage] = useState(() => {
    const n = pageFromUrl();
    return (n !== null && loaded.get(`${locale}:${n}`)) || initialPage;
  });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [marked, setMarked] = useState(true);
  const bookRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    (n: number): Promise<MushafPage> => {
      const key = `${locale}:${n}`;
      const done = loaded.get(key);
      if (done) return Promise.resolve(done);
      let entry = pending.get(key);
      if (!entry) {
        entry = fetch(`/api/quran/page/${n}?locale=${locale}`)
          .then((response) => {
            if (!response.ok) throw new Error(String(response.status));
            return response.json() as Promise<MushafPage>;
          })
          .then((data) => {
            loaded.set(key, data);
            return data;
          })
          .finally(() => pending.delete(key));
        pending.set(key, entry);
      }
      return entry;
    },
    [locale],
  );

  const show = useCallback(
    async (n: number, history: 'push' | 'none' = 'push', hash = '') => {
      if (n < 1 || n > PAGE_COUNT) return;
      setLoading(true);
      setFailed(false);
      try {
        const data = await fetchPage(n);
        setPage(data);
        if (history === 'push') {
          window.history.pushState({ quranPage: n }, '', `/${locale}/quran/page/${n}${hash}`);
        }
        // Bring the surah asked for into view, or else the top of the book
        // if the reader has scrolled past it.
        requestAnimationFrame(() => {
          const el = hash ? document.getElementById(hash.slice(1)) : bookRef.current;
          if (el && (hash || el.getBoundingClientRect().top < 0))
            el.scrollIntoView({ block: 'start' });
        });
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, locale],
  );

  // Fetch the neighbours ahead of the reader.
  useEffect(() => {
    if (page.number < PAGE_COUNT) fetchPage(page.number + 1).catch(() => {});
    if (page.number > 1) fetchPage(page.number - 1).catch(() => {});
  }, [page.number, fetchPage]);

  // Back and forward buttons of the browser.
  useEffect(() => {
    const onPop = () => {
      const match = /\/quran\/page\/(\d+)/.exec(window.location.pathname);
      if (match) void show(Number(match[1]), 'none');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  // The arrow keys turn the page as an Arabic book turns: left goes on.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      if (event.key === 'ArrowLeft') void show(page.number + 1);
      if (event.key === 'ArrowRight') void show(page.number - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page.number, show]);

  // The silent-letter switch, remembered per reader as a convenience only.
  useEffect(() => {
    try {
      if (localStorage.getItem('quran-silent') === 'off') setMarked(false);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function toggleMarked() {
    const next = !marked;
    setMarked(next);
    try {
      localStorage.setItem('quran-silent', next ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  }

  const first = page.ayahs[0]!;
  const currentSurah = surahPage.reduce(
    (found, start, s) => (s > 0 && start <= page.number ? s : found),
    1,
  );
  const n = page.number;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {/* The toolbar: where to go, and the one reading option. */}
      <div className="mushaf-toolbar">
        <Picker
          className="mushaf-field-wide"
          icon={<BookOpen size={18} weight="duotone" aria-hidden="true" />}
          label={t('surahSelect')}
          value={
            <>
              <span className="mushaf-pick-num">{digits(currentSurah, locale)}</span>
              <span lang="ar" className="mushaf-pick-ar">
                {surahs[currentSurah - 1]?.name}
              </span>
              <span className="mushaf-pick-latin">{surahs[currentSurah - 1]?.transliteration}</span>
            </>
          }
        >
          {(close) => (
            <SurahList
              surahs={surahs}
              current={currentSurah}
              locale={locale}
              placeholder={t('searchPlaceholder')}
              empty={t('none')}
              onPick={(s) => {
                close();
                void show(surahPage[s] ?? n, 'push', `#surah-${s}`);
              }}
            />
          )}
        </Picker>
        <Picker
          icon={<Stack size={18} weight="duotone" aria-hidden="true" />}
          label={t('juzSelect')}
          value={t('juz', { n: digits(first.juz, locale) })}
        >
          {(close) => (
            <div className="mushaf-juz-grid">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((juz) => (
                <button
                  key={juz}
                  type="button"
                  className="mushaf-juz"
                  aria-current={juz === first.juz ? 'true' : undefined}
                  onClick={() => {
                    close();
                    void show(juzPage[juz] ?? n);
                  }}
                >
                  {digits(juz, locale)}
                </button>
              ))}
            </div>
          )}
        </Picker>
        <Picker
          icon={<Files size={18} weight="duotone" aria-hidden="true" />}
          label={t('pageSelect')}
          value={t('pageShort', { n: digits(n, locale) })}
        >
          {(close) => (
            <PageJump
              current={n}
              locale={locale}
              goLabel={t('go')}
              label={t('pageSelect')}
              onPick={(p) => {
                close();
                void show(p);
              }}
            />
          )}
        </Picker>
        <button
          type="button"
          role="switch"
          aria-checked={marked}
          className="mushaf-switch"
          onClick={toggleMarked}
          title={t('silentLegend')}
        >
          <span className="mushaf-switch-track" aria-hidden="true" />
          {t('markSilentShort')}
        </button>
      </div>

      {/* The book. */}
      <div
        ref={bookRef}
        className="mushaf-stage"
        data-silent={marked ? 'on' : 'off'}
        aria-busy={loading}
      >
        <MushafPageView
          page={page}
          locale={locale}
          juzLabel={t('juz', { n: digits(first.juz, locale) })}
          pageLabel={t('pageOf', { n: digits(n, locale) })}
          turn={{
            next: n < PAGE_COUNT ? () => void show(n + 1) : undefined,
            previous: n > 1 ? () => void show(n - 1) : undefined,
            nextLabel: t('nextPage'),
            previousLabel: t('previousPage'),
          }}
        />
      </div>

      <p
        aria-live="polite"
        className="text-sm"
        style={{ color: 'var(--color-accent-2-text)', minBlockSize: '1em' }}
      >
        {failed ? t('unavailable') : null}
      </p>

      {marked ? (
        <p
          className="text-xs"
          style={{ marginBlockStart: 'calc(-1 * var(--space-4))', color: 'var(--color-ink-muted)' }}
        >
          <span className="silent-sample" lang="ar">
            ٱ
          </span>{' '}
          {t('silentLegend')}
        </p>
      ) : null}

      {/* The translation, under the page: the page stays a page of the book. */}
      <details className="mushaf-translation">
        <summary>{t('translationToggle')}</summary>
        <ol>
          {page.ayahs.map((ayah) => (
            <li key={`${ayah.surah}:${ayah.number}`}>
              <span className="mushaf-translation-ref">
                {digits(`${ayah.surah}:${ayah.number}`, locale)}
              </span>
              <span>{ayah.translation}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

/* ─── The pickers ───────────────────────────────────────────────────────── */

/**
 * A button that opens a panel of choices under it. Used instead of a native
 * select, whose list the browser draws in its own style and cannot be given
 * the site's. Closes on a choice, on Escape and on a click anywhere else.
 */
function Picker({
  icon,
  label,
  value,
  className = '',
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={`mushaf-field ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="mushaf-pick"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        <span className="visually-hidden">{label}: </span>
        <span className="mushaf-pick-value">{value}</span>
        <CaretDown size={14} weight="bold" aria-hidden="true" className="mushaf-pick-caret" />
      </button>
      {open ? (
        <div id={panelId} className="mushaf-panel" role="dialog" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/** Bare letters, for matching names however they are typed. */
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
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a');
const latinDigits = (text: string) =>
  text.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

function SurahList({
  surahs,
  current,
  locale,
  placeholder,
  empty,
  onPick,
}: {
  surahs: { number: number; name: string; transliteration: string }[];
  current: number;
  locale: Locale;
  placeholder: string;
  empty: string;
  onPick: (surah: number) => void;
}) {
  const [query, setQuery] = useState('');
  const list = useRef<HTMLUListElement>(null);
  const shown = useMemo(() => {
    const q = latinDigits(query.trim());
    if (!q) return surahs;
    if (/^\d+$/.test(q)) return surahs.filter((s) => String(s.number).startsWith(q));
    const needle = bare(q);
    return surahs.filter(
      (s) => bare(s.transliteration).includes(needle) || bare(s.name).includes(needle),
    );
  }, [query, surahs]);

  // Open on the surah being read, not at the top of the list.
  useEffect(() => {
    list.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div className="mushaf-surahs">
      <label className="mushaf-search">
        <MagnifyingGlass size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </label>
      {shown.length === 0 ? <p className="mushaf-empty">{empty}</p> : null}
      <ul ref={list}>
        {shown.map((surah) => (
          <li key={surah.number}>
            <button
              type="button"
              aria-current={surah.number === current ? 'true' : undefined}
              onClick={() => onPick(surah.number)}
            >
              <span className="mushaf-pick-num">{digits(surah.number, locale)}</span>
              <span lang="ar" className="mushaf-pick-ar">
                {surah.name}
              </span>
              <span className="mushaf-pick-latin">{surah.transliteration}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageJump({
  current,
  locale,
  label,
  goLabel,
  onPick,
}: {
  current: number;
  locale: Locale;
  label: string;
  goLabel: string;
  onPick: (page: number) => void;
}) {
  const [value, setValue] = useState(current);
  const valid = Number.isInteger(value) && value >= 1 && value <= PAGE_COUNT;
  return (
    <form
      className="mushaf-pagejump"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onPick(value);
      }}
    >
      <div className="mushaf-pagejump-row">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={PAGE_COUNT}
          value={Number.isNaN(value) ? '' : value}
          autoFocus
          aria-label={label}
          onChange={(event) => setValue(event.target.valueAsNumber)}
        />
        <span>/ {digits(PAGE_COUNT, locale)}</span>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!valid}>
          {goLabel}
        </button>
      </div>
      {/* Drawn right to left, as the book is read. */}
      <input
        type="range"
        min={1}
        max={PAGE_COUNT}
        value={valid ? value : current}
        aria-label={label}
        dir="rtl"
        onChange={(event) => setValue(Number(event.target.value))}
      />
    </form>
  );
}

/* ─── One page ──────────────────────────────────────────────────────────── */

const arabicIndic = (n: number) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));

type Block = { kind: 'banner'; surah: number } | { kind: 'text'; ayahs: PageAyah[] };

/** An eight-pointed star, the ornament at the frame's corners and the banner's ends. */
function Rosette({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <path
        d="M0-11 3-3 11 0 3 3 0 11-3 3-11 0-3-3Z M-7.8-7.8 0-4.2 7.8-7.8 4.2 0 7.8 7.8 0 4.2-7.8 7.8-4.2 0Z"
        fill="currentColor"
        fillRule="nonzero"
        opacity="0.9"
      />
      <circle r="2.2" fill="var(--card)" />
    </svg>
  );
}

function MushafPageView({
  page,
  locale,
  juzLabel,
  pageLabel,
  turn,
}: {
  page: MushafPage;
  locale: Locale;
  juzLabel: string;
  pageLabel: string;
  turn: { next?: () => void; previous?: () => void; nextLabel: string; previousLabel: string };
}) {
  const blocks: Block[] = [];
  for (const ayah of page.ayahs) {
    if (ayah.number === 1) blocks.push({ kind: 'banner', surah: ayah.surah });
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'text') last.ayahs.push(ayah);
    else blocks.push({ kind: 'text', ayahs: [ayah] });
  }
  const headSurah = page.surahs[page.ayahs[0]!.surah];

  return (
    <article className="mushaf" aria-label={pageLabel}>
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />

      <header className="mushaf-head">
        <span lang="ar" dir="rtl">
          {headSurah?.name}
        </span>
        <span className="mushaf-head-mark" aria-hidden="true" />
        <span>{juzLabel}</span>
      </header>

      <div className="mushaf-body" lang="ar" dir="rtl">
        {blocks.map((block, index) =>
          block.kind === 'banner' ? (
            <div key={`b${block.surah}`} id={`surah-${block.surah}`} className="mushaf-banner-wrap">
              <p className="mushaf-banner">
                <Rosette className="mushaf-banner-star" />
                <span>{page.surahs[block.surah]?.name}</span>
                <Rosette className="mushaf-banner-star" />
              </p>
              {block.surah !== 1 && block.surah !== 9 ? (
                <p className="mushaf-basmala">{BASMALA}</p>
              ) : null}
            </div>
          ) : (
            <p key={`t${index}`} className="mushaf-text">
              {block.ayahs.map((ayah) => (
                <span key={`${ayah.surah}:${ayah.number}`} id={`ayah-${ayah.surah}-${ayah.number}`}>
                  {ayah.segments.map((segment, i) =>
                    segment.silent ? (
                      <span key={i} className="silent" data-kind={segment.silent}>
                        {segment.text}
                      </span>
                    ) : (
                      segment.text
                    ),
                  )}{' '}
                  <span className="ayah-end" aria-label={`(${ayah.number})`}>
                    {'۝'}
                    {arabicIndic(ayah.number)}
                  </span>
                  {ayah.sajda ? <span className="mushaf-sajda">{'۩'}</span> : null}{' '}
                </span>
              ))}
            </p>
          ),
        )}
      </div>

      {/* The page turns sit on the page itself, either side of its number —
          in the order an Arabic book turns: onwards to the left. */}
      <footer className="mushaf-foot" dir="rtl">
        <button
          type="button"
          className="mushaf-turn"
          onClick={turn.previous}
          disabled={!turn.previous}
          aria-label={turn.previousLabel}
        >
          <CaretRight size={18} weight="bold" aria-hidden="true" />
        </button>
        <span className="mushaf-folio">{digits(page.number, locale)}</span>
        <button
          type="button"
          className="mushaf-turn"
          onClick={turn.next}
          disabled={!turn.next}
          aria-label={turn.nextLabel}
        >
          <CaretLeft size={18} weight="bold" aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
