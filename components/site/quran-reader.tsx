'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CaretLeft,
  CaretRight,
  CornersIn,
  CornersOut,
  ListNumbers,
  Minus,
  Moon,
  Plus,
  Presentation,
  SlidersHorizontal,
  Sun,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import { BASMALA, JUZ_COUNT, PAGE_COUNT } from '@/lib/quran-constants';
import { Rosette } from './ornaments';
import { Fixed } from './reader-fixed';
import { usePaperTurn } from './use-paper-turn';
import { useQuranSettings, rememberPage } from './use-quran-settings';
import { QuranPresent } from './quran-present';
import type { MushafPage, PageAyah, SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';

/**
 * The Quran as a book, one page at a time.
 *
 * **Only the book turns.** The page's data comes from `/api/quran/page/[n]`
 * on the live site, and from a file the preview snapshot writes out
 * (`quran-data/<locale>/<n>.json`) where there is no server. The address is
 * then written with `History.prototype.replaceState` — the method itself,
 * not the one Next replaces it with, which tells the router the path has
 * changed and makes it rebuild the whole route. Turning a leaf is not a
 * navigation: the route is the same page of the site before and after, and
 * only the reader's place in the book has moved.
 *
 * Two ways to read it. **Verse by verse** sets each ayah on its own with its
 * translation under it, which is how somebody studies. **Mushaf** sets the
 * page as it is printed, justified and continuous, which is how somebody
 * recites — and there the leaf turns like paper (`use-paper-turn`). On top
 * of both sits presentation, for a room (`quran-present`).
 */

/** Pages fetched so far, kept across turns — and across readers. */
const loaded = new Map<string, MushafPage>();
/** Empty on the live site; the sub-path on the GitHub Pages preview. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const pending = new Map<string, Promise<MushafPage>>();

/** A finger has to travel this far across, and mostly across, to turn. */
const SWIPE_DISTANCE = 70;
const SWIPE_STRAIGHTNESS = 1.5;

const arabicIndic = (n: number) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));

const pageFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const match = /\/quran\/page\/(\d+)/.exec(window.location.pathname);
  return match ? Number(match[1]) : null;
};

