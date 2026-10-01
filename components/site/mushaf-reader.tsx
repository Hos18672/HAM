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
import { Rosette } from './ornaments';
import { useReader } from './use-reader';
import { usePaperTurn } from './use-paper-turn';
import { ReaderControls } from './reader-controls';
import { ReaderShell } from './reader-shell';
import type { MushafPage, PageAyah } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';

/** Pages fetched so far, kept across turns — and across readers. */
const loaded = new Map<string, MushafPage>();
/** Empty on the live site; the sub-path on the GitHub Pages preview. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const pending = new Map<string, Promise<MushafPage>>();

const pageFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const match = /\/quran\/page\/(\d+)/.exec(window.location.pathname);
  return match ? Number(match[1]) : null;
};

/**
 * The Quran as a book, one page at a time.
 *
 * **Only the book turns.** The page's data comes from `/api/quran/page/[n]`
 * on the live site and from a file the preview snapshot writes out
 * (`quran-data/<locale>/<n>.json`) where there is no server, and the address
 * is then corrected with `replaceState`, which Next treats as a shallow
 * update and does not navigate. Nothing else on the site page renders again,
 * and nothing — the whole screen, the chosen size, the reader's place — is
 * lost on a turn. It used to load the whole page afresh on the preview,
 * which is where that was most obvious.
 *
 * The pages either side are fetched ahead, so a turn is usually instant, and
 * the turn itself is a sheet of paper: see `use-paper-turn`.
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
  const tReader = useTranslations('reader');
  loaded.set(`${locale}:${initialPage.number}`, initialPage);
  const [page, setPage] = useState(() => {
    const n = pageFromUrl();
    return (n !== null && loaded.get(`${locale}:${n}`)) || initialPage;
  });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [marked, setMarked] = useState(true);
  /** Whether each verse carries its translation under it. */
  const [translated, setTranslated] = useState(false);

  const fetchPage = useCallback(
    (n: number): Promise<MushafPage> => {
      const key = `${locale}:${n}`;
      const done = loaded.get(key);
      if (done) return Promise.resolve(done);
      let entry = pending.get(key);
      if (!entry) {
        // On the preview there is no server to ask: the snapshot writes the
        // same answer out as a file beside the pages (see
        // `scripts/preview-snapshot.mjs`), so a turn is a fetch there too
        // rather than a fresh load of the whole site page.
        const url = BASE_PATH
          ? `${BASE_PATH}/quran-data/${locale}/${n}.json`
          : `/api/quran/page/${n}?locale=${locale}`;
        entry = fetch(url)
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

  const pageUrl = useCallback(
    (n: number, hash = '') => `${BASE_PATH}/${locale}/quran/page/${n}${hash}`,
    [locale],
  );

  /** Have the page in hand, ready to be drawn. */
  const prepare = useCallback(
    async (n: number) => {
      if (n < 1 || n > PAGE_COUNT) return false;
      if (loaded.has(`${locale}:${n}`)) return true;
      setLoading(true);
      try {
        await fetchPage(n);
        setFailed(false);
        return true;
      } catch {
        setFailed(true);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, locale],
  );

  /**
   * Put a page in place, and say so in the address bar.
   *
   * Through `History.prototype` on purpose, not through `history.replaceState`.
   * Next replaces that method with one that tells its router the path has
   * changed, and the router then rebuilds the route's whole subtree: measured
   * on the preview, every turn threw away the page shell and built it again —
   * the page-in animation replayed, every scroll reveal re-armed, and the
   * reader itself was rebuilt from nothing. That is the "it renders the whole
   * page" this was supposed to have fixed.
   *
   * Turning a leaf of the mushaf is not a navigation. The route is the same
   * page of the site before and after; only the reader's place in the book
   * has moved, and the address says where that is the way a bookmark does.
   * So the address is written and the router is left alone.
   *
   * The current entry's state object is passed back unchanged — it is the
   * router's own, and overwriting it with null would lose what the browser
   * needs to restore this entry on the way back.
   */
  const commit = useCallback(
    (n: number) => {
      const data = loaded.get(`${locale}:${n}`);
      if (!data) return;
      setPage(data);
      History.prototype.replaceState.call(window.history, window.history.state, '', pageUrl(n));
    },
    [locale, pageUrl],
  );

  /** Go somewhere named — a surah, a juz, a page typed in. No animation. */
  const show = useCallback(
    async (n: number, hash = '') => {
      if (!(await prepare(n))) return;
      commit(n);
      const id = hash ? hash.slice(1) : 'mushaf';
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          document.getElementById(id)?.scrollIntoView({ block: 'start' }),
        ),
      );
    },
    [commit, prepare],
  );

  // Fetch the neighbours ahead of the reader.
  useEffect(() => {
    if (page.number < PAGE_COUNT) fetchPage(page.number + 1).catch(() => {});
    if (page.number > 1) fetchPage(page.number - 1).catch(() => {});
  }, [page.number, fetchPage]);

  // The address may be stepped through with the back button, which is a
  // real navigation only when it leaves the reader; within it, catch up.
  useEffect(() => {
    const onPop = () => {
      const n = pageFromUrl();
      if (n !== null && n !== page.number) void show(n);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [page.number, show]);

  /** The sheet that swings on the spine. */
  const inBook = useCallback((n: number) => n >= 1 && n <= PAGE_COUNT, []);
  const paper = usePaperTurn({ page: page.number, canGo: inBook, prepare, commit });

  // The whole screen, the size of the letters, and the room. The turn is
  // the paper's: `use-paper-turn` has the gesture, because it draws the
  // sheet as it goes.
  const reader = useReader({ storageKey: 'quran' });

  // The keys turn the page as an Arabic book turns: left goes on. Presenting
  // adds the keys a presenter's remote sends — page up and page down, and
  // the space bar, which belongs to the scroll at every other time.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      // Typing belongs to the field, and the space bar belongs to whatever
      // button has focus — it is how a button is pressed. Everything else
      // is the book's, so the presenter's remote still works with the
      // button they just clicked still focused.
      if (el?.closest('input, select, textarea, [contenteditable]')) return;
      const onControl = Boolean(el?.closest('button, a, summary'));
      const remote = reader.presenting;
      const space = remote && !onControl && event.key === ' ';
      const onwards = event.key === 'ArrowLeft' || space || (remote && event.key === 'PageDown');
      const back = event.key === 'ArrowRight' || (remote && event.key === 'PageUp');
      if (!onwards && !back) return;
      event.preventDefault();
      paper.turn(page.number + (onwards ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page.number, paper, reader.presenting]);

  // The two reading switches, remembered per reader as a convenience only.
  useEffect(() => {
    try {
      if (localStorage.getItem('quran-silent') === 'off') setMarked(false);
      if (localStorage.getItem('quran-translated') === 'on') setTranslated(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  function toggleTranslated() {
    const next = !translated;
    setTranslated(next);
    try {
      localStorage.setItem('quran-translated', next ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  }
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

  // The two pages on the deck. Going on, the sheet in hand is the one being
  // read and the next page is revealed under it; going back, the sheet is
  // the page coming over and the one being read lies under it.
  const leafPage = paper.turning
    ? paper.direction === 1
      ? page
      : (loaded.get(`${locale}:${paper.to}`) ?? null)
    : null;
  const underPage =
    paper.turning && paper.direction === 1 ? (loaded.get(`${locale}:${paper.to}`) ?? page) : page;
  const pageProps = (shown: MushafPage) => ({
    page: shown,
    locale,
    translated,
    juzLabel: t('juz', { n: digits(shown.ayahs[0]!.juz, locale) }),
    pageLabel: t('pageOf', { n: digits(shown.number, locale) }),
  });
  const turnProps = {
    next: n < PAGE_COUNT ? () => paper.turn(n + 1) : undefined,
    previous: n > 1 ? () => paper.turn(n - 1) : undefined,
    nextLabel: t('nextPage'),
    previousLabel: t('previousPage'),
  };

  return (
    // `minmax(0, 1fr)`: a grid column otherwise grows to its widest content,
    // and on a narrow phone the surah picker's line pushed it off the screen.
    <ReaderShell
      reader={reader}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: 'var(--space-5)',
      }}
    >
      {/* The toolbar, in two bands: where to go, and how to read. Kept
          deliberately small — it sits above the page on a phone, and every
          row it takes is a row of the Quran the reader cannot see. The same
          bar whether the book is on the page or filling the screen. */}
      <div className="mushaf-toolbar">
        <div className="mushaf-bar-row">
          <Picker
            className="mushaf-field-wide"
            icon={<BookOpen size={18} weight="duotone" aria-hidden="true" />}
            label={t('surahSelect')}
            value={
              <>
                <span className="mushaf-pick-num">{digits(currentSurah, locale)}</span>
                <span lang="ar" className="mushaf-pick-ar">
                  {shortName(surahs[currentSurah - 1]?.name ?? '')}
                </span>
                <span className="mushaf-pick-latin">
                  {surahs[currentSurah - 1]?.transliteration}
                </span>
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
                  void show(surahPage[s] ?? n, `#surah-${s}`);
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
        </div>

        <div className="mushaf-bar-row mushaf-bar-read">
          <button
            type="button"
            role="switch"
            aria-checked={translated}
            className="mushaf-switch"
            onClick={toggleTranslated}
            title={t('translationToggle')}
          >
            <span className="mushaf-switch-track" aria-hidden="true" />
            {t('translationShort')}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={marked}
            className="mushaf-switch"
            onClick={toggleMarked}
            title={t('silentLegend')}
          >
            <span className="mushaf-switch-track" aria-hidden="true" />
            <span className="mushaf-silent-word">{t('markSilentShort')}</span>
            {/* On a narrow bar the words give way to the thing itself. */}
            <span className="mushaf-silent-mark" lang="ar" aria-hidden="true">
              ٱ
            </span>
          </button>
          {/* Grouped, so that where the band has to break it breaks here
              and the line below is a row of its own rather than two
              buttons left over. */}
          <div className="mushaf-bar-tools">
            <ReaderControls reader={reader} locale={locale} />
          </div>
        </div>
      </div>

      {/* The book, on a deck of two sheets so that a turn is a turn: the
          page in hand swings on the spine — the right-hand edge, this being
          a book read right to left — and the page under it comes into view
          as it goes. Only these two sheets are drawn again on a turn;
          nothing else on the site renders. */}
      <div
        ref={paper.stageRef}
        id="mushaf"
        className="mushaf-stage"
        data-silent={marked ? 'on' : 'off'}
        data-turning={paper.turning ? 'true' : undefined}
        aria-busy={loading}
        {...paper.gesture}
      >
        <div className="mushaf-deck">
          <MushafPageView
            {...pageProps(underPage)}
            turn={underPage === page ? turnProps : undefined}
            inert={underPage !== page}
          />
          {leafPage ? (
            <div
              ref={paper.leafRef}
              className="mushaf-leaf"
              aria-hidden="true"
              // Where the sheet starts, written here rather than waiting for
              // the first frame: coming back it stands upright, and a frame
              // of it lying flat would show the new page before the turn.
              style={{ transform: paper.direction === 1 ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
            >
              <div className="mushaf-leaf-face">
                <MushafPageView {...pageProps(leafPage)} />
              </div>
              {/* The back of the sheet: blank paper, as it is in a book. */}
              <div className="mushaf-leaf-back" />
              <div className="mushaf-leaf-shade" />
            </div>
          ) : null}
        </div>
      </div>

      {/* How to turn a page, for a reader who would not think to try. */}
      <p className="reader-hint text-xs">{tReader('turnHint')}</p>

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
    </ReaderShell>
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
/**
 * The surah's name without the word "surah" in front of it.
 *
 * On the button that opens the list there is room for the name and little
 * else, and the book beside it has already said what kind of thing this
 * is. The list itself keeps the full name.
 */
function shortName(name: string): string {
  const [first, ...rest] = name.split(/\s+/);
  return rest.length > 0 && bare(first ?? '') === 'سورة' ? rest.join(' ') : name;
}

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

type Block =
  | { kind: 'banner'; surah: number }
  | { kind: 'text'; ayahs: PageAyah[] }
  | { kind: 'translation'; ayah: PageAyah };

function MushafPageView({
  page,
  locale,
  juzLabel,
  pageLabel,
  turn,
  translated = false,
  inert = false,
}: {
  page: MushafPage;
  locale: Locale;
  juzLabel: string;
  pageLabel: string;
  /** Whether each verse carries its own translation under it. */
  translated?: boolean;
  /** Absent on a sheet that is only being turned past. */
  turn?: { next?: () => void; previous?: () => void; nextLabel: string; previousLabel: string };
  /** A page on the deck that is not the one being read: not for the cursor. */
  inert?: boolean;
}) {
  /**
   * The page, in the order it is read.
   *
   * Without the translation it is a page of the mushaf: the verses run on
   * into one another, justified line to line, as they are printed. With it,
   * each verse stands alone and its translation sits directly under it —
   * the two read together, which is the whole point of having it. A
   * translation gathered at the foot of the page is a glossary, and nobody
   * reads a glossary alongside the text.
   */
  const blocks: Block[] = [];
  for (const ayah of page.ayahs) {
    if (ayah.number === 1) blocks.push({ kind: 'banner', surah: ayah.surah });
    const last = blocks[blocks.length - 1];
    if (!translated && last?.kind === 'text') last.ayahs.push(ayah);
    else blocks.push({ kind: 'text', ayahs: [ayah] });
    if (translated) blocks.push({ kind: 'translation', ayah });
  }
  const headSurah = page.surahs[page.ayahs[0]!.surah];

  return (
    <article className="mushaf" aria-label={pageLabel} aria-hidden={inert || undefined}>
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

      <div className="mushaf-body" lang="ar" dir="rtl" data-translated={translated ? 'on' : 'off'}>
        {blocks.map((block, index) =>
          block.kind === 'translation' ? (
            <p
              key={`r${block.ayah.surah}:${block.ayah.number}`}
              className="mushaf-tr"
              lang={locale}
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            >
              <span className="mushaf-tr-ref" aria-hidden="true">
                {digits(block.ayah.number, locale)}
              </span>
              {block.ayah.translation}
            </p>
          ) : block.kind === 'banner' ? (
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
        {turn ? (
          <button
            type="button"
            className="mushaf-turn"
            onClick={turn.previous}
            disabled={!turn.previous}
            aria-label={turn.previousLabel}
          >
            <CaretRight size={18} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <span className="mushaf-turn mushaf-turn-blank" aria-hidden="true" />
        )}
        <span className="mushaf-folio">{digits(page.number, locale)}</span>
        {turn ? (
          <button
            type="button"
            className="mushaf-turn"
            onClick={turn.next}
            disabled={!turn.next}
            aria-label={turn.nextLabel}
          >
            <CaretLeft size={18} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <span className="mushaf-turn mushaf-turn-blank" aria-hidden="true" />
        )}
      </footer>
    </article>
  );
}