export function QuranReader({
  initialPage,
  surahs,
  surahPage,
  juzPage,
  locale,
}: {
  initialPage: MushafPage;
  surahs: SurahInfo[];
  surahPage: number[];
  juzPage: number[];
  locale: Locale;
}) {
  const t = useTranslations('quran');
  const rtl = locale === 'fa';

  loaded.set(`${locale}:${initialPage.number}`, initialPage);
  const [page, setPage] = useState(() => {
    const n = pageFromUrl();
    return (n !== null && loaded.get(`${locale}:${n}`)) || initialPage;
  });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [presenting, setPresenting] = useState(false);
  /** Which verse of the page is on the wall; -1 means "the last one". */
  const [verse, setVerse] = useState(0);
  /** The slider's value while it is being dragged, before it is let go. */
  const [scrub, setScrub] = useState<number | null>(null);

  const settings = useQuranSettings();
  const n = page.number;

  /* ── The pages ────────────────────────────────────────────────────────── */
  const fetchPage = useCallback(
    (want: number): Promise<MushafPage> => {
      const key = `${locale}:${want}`;
      const done = loaded.get(key);
      if (done) return Promise.resolve(done);
      let entry = pending.get(key);
      if (!entry) {
        // On the preview there is no server to ask: the snapshot writes the
        // same answer out as a file beside the pages, so a turn is a fetch
        // there too rather than a fresh load of the whole site page.
        const url = BASE_PATH
          ? `${BASE_PATH}/quran-data/${locale}/${want}.json`
          : `/api/quran/page/${want}?locale=${locale}`;
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

  const prepare = useCallback(
    async (want: number) => {
      if (want < 1 || want > PAGE_COUNT) return false;
      if (loaded.has(`${locale}:${want}`)) return true;
      setLoading(true);
      try {
        await fetchPage(want);
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

  const pageUrl = useCallback(
    (want: number) => `${BASE_PATH}/${locale}/quran/page/${want}`,
    [locale],
  );

  const commit = useCallback(
    (want: number, at = 0) => {
      const data = loaded.get(`${locale}:${want}`);
      if (!data) return;
      setPage(data);
      setVerse(at);
      setScrub(null);
      rememberPage(want);
      // Through `History.prototype` on purpose — see the note at the top.
      // The entry's own state object is passed back unchanged: it is the
      // router's, and overwriting it would lose what the browser needs to
      // restore this entry on the way back.
      History.prototype.replaceState.call(window.history, window.history.state, '', pageUrl(want));
    },
    [locale, pageUrl],
  );

  /** Go to a page by name — a surah, a juz, a number typed in. */
  const go = useCallback(
    async (want: number, at = 0) => {
      const target = Math.min(PAGE_COUNT, Math.max(1, want));
      if (!(await prepare(target))) return;
      commit(target, at);
      if (!presenting) window.scrollTo({ top: 0 });
    },
    [commit, prepare, presenting],
  );

  // The page after this one, fetched ahead, so a turn is usually instant.
  useEffect(() => {
    if (n < PAGE_COUNT) fetchPage(n + 1).catch(() => {});
    if (n > 1) fetchPage(n - 1).catch(() => {});
  }, [n, fetchPage]);

  // The address can still be stepped through with the back button.
  useEffect(() => {
    const onPop = () => {
      const want = pageFromUrl();
      if (want !== null && want !== n) void go(want);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [n, go]);

  /* ── The leaf, in the mushaf view ─────────────────────────────────────── */
  const inBook = useCallback((want: number) => want >= 1 && want <= PAGE_COUNT, []);
  const paper = usePaperTurn({ page: n, canGo: inBook, prepare, commit });
  const mushaf = settings.view === 'mushaf';
  const turn = useCallback(
    (want: number) => {
      if (mushaf) paper.turn(want);
      else void go(want);
    },
    [mushaf, paper, go],
  );

  /* ── The whole screen ─────────────────────────────────────────────────── */
  const toggleFull = useCallback(() => {
    const element = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      setFull(false);
      return;
    }
    if (element.requestFullscreen) {
      element.requestFullscreen({ navigationUI: 'hide' }).catch(() => setFull((on) => !on));
      setFull(true);
      return;
    }
    // iOS Safari refuses fullscreen for anything but a video. The overlay
    // below is the whole feature there, and works.
    setFull((on) => !on);
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Filling the screen means the reader and nothing else: the site's header,
  // its footer and the notes under the page all stand down.
  useEffect(() => {
    const root = document.documentElement;
    if (full || presenting) root.dataset.readerFull = 'true';
    else delete root.dataset.readerFull;
    return () => {
      delete root.dataset.readerFull;
    };
  }, [full, presenting]);

  /* ── Presentation ─────────────────────────────────────────────────────── */
  const at = Math.min(
    verse < 0 ? page.ayahs.length - 1 : verse,
    Math.max(0, page.ayahs.length - 1),
  );
  const current = page.ayahs[at] ?? null;

  const step = useCallback(
    (by: 1 | -1) => {
      const next = at + by;
      if (next >= page.ayahs.length) {
        if (n < PAGE_COUNT) void go(n + 1, 0);
      } else if (next < 0) {
        if (n > 1) void go(n - 1, -1);
      } else {
        setVerse(next);
      }
    },
    [at, go, n, page.ayahs.length],
  );

  const present = useCallback((from = 0) => {
    setVerse(from);
    setPresenting(true);
    setOpen(false);
  }, []);

  /* ── Keys ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      const typing = el?.closest('input, select, textarea, [contenteditable]');
      if (typing && event.key !== 'Escape') return;

      if (presenting) {
        if (['ArrowLeft', ' ', 'PageDown', 'Enter', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          step(1);
        } else if (['ArrowRight', 'PageUp', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'Escape') setPresenting(false);
        else if (event.key.toLowerCase() === 't') settings.toggleTranslated();
        return;
      }

      // Onwards is leftwards here, as it is in the book: the next page of a
      // mushaf lies to the left of the one you are reading.
      if (event.key === 'ArrowLeft') turn(n + 1);
      else if (event.key === 'ArrowRight') turn(n - 1);
      else if (event.key.toLowerCase() === 'f') toggleFull();
      else if (event.key.toLowerCase() === 'p') present(0);
      else if (event.key.toLowerCase() === 't') settings.toggleTranslated();
      else if (event.key === 'Escape' && full) toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, step, settings, turn, n, toggleFull, present, full]);

  /* ── The finger ───────────────────────────────────────────────────────── */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const first = event.touches[0];
    touch.current = first ? { x: first.clientX, y: first.clientY } : null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const from = touch.current;
    const last = event.changedTouches[0];
    touch.current = null;
    if (!from || !last) return;
    const dx = last.clientX - from.x;
    const dy = last.clientY - from.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_STRAIGHTNESS) return;
    if (window.getSelection()?.toString()) return;
    // Carried to the right is onwards: a mushaf is bound on the right, so
    // the leaf you have finished is the one on the left and you take it
    // over the spine.
    turn(n + (dx > 0 ? 1 : -1));
  };

  const first = page.ayahs[0];
  const blocks = useMemo(() => groupBySurah(page), [page]);
  const arSize = `calc(${settings.scale} * clamp(1.3rem, 3.6vw, 1.95rem))`;
  const scrubAt = scrub ?? n;

  return (
    <div
      className="qr"
      data-view={settings.view}
      data-full={full || undefined}
      data-silent={settings.silent ? 'on' : 'off'}
      style={{ ['--qr-ar' as string]: arSize, ['--qr-scale' as string]: settings.scale }}
    >
      {/* ── Every choice there is ──────────────────────────────────────
          And nothing else. The bar used to name the surah as well, which
          the page's own running head already does a finger's width below
          it — on a real surah's name it took a second row of the bar to
          say it twice. */}
      <div className="qr-bar">
        {/* On a narrow screen only these three stay out; the rest fold
            behind the first of them. */}
        <div className="qr-compact">
          <button
            type="button"
            className="qr-chip"
            aria-expanded={open}
            aria-controls="qr-controls"
            onClick={() => setOpen((was) => !was)}
            aria-label={t('settings')}
          >
            <SlidersHorizontal size={20} weight="duotone" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="qr-chip"
            aria-pressed={full}
            onClick={toggleFull}
            aria-label={full ? t('exitFullscreen') : t('fullscreen')}
          >
            {full ? (
              <CornersIn size={20} weight="duotone" aria-hidden="true" />
            ) : (
              <CornersOut size={20} weight="duotone" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="qr-chip qr-present"
            onClick={() => present(0)}
            aria-label={t('present')}
          >
            <Presentation size={20} weight="duotone" aria-hidden="true" />
          </button>
        </div>

        <div className="qr-controls" id="qr-controls" data-open={open || undefined}>
          <label className="qr-select">
            <span className="visually-hidden">{t('surahSelect')}</span>
            <select
              value={first?.surah ?? 1}
              onChange={(event) => void go(surahPage[Number(event.target.value)] ?? n)}
            >
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {digits(s.number, locale)}. {rtl ? s.name : s.transliteration}
                </option>
              ))}
            </select>
          </label>

          <label className="qr-select qr-select-narrow">
            <span className="visually-hidden">{t('juzSelect')}</span>
            <select
              value={first?.juz ?? 1}
              onChange={(event) => void go(juzPage[Number(event.target.value)] ?? n)}
            >
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((juz) => (
                <option key={juz} value={juz}>
                  {t('juz', { n: digits(juz, locale) })}
                </option>
              ))}
            </select>
          </label>

          <div className="qr-seg" role="group" aria-label={t('viewSelect')}>
            <button
              type="button"
              aria-pressed={settings.view === 'verse'}
              onClick={() => settings.setView('verse')}
            >
              <ListNumbers size={17} weight="duotone" aria-hidden="true" />
              {t('viewVerse')}
            </button>
            <button type="button" aria-pressed={mushaf} onClick={() => settings.setView('mushaf')}>
              <BookOpen size={17} weight="duotone" aria-hidden="true" />
              {t('viewMushaf')}
            </button>
          </div>

          <button
            type="button"
            className="qr-chip qr-chip-wide"
            aria-pressed={settings.translated}
            onClick={settings.toggleTranslated}
          >
            <Translate size={17} weight="duotone" aria-hidden="true" />
            {t('translationShort')}
          </button>

          <button
            type="button"
            className="qr-chip qr-chip-wide"
            aria-pressed={settings.silent}
            onClick={settings.toggleSilent}
            title={t('silentLegend')}
          >
            <span lang="ar" aria-hidden="true" className="qr-alif">
              ٱ
            </span>
            <span className="qr-chip-word">{t('markSilentShort')}</span>
          </button>

          <div className="qr-size" role="group" aria-label={t('textSize')}>
            <button
              type="button"
              onClick={settings.smaller}
              disabled={!settings.canReduce}
              aria-label={t('smaller')}
            >
              <Minus size={13} weight="bold" aria-hidden="true" />
            </button>
            <span className="tabular" aria-hidden="true">
              {digits(Math.round(settings.scale * 100), locale)}%
            </span>
            <button
              type="button"
              onClick={settings.larger}
              disabled={!settings.canEnlarge}
              aria-label={t('larger')}
            >
              <Plus size={13} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="qr-chip"
            aria-pressed={settings.night}
            onClick={settings.toggleNight}
            aria-label={t('night')}
          >
            {settings.night ? (
              <Sun size={17} weight="duotone" aria-hidden="true" />
            ) : (
              <Moon size={17} weight="duotone" aria-hidden="true" />
            )}
          </button>

          <div className="qr-screen">
            <button
              type="button"
              className="qr-chip qr-chip-wide"
              aria-pressed={full}
              onClick={toggleFull}
            >
              {full ? (
                <CornersIn size={17} weight="duotone" aria-hidden="true" />
              ) : (
                <CornersOut size={17} weight="duotone" aria-hidden="true" />
              )}
              {full ? t('exitFullscreen') : t('fullscreen')}
            </button>
            <button
              type="button"
              className="qr-chip qr-present qr-chip-wide"
              onClick={() => present(0)}
            >
              <Presentation size={17} weight="duotone" aria-hidden="true" />
              {t('present')}
            </button>
          </div>
        </div>
      </div>

      {/* ── The page ───────────────────────────────────────────────────── */}
      <div
        className="qr-main"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-busy={loading}
      >
        {failed ? (
          <div className="qr-failed">
            <p>{t('unavailable')}</p>
            <button type="button" className="qr-retry" onClick={() => void go(n)}>
              {t('retry')}
            </button>
          </div>
        ) : mushaf ? (
          <MushafView
            page={page}
            blocks={blocks}
            locale={locale}
            translated={settings.translated}
            paper={paper}
            onPresentFrom={present}
          />
        ) : (
          <VerseView
            page={page}
            blocks={blocks}
            locale={locale}
            translated={settings.translated}
            onPresentFrom={present}
            presentLabel={t('presentFrom')}
          />
        )}
      </div>

      <Fixed scale={settings.scale} arSize={arSize} silent={settings.silent}>
        {/* ── Either side, where there is room for them ──────────────────── */}
        <button
          type="button"
          className="qr-side qr-side-prev"
          onClick={() => turn(n - 1)}
          disabled={n <= 1}
          aria-label={t('previousPage')}
        >
          <CaretRight size={22} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="qr-side qr-side-next"
          onClick={() => turn(n + 1)}
          disabled={n >= PAGE_COUNT}
          aria-label={t('nextPage')}
        >
          <CaretLeft size={22} weight="bold" aria-hidden="true" />
        </button>

        {/* ── Along the foot: where you are in 604 pages ─────────────────── */}
        <div className="qr-foot">
          <div className="qr-foot-inner" dir="rtl">
            <button
              type="button"
              className="qr-step"
              onClick={() => turn(n - 1)}
              disabled={n <= 1}
              aria-label={t('previousPage')}
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
              <span className="qr-step-word">{t('back')}</span>
            </button>
            <div className="qr-slider">
              <input
                type="range"
                min={1}
                max={PAGE_COUNT}
                value={scrubAt}
                dir="rtl"
                aria-label={t('pageSelect')}
                // Said in full to a screen reader; printed short beside the
                // slider, where it is a readout and not a caption.
                aria-valuetext={t('pageOf', { n: digits(scrubAt, locale) })}
                onChange={(event) => setScrub(Number(event.target.value))}
                // Only when it is let go: a page per pixel would ask the
                // server for six hundred pages on one drag.
                onPointerUp={() => scrub !== null && void go(scrub)}
                onKeyUp={() => scrub !== null && void go(scrub)}
                onTouchEnd={() => scrub !== null && void go(scrub)}
              />
              <p className="qr-slider-label tabular" aria-hidden="true" dir="ltr">
                {digits(scrubAt, locale)} / {digits(PAGE_COUNT, locale)}
              </p>
            </div>
            <button
              type="button"
              className="qr-step qr-step-next"
              onClick={() => turn(n + 1)}
              disabled={n >= PAGE_COUNT}
              aria-label={t('nextPage')}
            >
              <span className="qr-step-word">{t('forward')}</span>
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        {presenting ? (
          <QuranPresent
            ayah={current}
            surah={current ? page.surahs[current.surah] : undefined}
            pageNumber={n}
            locale={locale}
            translated={settings.translated}
            silent={settings.silent}
            scale={settings.scale}
            onStep={step}
            onClose={() => setPresenting(false)}
            onToggleTranslated={settings.toggleTranslated}
            onLarger={settings.larger}
            onSmaller={settings.smaller}
          />
        ) : null}
      </Fixed>
    </div>
  );
}

/* ─── The page, grouped by the surahs on it ──────────────────────────────── */

interface Block {
  surah: number;
  /** Whether this surah begins here, and so takes its header. */
  opens: boolean;
  ayahs: PageAyah[];
}

function groupBySurah(page: MushafPage): Block[] {
  const blocks: Block[] = [];
  for (const ayah of page.ayahs) {
    const last = blocks[blocks.length - 1];
    if (!last || last.surah !== ayah.surah) {
      blocks.push({ surah: ayah.surah, opens: ayah.number === 1, ayahs: [ayah] });
    } else last.ayahs.push(ayah);
  }
  return blocks;
}

/** The Basmala stands on its own line wherever a surah opens with it. */
const opensWithBasmala = (block: Block) => block.opens && block.surah !== 1 && block.surah !== 9;

/**
 * The sheet the words are printed on, which is the one this site has always
 * drawn: a gold double rule with a rosette at each corner, a running head
 * naming the surah and the juz, and the folio in its ring at the foot. The
 * du'a reader sits in the same frame, and somebody who has read one page
 * here knows the other.
 *
 * Both views use it. Verse by verse the column of verses is printed on it;
 * in the mushaf view the continuous page is. What the frame does not carry
 * is the page turns — those are in the bar along the bottom of the window.
 */
function Paper({
  page,
  locale,
  className,
  label,
  children,
}: {
  page: MushafPage;
  locale: Locale;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const t = useTranslations('quran');
  const first = page.ayahs[0];
  return (
    <article className={`mushaf qr-paper ${className}`} aria-label={label}>
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />
      <Rosette className="mushaf-corner" />

      {/* The head is the cartouche and nothing else. It used to name the
          surah and have the cartouche beneath it name it again, two rows
          deep; then the two became one band with the juz beside them, and
          the juz has gone to the foot with the page number, where the
          page's own facts belong. A surah that opens further down the
          page still gets its own cartouche where it opens. */}
      <header className="mushaf-head qr-head-band">
        <h2 className="qr-banner mushaf-banner" lang="ar" dir="rtl">
          <Rosette className="mushaf-banner-star" />
          <span>{first ? page.surahs[first.surah]?.name : ''}</span>
          <Rosette className="mushaf-banner-star" />
        </h2>
      </header>

      {children}

      {/* Which page, and which thirtieth of the book it falls in. */}
      <footer className="mushaf-foot">
        <span className="mushaf-folio">{digits(page.number, locale)}</span>
        <span className="qr-foot-juz">{t('juz', { n: digits(first?.juz ?? 1, locale) })}</span>
      </footer>
    </article>
  );
}

function SurahHead({
  surah,
  locale,
  meta,
  banner,
}: {
  surah: SurahInfo | undefined;
  locale: Locale;
  meta: string;
  banner: boolean;
}) {
  return (
    <header className="qr-surah" data-bannerless={banner ? undefined : 'true'}>
      {banner ? (
        <div className="qr-banner mushaf-banner-wrap">
          <h2 lang="ar" dir="rtl" className="mushaf-banner">
            <Rosette className="mushaf-banner-star" />
            <span>{surah?.name}</span>
            <Rosette className="mushaf-banner-star" />
          </h2>
        </div>
      ) : null}
      <p className="qr-surah-meta">{meta}</p>
      <span className="visually-hidden">{digits(surah?.number ?? 0, locale)}</span>
    </header>
  );
}

function Arabic({ ayah }: { ayah: PageAyah }) {
  return (
    <>
      {ayah.segments.map((segment, i) =>
        segment.silent ? (
          <span key={i} className="silent" data-kind={segment.silent}>
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
      <span className="qr-mark">
        {'۝'}
        {arabicIndic(ayah.number)}
      </span>
    </>
  );
}

/* ─── Verse by verse ─────────────────────────────────────────────────────── */

function VerseView({
  page,
  blocks,
  locale,
  translated,
  onPresentFrom,
  presentLabel,
}: {
  page: MushafPage;
  blocks: Block[];
  locale: Locale;
  translated: boolean;
  onPresentFrom: (index: number) => void;
  presentLabel: string;
}) {
  const t = useTranslations('quran');
  let index = -1;
  return (
    <Paper
      page={page}
      locale={locale}
      className="qr-verses"
      label={t('pageOf', { n: digits(page.number, locale) })}
    >
      {blocks.map((block) => {
        const surah = page.surahs[block.surah];
        return (
          <section key={`${block.surah}-${block.ayahs[0]?.number}`} id={`surah-${block.surah}`}>
            {block.opens ? (
              <>
                <SurahHead
                  surah={surah}
                  locale={locale}
                  // The head of the sheet already carries this one's
                  // cartouche; only the ones opening further down need
                  // their own.
                  banner={block !== blocks[0]}
                  meta={[
                    digits(block.surah, locale),
                    surah?.transliteration,
                    t('ayahCount', { n: digits(surah?.ayahCount ?? 0, locale) }),
                    surah ? t(surah.revelation) : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
                {opensWithBasmala(block) ? (
                  <p lang="ar" dir="rtl" className="qr-bism">
                    {BASMALA}
                  </p>
                ) : null}
              </>
            ) : null}
            {block.ayahs.map((ayah) => {
              index += 1;
              const from = index;
              return (
                <article key={`${ayah.surah}:${ayah.number}`} className="qr-verse">
                  <div className="qr-verse-top">
                    <span className="qr-pill">{digits(ayah.number, locale)}</span>
                    <button
                      type="button"
                      className="qr-from"
                      onClick={() => onPresentFrom(from)}
                      title={presentLabel}
                    >
                      <Presentation size={18} weight="duotone" aria-hidden="true" />
                      <span>{presentLabel}</span>
                    </button>
                  </div>
                  <p lang="ar" dir="rtl" className="qr-ar">
                    <Arabic ayah={ayah} />
                  </p>
                  {translated ? (
                    <p className="qr-tr" lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                      {ayah.translation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </section>
        );
      })}
    </Paper>
  );
}

/* ─── The page as it is printed ──────────────────────────────────────────── */

function MushafView({
  page,
  blocks,
  locale,
  translated,
  paper,
  onPresentFrom,
}: {
  page: MushafPage;
  blocks: Block[];
  locale: Locale;
  translated: boolean;
  paper: ReturnType<typeof usePaperTurn>;
  onPresentFrom: (index: number) => void;
}) {
  const t = useTranslations('quran');
  const leaf = paper.turning
    ? paper.direction === 1
      ? page
      : (loaded.get(`${locale}:${paper.to}`) ?? null)
    : null;
  const under =
    paper.turning && paper.direction === 1 ? (loaded.get(`${locale}:${paper.to}`) ?? page) : page;

  return (
    <>
      <div className="qr-stage" ref={paper.stageRef} {...paper.gesture}>
        <div className="qr-deck">
          <Sheet
            page={under}
            blocks={under === page ? blocks : groupBySurah(under)}
            locale={locale}
            onPresentFrom={under === page ? onPresentFrom : undefined}
          />
          {leaf ? (
            <div
              ref={paper.leafRef}
              className="qr-leaf"
              aria-hidden="true"
              style={{ transform: paper.direction === 1 ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
            >
              <div className="qr-leaf-face">
                <Sheet page={leaf} blocks={groupBySurah(leaf)} locale={locale} />
              </div>
              <div className="qr-leaf-back" />
              <div className="qr-leaf-shade" />
            </div>
          ) : null}
        </div>
      </div>

      {translated ? (
        <div className="qr-mushaf-tr">
          <p className="qr-mushaf-tr-head">{t('translationShort')}</p>
          <p lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {page.ayahs.map((ayah) => (
              <span key={`${ayah.surah}:${ayah.number}`}>
                <sup>{digits(ayah.number, locale)}</sup>
                {ayah.translation}{' '}
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </>
  );
}

function Sheet({
  page,
  blocks,
  locale,
  onPresentFrom,
}: {
  page: MushafPage;
  blocks: Block[];
  locale: Locale;
  onPresentFrom?: (index: number) => void;
}) {
  const t = useTranslations('quran');
  let index = -1;
  return (
    <Paper
      page={page}
      locale={locale}
      className="qr-sheet"
      label={t('pageOf', { n: digits(page.number, locale) })}
    >
      {blocks.map((block) => (
        <div key={`${block.surah}-${block.ayahs[0]?.number}`} id={`surah-${block.surah}`}>
          {block.opens ? (
            <>
              {/* Not for the first: the sheet's head is its cartouche. */}
              {block === blocks[0] ? null : (
                <div className="qr-banner mushaf-banner-wrap">
                  <h2 lang="ar" dir="rtl" className="mushaf-banner">
                    <Rosette className="mushaf-banner-star" />
                    <span>{page.surahs[block.surah]?.name}</span>
                    <Rosette className="mushaf-banner-star" />
                  </h2>
                </div>
              )}
              {opensWithBasmala(block) ? (
                <p lang="ar" dir="rtl" className="qr-bism">
                  {BASMALA}
                </p>
              ) : null}
            </>
          ) : null}
          <p lang="ar" dir="rtl" className="qr-sheet-text">
            {block.ayahs.map((ayah) => {
              index += 1;
              const from = index;
              return onPresentFrom ? (
                <span
                  key={`${ayah.surah}:${ayah.number}`}
                  className="qr-sheet-ayah"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPresentFrom(from)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onPresentFrom(from);
                    }
                  }}
                >
                  <Arabic ayah={ayah} />
                </span>
              ) : (
                <span key={`${ayah.surah}:${ayah.number}`}>
                  <Arabic ayah={ayah} />
                </span>
              );
            })}
          </p>
        </div>
      ))}
    </Paper>
  );
}
