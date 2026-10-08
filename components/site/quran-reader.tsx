'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  BookmarkSimple,
  BookOpen,
  CaretDown,
  CaretLeft,
  CaretRight,
  CircleNotch,
  Copy,
  DotsThree,
  LinkSimple,
  ListBullets,
  ListNumbers,
  MagnifyingGlass,
  Moon,
  Pause,
  Play,
  ProjectorScreen,
  SidebarSimple,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sun,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { arabicIndic, digits } from '@/lib/i18n/format';
import { BASMALA, JUZ_COUNT, PAGE_COUNT } from '@/lib/quran-constants';
import type { MushafPage, PageAyah, SurahInfo } from '@/lib/quran';
import type { Locale } from '@/lib/i18n/config';
import { Brand } from './header';
import {
  Equaliser,
  Medallion,
  Popover,
  Portal,
  Seg,
  Sheet,
  SizeControl,
  Toggle,
  copyText,
  shareLink,
  useMedia,
  useSwipe,
  useToast,
} from './rd/ui';
import { Present } from './rd/present';
import { RECITERS, useQuranAudio, type Reciter, type Track } from './use-quran-audio';
import {
  MAX_SCALE,
  MIN_SCALE,
  rememberLast,
  useQuranStore,
  type Bookmark,
} from './use-quran-store';

/**
 * The Quran, one page of the Medina mushaf at a time.
 *
 * **Only the book turns.** A page's data comes from `/api/quran/page/[n]` on
 * the live site, and from a file the preview snapshot writes out
 * (`quran-data/<locale>/<n>.json`) where there is no server. The address is
 * then written with `History.prototype.replaceState` — the method itself,
 * not the one Next replaces it with, which tells the router the path has
 * changed and makes it rebuild the whole route. Turning a page is not a
 * navigation: the route is the same before and after, and only the reader's
 * place in the book has moved.
 *
 * The screen is the reader's own on this route: a bar along the top that
 * says where you are, a list of the surahs and juz beside the page on a
 * wide screen, and a dock along the foot that plays the recitation and —
 * on a phone — turns the pages.
 */

/** Pages fetched so far, kept across turns — and across readers. */
const loaded = new Map<string, MushafPage>();
const pending = new Map<string, Promise<MushafPage>>();
/** Empty on the live site; the sub-path on the GitHub Pages preview. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const pageFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const match = /\/quran\/page\/(\d+)/.exec(window.location.pathname);
  return match ? Number(match[1]) : null;
};

/** `#2:106` → surah 2, verse 106. */
const verseFromHash = (): { s: number; n: number } | null => {
  const match = /^#(\d{1,3}):(\d{1,3})$/.exec(decodeURIComponent(window.location.hash));
  return match ? { s: Number(match[1]), n: Number(match[2]) } : null;
};

const verseId = (s: number, n: number) => `v-${s}-${n}`;
const plain = (ayah: PageAyah) => ayah.segments.map((segment) => segment.text).join('');

/** Folded for search: no case, no Latin accents, no Arabic marks. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ'ʿʾ`-]/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function QuranReader({
  initialPage,
  surahs,
  surahPage,
  juzPage,
  locale,
  translator,
}: {
  initialPage: MushafPage;
  surahs: SurahInfo[];
  surahPage: number[];
  juzPage: number[];
  locale: Locale;
  translator: string;
}) {
  const t = useTranslations('quran');
  const tr = useTranslations('reader');
  const rtl = locale === 'fa';
  const d = useCallback((value: number) => digits(value, locale), [locale]);

  loaded.set(`${locale}:${initialPage.number}`, initialPage);
  const [page, setPage] = useState(() => {
    const n = pageFromUrl();
    return (n !== null && loaded.get(`${locale}:${n}`)) || initialPage;
  });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = page.number;

  const store = useQuranStore();
  const { prefs } = store;
  const desktop = useMedia('(min-width: 1024px)');
  const [toastNode, toast] = useToast();

  /* ── Where every verse stands in the whole Quran ─────────────────────── */
  const offset = useMemo(() => {
    const out = [0, 0];
    for (const surah of surahs) out[surah.number + 1] = (out[surah.number] ?? 0) + surah.ayahCount;
    return out;
  }, [surahs]);
  const globalOf = useCallback(
    (ayah: { surah: number; number: number }) => (offset[ayah.surah] ?? 0) + ayah.number,
    [offset],
  );
  const surahOf = useCallback(
    (s: number) => page.surahs[s] ?? surahs.find((surah) => surah.number === s),
    [page.surahs, surahs],
  );
  const nameOf = useCallback(
    (s: number) => (rtl ? surahOf(s)?.name : surahOf(s)?.transliteration) ?? '',
    [rtl, surahOf],
  );

  /* ── The pages ───────────────────────────────────────────────────────── */
  const fetchPage = useCallback(
    (want: number): Promise<MushafPage> => {
      const key = `${locale}:${want}`;
      const done = loaded.get(key);
      if (done) return Promise.resolve(done);
      let entry = pending.get(key);
      if (!entry) {
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

  const pageUrl = useCallback(
    (want: number) => `${BASE_PATH}/${locale}/quran/page/${want}`,
    [locale],
  );

  /** The verse to light up once a page has arrived, by surah and number. */
  const highlightNext = useRef<{ s: number; n: number } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  /** Which verse presentation shows; -1 is "the last of the page". */
  const [presentAt, setPresentAt] = useState<number | null>(null);

  const go = useCallback(
    async (want: number, options: { at?: number; verse?: { s: number; n: number } } = {}) => {
      const target = Math.min(PAGE_COUNT, Math.max(1, want));
      const key = `${locale}:${target}`;
      if (!loaded.has(key)) {
        setLoading(true);
        try {
          await fetchPage(target);
          setFailed(false);
        } catch {
          setFailed(true);
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      const data = loaded.get(key);
      if (!data) return;
      highlightNext.current = options.verse ?? null;
      setPage(data);
      setHighlight(null);
      if (options.at !== undefined) setPresentAt((was) => (was === null ? null : options.at!));
      History.prototype.replaceState.call(
        window.history,
        window.history.state,
        '',
        pageUrl(target) + (options.verse ? `#${options.verse.s}:${options.verse.n}` : ''),
      );
      if (!options.verse) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [fetchPage, locale, pageUrl],
  );

  // The pages either side, fetched once the browser has a moment.
  useEffect(() => {
    const ahead = () => {
      if (n < PAGE_COUNT) fetchPage(n + 1).catch(() => {});
      if (n > 1) fetchPage(n - 1).catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(ahead, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(ahead, 600);
    return () => clearTimeout(id);
  }, [n, fetchPage]);

  // The back button can still step through the addresses.
  useEffect(() => {
    const onPop = () => {
      const want = pageFromUrl();
      if (want !== null && want !== n) void go(want);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [n, go]);

  // A deep link — `#2:106` — lights its verse, on arrival and on change.
  useEffect(() => {
    const read = () => {
      const want = verseFromHash();
      if (!want) return;
      const at = page.ayahs.findIndex((a) => a.surah === want.s && a.number === want.n);
      if (at >= 0) setHighlight(at);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
    // Only on arrival; a page turned to with a verse uses `highlightNext`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const want = highlightNext.current;
    highlightNext.current = null;
    if (!want) return;
    const at = page.ayahs.findIndex((a) => a.surah === want.s && a.number === want.n);
    if (at >= 0) setHighlight(at);
  }, [page]);

  /* ── The recitation ──────────────────────────────────────────────────── */
  const tracks: Track[] = useMemo(
    () =>
      page.ayahs.map((ayah) => ({
        global: globalOf(ayah),
        title: t('verseTitle', { surah: nameOf(ayah.surah), n: d(ayah.number) }),
      })),
    [page.ayahs, globalOf, t, nameOf, d],
  );
  const reciterName = t(`reciters.${prefs.reciter}`);
  const audio = useQuranAudio({
    tracks,
    reciter: prefs.reciter,
    speed: prefs.speed,
    artist: reciterName,
    album: t('header.title'),
    onPageEnd: () => {
      if (n < PAGE_COUNT) void go(n + 1, { at: 0 });
    },
    onPageStart: () => {
      if (n > 1) void go(n - 1, { at: -1 });
    },
    onError: () => toast(t('audioUnavailable')),
  });

  const active = audio.index ?? highlight;

  // The place to come back to: this page, and the verse being heard.
  useEffect(() => {
    const ayah = page.ayahs[active ?? 0];
    if (ayah) rememberLast({ page: n, s: ayah.surah, n: ayah.number });
  }, [n, page.ayahs, active]);

  // The verse being heard is brought into view, if it is not already.
  useEffect(() => {
    if (active === null) return;
    const ayah = page.ayahs[active];
    if (!ayah) return;
    const element = document.getElementById(verseId(ayah.surah, ayah.number));
    if (!element) return;
    const box = element.getBoundingClientRect();
    const dock = document.querySelector('.rd-dock')?.getBoundingClientRect().top ?? innerHeight;
    if (box.top >= 80 && box.bottom <= dock - 10) return;
    element.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [active, page.ayahs, prefs.view]);

  /* ── Panels ──────────────────────────────────────────────────────────── */
  const [sideOpen, setSideOpen] = useState(true);
  const [picker, setPicker] = useState<null | 'surahs' | 'juz' | 'bookmarks'>(null);
  const [pickerTab, setPickerTab] = useState<'surahs' | 'juz' | 'bookmarks'>('surahs');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [verseMenu, setVerseMenu] = useState<number | null>(null);
  const settingsAnchor = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closePicker = useCallback(() => setPicker(null), []);
  const closeVerseMenu = useCallback(() => setVerseMenu(null), []);
  const openPicker = (tab: 'surahs' | 'juz' | 'bookmarks') => {
    setPickerTab(tab);
    setPicker(tab);
  };

  /* ── Verse actions ───────────────────────────────────────────────────── */
  const isMarked = (ayah: PageAyah) => Boolean(store.bookmarks[globalOf(ayah)]);
  const toggleMark = (ayah: PageAyah) => {
    const added = store.toggleBookmark(globalOf(ayah), { s: ayah.surah, n: ayah.number, page: n });
    toast(added ? tr('bookmarked') : tr('unbookmarked'));
  };
  const reference = (ayah: PageAyah) => `${nameOf(ayah.surah)} ${d(ayah.surah)}:${d(ayah.number)}`;
  const copyVerse = async (ayah: PageAyah) => {
    const text = [plain(ayah), ayah.translation, `— ${reference(ayah)}`]
      .filter(Boolean)
      .join('\n\n');
    if (await copyText(text)) toast(t('verseCopied'));
  };
  const shareVerse = async (ayah: PageAyah) => {
    const url = `${window.location.origin}${pageUrl(n)}#${ayah.surah}:${ayah.number}`;
    const done = await shareLink(url, reference(ayah));
    if (done === 'copied') toast(tr('linkCopied'));
  };
  const playVerse = (at: number) => {
    if (audio.index === at) audio.toggle();
    else audio.playAt(at);
  };
  const present = (at: number) => {
    setSettingsOpen(false);
    setVerseMenu(null);
    setPresentAt(at);
  };

  /* ── Presentation ────────────────────────────────────────────────────── */
  const presenting = presentAt !== null;
  const shownAt =
    presentAt === null
      ? 0
      : Math.min(presentAt < 0 ? page.ayahs.length - 1 : presentAt, page.ayahs.length - 1);
  // Playing carries the wall along with it.
  useEffect(() => {
    if (presenting && audio.index !== null) setPresentAt(audio.index);
  }, [presenting, audio.index]);
  const stepPresent = useCallback(
    (by: 1 | -1) => {
      const next = shownAt + by;
      if (next >= page.ayahs.length) {
        if (n >= PAGE_COUNT) return;
        if (audio.playing) audio.queue(0);
        void go(n + 1, { at: 0 });
      } else if (next < 0) {
        if (n <= 1) return;
        if (audio.playing) audio.queue(-1);
        void go(n - 1, { at: -1 });
      } else {
        setPresentAt(next);
        if (audio.playing) audio.playAt(next);
      }
    },
    [shownAt, page.ayahs.length, n, audio, go],
  );
  const closePresent = useCallback(() => setPresentAt(null), []);

  /* ── Turning ─────────────────────────────────────────────────────────── */
  const forward = useCallback(() => {
    if (n < PAGE_COUNT) void go(n + 1);
  }, [n, go]);
  const backward = useCallback(() => {
    if (n > 1) void go(n - 1);
  }, [n, go]);
  // Onwards is the way the script runs: leftwards in German, rightwards in
  // Persian — for the swipe and the arrow keys alike.
  const swipe = useSwipe(rtl ? backward : forward, rtl ? forward : backward);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (presenting || picker || verseMenu !== null) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest('input, select, textarea, [contenteditable], [role="slider"]')) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight') (rtl ? backward : forward)();
      else if (event.key === 'ArrowLeft') (rtl ? forward : backward)();
      else if (event.key === ' ' && !el?.closest('button, a')) {
        event.preventDefault();
        audio.toggle();
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, picker, verseMenu, rtl, forward, backward, audio]);

  /* ── What the bar says ───────────────────────────────────────────────── */
  const first = page.ayahs[0];
  const firstSurah = first ? surahOf(first.surah) : undefined;
  const ofFirst = page.ayahs.filter((a) => a.surah === first?.surah);
  const range =
    ofFirst.length > 1
      ? `${d(ofFirst[0]!.number)}–${d(ofFirst[ofFirst.length - 1]!.number)}`
      : d(first?.number ?? 1);
  const juz = first?.juz ?? 1;
  const hizb = first?.hizbQuarter ? Math.ceil(first.hizbQuarter / 4) : null;
  const barMeta = t('barMeta', { page: d(n), juz: d(juz), range });

  const blocks = useMemo(() => groupBySurah(page), [page]);
  const mushaf = prefs.view === 'mushaf';
  const arPx = desktop ? 30 : 24;

  /* ── Settings, for the popover and the sheet alike ───────────────────── */
  const settings = (
    <div className="rd-settings">
      <div className="rd-field">
        <p className="rd-field-label">{t('viewSelect')}</p>
        <Seg
          label={t('viewSelect')}
          value={prefs.view}
          onChange={store.setView}
          options={[
            {
              value: 'verse',
              label: t('viewVerse'),
              icon: <ListNumbers size={17} weight="duotone" aria-hidden="true" />,
            },
            {
              value: 'mushaf',
              label: t('viewMushaf'),
              icon: <BookOpen size={17} weight="duotone" aria-hidden="true" />,
            },
          ]}
        />
      </div>
      <div className="rd-field">
        <p className="rd-field-label">{t('textSize')}</p>
        <SizeControl
          value={prefs.scale}
          min={MIN_SCALE}
          max={MAX_SCALE}
          onSmaller={store.smaller}
          onLarger={store.larger}
          label={t('textSize')}
          smallerLabel={t('smaller')}
          largerLabel={t('larger')}
          readout={`${d(Math.round(prefs.scale * 100))}%`}
        />
      </div>
      <Toggle
        checked={prefs.translated}
        onChange={store.toggleTranslated}
        label={t('translationShort')}
        hint={t('translationBy', { translator })}
        icon={<Translate size={18} weight="duotone" aria-hidden="true" />}
      />
      <Toggle
        checked={prefs.silent}
        onChange={store.toggleSilent}
        label={t('markSilentShort')}
        hint={t('silentLegend')}
        icon={
          <span lang="ar" className="rd-alif" aria-hidden="true">
            ٱ
          </span>
        }
      />
      <div className="rd-field">
        <p className="rd-field-label" id="rd-reciter">
          {t('reciter')}
        </p>
        <div className="rd-radios" role="radiogroup" aria-labelledby="rd-reciter">
          {RECITERS.map((voice: Reciter) => (
            <button
              key={voice}
              type="button"
              role="radio"
              aria-checked={prefs.reciter === voice}
              className="rd-radio"
              onClick={() => store.setReciter(voice)}
            >
              <span className="rd-radio-dot" aria-hidden="true" />
              {t(`reciters.${voice}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="rd-field">
        <p className="rd-field-label">{tr('scheme')}</p>
        <Seg
          label={tr('scheme')}
          value={store.night ? 'night' : 'light'}
          onChange={(value) => store.setScheme(value === 'night')}
          options={[
            {
              value: 'light',
              label: tr('light'),
              icon: <Sun size={17} weight="duotone" aria-hidden="true" />,
            },
            {
              value: 'night',
              label: tr('night'),
              icon: <Moon size={17} weight="duotone" aria-hidden="true" />,
            },
          ]}
        />
      </div>
      <button type="button" className="rd-row rd-row-action" onClick={() => present(active ?? 0)}>
        <span className="rd-row-icon">
          <ProjectorScreen size={18} weight="duotone" aria-hidden="true" />
        </span>
        <span className="rd-row-label">{tr('startPresentation')}</span>
      </button>
    </div>
  );

  const pickerProps = {
    locale,
    tab: pickerTab,
    onTab: setPickerTab,
    surahs,
    surahPage,
    juzPage,
    currentSurah: first?.surah ?? 1,
    currentJuz: juz,
    bookmarks: store.bookmarks,
    nameOf: (s: number) => nameOf(s),
    onPick: (want: number, verse?: { s: number; n: number }) => {
      setPicker(null);
      void go(want, { verse });
    },
  };

  const menuAyah = verseMenu === null ? undefined : page.ayahs[verseMenu];
  const presented = page.ayahs[shownAt];
  const presentedSurah = presented ? surahOf(presented.surah) : undefined;
  const ThemeIcon = store.night ? Sun : Moon;
  const PrevIcon = rtl ? CaretRight : CaretLeft;
  const NextIcon = rtl ? CaretLeft : CaretRight;

  return (
    <div
      className="rd rd-app"
      data-view={prefs.view}
      data-side={sideOpen ? 'open' : 'closed'}
      data-silent={prefs.silent ? 'on' : 'off'}
      style={
        {
          ['--rd-scale' as string]: prefs.scale,
          ['--rd-ar' as string]: `${arPx * prefs.scale}px`,
        } as React.CSSProperties
      }
    >
      {/* ── The bar ──────────────────────────────────────────────────── */}
      <header className="rd-bar">
        <div className="rd-bar-row">
          <div className="rd-bar-start">
            <button
              type="button"
              className="rd-round rd-desk"
              aria-pressed={sideOpen}
              onClick={() => setSideOpen((open) => !open)}
              aria-label={tr('sidebar')}
            >
              <SidebarSimple size={20} weight="duotone" aria-hidden="true" className="mirror" />
            </button>
            <span className="rd-desk rd-brand-wrap">
              <Brand />
            </span>
            <Link href="/quran" className="rd-round rd-mob" aria-label={tr('backToIndex')}>
              <ArrowLeft size={20} weight="bold" aria-hidden="true" className="mirror" />
            </Link>
          </div>

          <button
            type="button"
            className="rd-title"
            onClick={() => (desktop ? setSideOpen(true) : openPicker('surahs'))}
            aria-haspopup={desktop ? undefined : 'dialog'}
          >
            <span className="rd-title-ar" lang="ar" dir="rtl">
              {firstSurah?.name}
            </span>
            <span className="rd-title-text">
              <span className="rd-title-name">
                {rtl ? firstSurah?.name : firstSurah?.transliteration}
                <CaretDown size={13} weight="bold" aria-hidden="true" className="rd-mob" />
              </span>
              <span className="rd-title-meta tabular">{barMeta}</span>
            </span>
          </button>

          <div className="rd-bar-end">
            <button
              type="button"
              className="rd-round"
              onClick={() => store.setScheme(!store.night)}
              aria-label={store.night ? tr('themeToLight') : tr('themeToNight')}
            >
              <ThemeIcon size={20} weight="duotone" aria-hidden="true" />
            </button>
            <button
              ref={settingsAnchor}
              type="button"
              className="rd-pill rd-desk"
              aria-expanded={settingsOpen && desktop}
              aria-haspopup="dialog"
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <SlidersHorizontal size={18} weight="duotone" aria-hidden="true" />
              {tr('display')}
            </button>
            {desktop ? (
              <Popover
                open={settingsOpen}
                onClose={closeSettings}
                label={tr('display')}
                anchor={settingsAnchor}
              >
                {settings}
              </Popover>
            ) : null}
          </div>
        </div>
        <div className="rd-progress" aria-hidden="true">
          <i style={{ inlineSize: `${(n / PAGE_COUNT) * 100}%` }} />
        </div>
      </header>

      <div className="rd-layout">
        {/* ── Beside the page, on a wide screen ─────────────────────── */}
        <aside className="rd-side" aria-label={t('surahSelect')} inert={!sideOpen || undefined}>
          <div className="rd-side-inner">
            <Picker {...pickerProps} variant="side" />
          </div>
        </aside>

        {/* ── The page ──────────────────────────────────────────────── */}
        <div className="rd-main" {...swipe} aria-busy={loading} data-loading={loading || undefined}>
          {failed ? (
            <div className="rd-failed" role="alert">
              <p>{t('unavailable')}</p>
              <button type="button" className="rd-pill" onClick={() => void go(n)}>
                {t('retry')}
              </button>
            </div>
          ) : null}

          <div className="rd-col" key={`${n}-${prefs.view}`}>
            {mushaf ? (
              <MushafView
                page={page}
                blocks={blocks}
                locale={locale}
                translated={prefs.translated}
                active={active}
                playing={audio.playing}
                juzLabel={[
                  t('juzShort', { n: d(juz) }),
                  hizb ? t('hizbShort', { n: d(hizb) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                surahLabel={nameOf(first?.surah ?? 1)}
                onAyah={playVerse}
              />
            ) : (
              blocks.map((block) => {
                const surah = surahOf(block.surah);
                return (
                  <section key={`${block.surah}-${block.ayahs[0]?.number}`}>
                    {block.opens ? (
                      <header className="rd-surah rd-rise" id={`surah-${block.surah}`}>
                        <p className="rd-kicker">{t('surahKicker', { n: d(block.surah) })}</p>
                        <h2 className="rd-surah-ar" lang="ar" dir="rtl">
                          {surah?.name}
                        </h2>
                        <p className="rd-surah-meta">
                          {[
                            surah?.transliteration,
                            t('surahMeta', {
                              n: d(surah?.ayahCount ?? 0),
                              place:
                                surah?.revelation === 'medinan'
                                  ? t('placeMedinan')
                                  : t('placeMeccan'),
                            }),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {opensWithBasmala(block) ? (
                          <p className="rd-bism" lang="ar" dir="rtl">
                            {BASMALA}
                          </p>
                        ) : null}
                      </header>
                    ) : null}
                    {block.ayahs.map((ayah) => {
                      const at = block.start + block.ayahs.indexOf(ayah);
                      const isActive = active === at;
                      const isPlaying = audio.index === at && audio.playing;
                      const marked = isMarked(ayah);
                      return (
                        <article
                          key={`${ayah.surah}:${ayah.number}`}
                          id={verseId(ayah.surah, ayah.number)}
                          className="rd-verse rd-rise"
                          style={{ ['--i' as string]: Math.min(at, 8) }}
                          aria-label={t('ayahLabel', { n: d(ayah.number) })}
                          aria-current={isActive || undefined}
                          data-active={isActive || undefined}
                        >
                          <div className="rd-verse-top">
                            <Medallion
                              label={d(ayah.number)}
                              active={isActive}
                              onClick={() => playVerse(at)}
                              ariaLabel={t('playVerse', { n: d(ayah.number) })}
                            />
                            {audio.index === at ? <Equaliser paused={!isPlaying} /> : null}
                            {marked ? (
                              <BookmarkSimple
                                size={18}
                                weight="fill"
                                className="rd-flag"
                                aria-label={tr('bookmarks')}
                              />
                            ) : null}
                            <div className="rd-verse-actions rd-desk">
                              <button
                                type="button"
                                className="rd-ghost"
                                onClick={() => playVerse(at)}
                                aria-label={
                                  isPlaying ? t('pause') : t('playVerse', { n: d(ayah.number) })
                                }
                              >
                                {isPlaying ? (
                                  <Pause size={18} weight="fill" aria-hidden="true" />
                                ) : (
                                  <Play size={18} weight="fill" aria-hidden="true" />
                                )}
                              </button>
                              <button
                                type="button"
                                className="rd-ghost"
                                aria-pressed={marked}
                                onClick={() => toggleMark(ayah)}
                                aria-label={marked ? tr('bookmarkRemove') : tr('bookmarkAdd')}
                              >
                                <BookmarkSimple
                                  size={18}
                                  weight={marked ? 'fill' : 'duotone'}
                                  aria-hidden="true"
                                />
                              </button>
                              <button
                                type="button"
                                className="rd-ghost"
                                onClick={() => void copyVerse(ayah)}
                                aria-label={t('copyVerse')}
                              >
                                <Copy size={18} weight="duotone" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="rd-ghost"
                                onClick={() => present(at)}
                                aria-label={t('presentFrom')}
                              >
                                <ProjectorScreen size={18} weight="duotone" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="rd-ghost rd-more rd-mob"
                              onClick={() => setVerseMenu(at)}
                              aria-label={t('verseMenu', { n: d(ayah.number) })}
                              aria-haspopup="dialog"
                            >
                              <DotsThree size={24} weight="bold" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="rd-ar" lang="ar" dir="rtl">
                            <Arabic ayah={ayah} />
                          </p>
                          {prefs.translated ? (
                            <p className="rd-tr" lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
                              {ayah.translation}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                );
              })
            )}
          </div>

          {/* ── The end of the page: the pages either side ───────────── */}
          <nav className="rd-pagenav" aria-label={t('pageSelect')}>
            <button
              type="button"
              className="rd-pill rd-pill-outline"
              onClick={backward}
              disabled={n <= 1}
            >
              <PrevIcon size={16} weight="bold" aria-hidden="true" />
              {t('pageShort', { n: d(Math.max(1, n - 1)) })}
            </button>
            <span className="rd-pagenav-at tabular">{t('pageOf', { n: d(n) })}</span>
            <button type="button" className="rd-pill" onClick={forward} disabled={n >= PAGE_COUNT}>
              {t('pageShort', { n: d(Math.min(PAGE_COUNT, n + 1)) })}
              <NextIcon size={16} weight="bold" aria-hidden="true" />
            </button>
          </nav>
          <p className="rd-credits">{t('credits', { translator, reciter: reciterName })}</p>
        </div>
      </div>

      {/* ── The dock ─────────────────────────────────────────────────── */}
      <Portal>
        <div className="rd-dock-wrap" data-side={sideOpen ? 'open' : 'closed'}>
          <div className="rd-dock" dir={rtl ? 'rtl' : 'ltr'} lang={locale}>
            <div className="rd-dock-player">
              <button
                type="button"
                className="rd-play"
                aria-pressed={audio.playing}
                aria-label={audio.playing ? t('pause') : t('play')}
                onClick={audio.toggle}
                data-buffering={(audio.buffering && audio.index !== null) || undefined}
                style={{
                  ['--p' as string]: audio.duration ? Math.min(1, audio.time / audio.duration) : 0,
                }}
              >
                <span className="rd-play-core">
                  {audio.buffering && audio.index !== null ? (
                    <CircleNotch size={22} weight="bold" className="rd-spin" aria-hidden="true" />
                  ) : audio.playing ? (
                    <Pause size={22} weight="fill" aria-hidden="true" />
                  ) : (
                    <Play size={22} weight="fill" aria-hidden="true" />
                  )}
                </span>
              </button>
              <div className="rd-dock-text">
                <p className="rd-dock-title">
                  {audio.index !== null ? (
                    <>
                      <span>{tracks[audio.index]?.title}</span>
                      <Equaliser paused={!audio.playing} />
                    </>
                  ) : (
                    <span>{t('listen')}</span>
                  )}
                </p>
                <p className="rd-dock-sub">{reciterName}</p>
                <span className="rd-dock-line rd-desk" aria-hidden="true">
                  <i
                    style={{
                      inlineSize: `${audio.duration ? (audio.time / audio.duration) * 100 : 0}%`,
                    }}
                  />
                </span>
              </div>
              <div className="rd-skip" role="group">
                <button
                  type="button"
                  className="rd-skip-btn"
                  onClick={audio.previous}
                  disabled={audio.index === null || (audio.index === 0 && n <= 1)}
                  aria-label={t('previousVerse')}
                >
                  <SkipBack size={18} weight="fill" aria-hidden="true" className="mirror" />
                </button>
                <button
                  type="button"
                  className="rd-skip-btn"
                  onClick={audio.next}
                  aria-label={t('nextVerse')}
                >
                  <SkipForward size={18} weight="fill" aria-hidden="true" className="mirror" />
                </button>
              </div>
              <button
                type="button"
                className="rd-speed rd-desk"
                onClick={store.cycleSpeed}
                aria-label={t('speed')}
              >
                {d(prefs.speed)}×
              </button>
            </div>

            <div className="rd-dock-scrub rd-mob" data-dim={audio.index === null || undefined}>
              <span className="rd-time tabular">{clock(audio.time, locale)}</span>
              <Scrubber
                time={audio.time}
                duration={audio.duration}
                onSeek={audio.seek}
                label={t('seek')}
                rtl={rtl}
                locale={locale}
              />
              <span className="rd-time tabular">{clock(audio.duration, locale)}</span>
              <button
                type="button"
                className="rd-speed"
                onClick={store.cycleSpeed}
                aria-label={t('speed')}
              >
                {d(prefs.speed)}×
              </button>
            </div>

            <nav className="rd-dock-nav rd-mob" aria-label={tr('dock')}>
              <button type="button" className="rd-dock-word" onClick={() => openPicker('surahs')}>
                <ListBullets size={20} weight="duotone" aria-hidden="true" />
                <span>{tr('contents')}</span>
              </button>
              <button
                type="button"
                className="rd-round rd-round-lg"
                onClick={backward}
                disabled={n <= 1}
                aria-label={t('previousPage')}
              >
                <PrevIcon size={20} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" className="rd-dock-centre" onClick={() => openPicker('juz')}>
                <span className="rd-dock-centre-top tabular">{t('pageShort', { n: d(n) })}</span>
                <span className="rd-dock-centre-sub tabular">
                  {t('navCentre', { juz: d(juz) })}
                </span>
              </button>
              <button
                type="button"
                className="rd-round rd-round-lg"
                onClick={forward}
                disabled={n >= PAGE_COUNT}
                aria-label={t('nextPage')}
              >
                <NextIcon size={20} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" className="rd-dock-word" onClick={() => setSettingsOpen(true)}>
                <SlidersHorizontal size={20} weight="duotone" aria-hidden="true" />
                <span>{t('viewSelect')}</span>
              </button>
            </nav>
          </div>
        </div>
      </Portal>

      {/* ── Sheets, on a phone ───────────────────────────────────────── */}
      {!desktop ? (
        <>
          <Sheet
            open={picker !== null}
            onClose={closePicker}
            title={tr('contents')}
            closeLabel={tr('close')}
            className="rd-sheet-tall"
          >
            <Picker {...pickerProps} variant="sheet" />
          </Sheet>
          <Sheet
            open={settingsOpen}
            onClose={closeSettings}
            title={tr('display')}
            closeLabel={tr('close')}
          >
            {settings}
          </Sheet>
        </>
      ) : null}
      <Sheet
        open={menuAyah !== undefined}
        onClose={closeVerseMenu}
        title={
          menuAyah ? t('verseTitle', { surah: nameOf(menuAyah.surah), n: d(menuAyah.number) }) : ''
        }
        closeLabel={tr('close')}
      >
        {menuAyah ? (
          <div className="rd-menu">
            <p className="rd-menu-preview" lang="ar" dir="rtl">
              {plain(menuAyah)}
            </p>
            <MenuRow
              icon={<Play size={20} weight="fill" aria-hidden="true" />}
              label={t('playFromHere')}
              onClick={() => {
                audio.playAt(verseMenu!);
                closeVerseMenu();
              }}
            />
            <MenuRow
              icon={
                <BookmarkSimple
                  size={20}
                  weight={isMarked(menuAyah) ? 'fill' : 'duotone'}
                  aria-hidden="true"
                />
              }
              label={isMarked(menuAyah) ? tr('bookmarkRemove') : tr('bookmarkAdd')}
              onClick={() => {
                toggleMark(menuAyah);
                closeVerseMenu();
              }}
            />
            <MenuRow
              icon={<Copy size={20} weight="duotone" aria-hidden="true" />}
              label={t('copyVerse')}
              onClick={() => {
                void copyVerse(menuAyah);
                closeVerseMenu();
              }}
            />
            <MenuRow
              icon={<LinkSimple size={20} weight="duotone" aria-hidden="true" />}
              label={tr('shareLink')}
              onClick={() => {
                void shareVerse(menuAyah);
                closeVerseMenu();
              }}
            />
            <MenuRow
              icon={<ProjectorScreen size={20} weight="duotone" aria-hidden="true" />}
              label={t('presentFrom')}
              onClick={() => present(verseMenu!)}
            />
          </div>
        ) : null}
      </Sheet>

      {presenting && presented ? (
        <Present
          locale={locale}
          arabicName={presentedSurah?.name ?? ''}
          title={t('verseTitle', { surah: nameOf(presented.surah), n: d(presented.number) })}
          progress={presentedSurah?.ayahCount ? presented.number / presentedSurah.ayahCount : 0}
          counter={`${d(presented.number)} / ${d(presentedSurah?.ayahCount ?? 0)}`}
          above={
            presented.number === 1 && presented.surah !== 1 && presented.surah !== 9 ? (
              <p lang="ar" dir="rtl" className="rd-present-bism">
                {BASMALA}
              </p>
            ) : null
          }
          arabic={<Arabic ayah={presented} />}
          length={plain(presented).length}
          translation={presented.translation}
          translated={prefs.translated}
          silent={prefs.silent}
          stepKey={`${presented.surah}:${presented.number}`}
          playing={audio.playing && audio.index === shownAt}
          labels={{
            dialog: t('present'),
            close: t('exitPresent'),
            translation: t('translationToggle'),
            play: t('playVerse', { n: d(presented.number) }),
            pause: t('pause'),
            next: t('nextVerse'),
            previous: t('previousVerse'),
          }}
          onStep={stepPresent}
          onClose={closePresent}
          onToggleTranslated={store.toggleTranslated}
          onPlay={() => playVerse(shownAt)}
        />
      ) : null}

      {toastNode}
    </div>
  );
}

/* ─── Pieces ───────────────────────────────────────────────────────────── */

function MenuRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="rd-row rd-row-action" onClick={onClick}>
      <span className="rd-row-icon">{icon}</span>
      <span className="rd-row-label">{label}</span>
    </button>
  );
}

const clock = (seconds: number, locale: Locale) => {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return digits(`${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`, locale);
};

function Scrubber({
  time,
  duration,
  onSeek,
  label,
  rtl,
  locale,
}: {
  time: number;
  duration: number;
  onSeek: (seconds: number) => void;
  label: string;
  rtl: boolean;
  locale: Locale;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const at = drag ?? time;
  const fraction = duration ? Math.min(1, at / duration) : 0;

  const fromPointer = (x: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || !duration) return 0;
    const f = rtl ? (box.right - x) / box.width : (x - box.left) / box.width;
    return Math.max(0, Math.min(1, f)) * duration;
  };

  return (
    <div
      ref={track}
      className="rd-scrub"
      role="slider"
      tabIndex={duration ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(at)}
      aria-valuetext={`${clock(at, locale)} / ${clock(duration, locale)}`}
      aria-disabled={!duration || undefined}
      onPointerDown={(event) => {
        if (!duration) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(fromPointer(event.clientX));
      }}
      onPointerMove={(event) => {
        if (drag !== null) setDrag(fromPointer(event.clientX));
      }}
      onPointerUp={(event) => {
        if (drag === null) return;
        onSeek(fromPointer(event.clientX));
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(event) => {
        const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
        const back = rtl ? 'ArrowRight' : 'ArrowLeft';
        if (event.key === forward || event.key === 'ArrowUp') onSeek(time + 5);
        else if (event.key === back || event.key === 'ArrowDown') onSeek(time - 5);
        else if (event.key === 'Home') onSeek(0);
        else if (event.key === 'End') onSeek(duration);
        else return;
        event.preventDefault();
      }}
    >
      <span className="rd-scrub-track">
        <i style={{ inlineSize: `${fraction * 100}%` }} />
      </span>
      <span className="rd-scrub-thumb" style={{ insetInlineStart: `${fraction * 100}%` }} />
    </div>
  );
}

/* ─── The surahs, the juz and the bookmarks ────────────────────────────── */

function Picker({
  locale,
  variant,
  tab,
  onTab,
  surahs,
  surahPage,
  juzPage,
  currentSurah,
  currentJuz,
  bookmarks,
  nameOf,
  onPick,
}: {
  locale: Locale;
  variant: 'side' | 'sheet';
  tab: 'surahs' | 'juz' | 'bookmarks';
  onTab: (tab: 'surahs' | 'juz' | 'bookmarks') => void;
  surahs: SurahInfo[];
  surahPage: number[];
  juzPage: number[];
  currentSurah: number;
  currentJuz: number;
  bookmarks: Record<number, Bookmark>;
  nameOf: (s: number) => string;
  onPick: (page: number, verse?: { s: number; n: number }) => void;
}) {
  const t = useTranslations('quran');
  const d = (value: number) => digits(value, locale);
  const [query, setQuery] = useState('');
  const marks = Object.values(bookmarks).sort((a, b) => b.en - a.en);

  const shown = useMemo(() => {
    const q = fold(query);
    if (!q) return surahs;
    const number = Number(q.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))));
    return surahs.filter(
      (s) =>
        (Number.isInteger(number) && number > 0 && s.number === number) ||
        fold(s.transliteration).includes(q) ||
        fold(s.name).includes(q),
    );
  }, [query, surahs]);

  // The current surah's row is in view when the list opens.
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (tab !== 'surahs') return;
    const row = list.current?.querySelector<HTMLElement>('[aria-current="true"]');
    row?.scrollIntoView({ block: 'center' });
  }, [tab, variant]);

  return (
    <div className="rd-picker" data-variant={variant}>
      <Seg
        label={t('surahSelect')}
        value={tab}
        onChange={onTab}
        options={[
          { value: 'surahs', label: t('tabSurahs') },
          { value: 'juz', label: t('tabJuz') },
          {
            value: 'bookmarks',
            label: (
              <>
                {t('tabBookmarks')}
                {marks.length ? (
                  <span className="rd-count tabular"> · {d(marks.length)}</span>
                ) : null}
              </>
            ),
          },
        ]}
      />

      {tab === 'surahs' ? (
        <>
          <label className="rd-search">
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className="visually-hidden">{t('search')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchSurahs')}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          {shown.length === 0 ? <p className="rd-empty">{t('none')}</p> : null}
          <ul className="rd-list" ref={list}>
            {shown.map((s) => (
              <li key={s.number}>
                <button
                  type="button"
                  className="rd-surah-row"
                  aria-current={s.number === currentSurah || undefined}
                  onClick={() => onPick(surahPage[s.number] ?? 1)}
                >
                  <span className="rd-chip-n tabular">{d(s.number)}</span>
                  <span className="rd-surah-row-text">
                    <span className="rd-surah-row-name">
                      {locale === 'fa' ? s.name : s.transliteration}
                    </span>
                    <span className="rd-surah-row-meta">
                      {t('surahMeta', {
                        n: d(s.ayahCount),
                        place: s.revelation === 'medinan' ? t('placeMedinan') : t('placeMeccan'),
                      })}
                    </span>
                  </span>
                  {/* In Persian the name is already the Arabic one. */}
                  {locale === 'fa' ? null : (
                    <span className="rd-surah-row-ar" lang="ar" dir="rtl">
                      {s.name.replace(/^سُورَةُ\s*/, '')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : tab === 'juz' ? (
        <ul className="rd-juz">
          {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((j) => (
            <li key={j}>
              <button
                type="button"
                className="rd-juz-tile"
                aria-current={j === currentJuz || undefined}
                aria-label={`${t('juzShort', { n: d(j) })} · ${t('pageShort', { n: d(juzPage[j] ?? 1) })}`}
                onClick={() => onPick(juzPage[j] ?? 1)}
              >
                <span className="rd-juz-n tabular">{d(j)}</span>
                <span className="rd-juz-page tabular">
                  {t('juzTile', { n: d(juzPage[j] ?? 1) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : marks.length === 0 ? (
        <p className="rd-empty">{t('bookmarksEmpty')}</p>
      ) : (
        <ul className="rd-list">
          {marks.map((mark) => (
            <li key={`${mark.s}:${mark.n}`}>
              <button
                type="button"
                className="rd-surah-row"
                onClick={() => onPick(mark.page, { s: mark.s, n: mark.n })}
              >
                <span className="rd-chip-n">
                  <BookmarkSimple size={16} weight="fill" aria-hidden="true" />
                </span>
                <span className="rd-surah-row-text">
                  <span className="rd-surah-row-name">
                    {nameOf(mark.s) || surahs[mark.s - 1]?.transliteration} {d(mark.s)}:{d(mark.n)}
                  </span>
                  <span className="rd-surah-row-meta">{t('pageShort', { n: d(mark.page) })}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── The page, grouped by the surahs on it ────────────────────────────── */

interface Block {
  surah: number;
  /** Whether this surah begins here, and so takes its header. */
  opens: boolean;
  /** Where on the page its first verse is. */
  start: number;
  ayahs: PageAyah[];
}

function groupBySurah(page: MushafPage): Block[] {
  const blocks: Block[] = [];
  page.ayahs.forEach((ayah, index) => {
    const last = blocks[blocks.length - 1];
    if (!last || last.surah !== ayah.surah) {
      blocks.push({ surah: ayah.surah, opens: ayah.number === 1, start: index, ayahs: [ayah] });
    } else last.ayahs.push(ayah);
  });
  return blocks;
}

/** The Basmala stands on its own line wherever a surah opens with it. */
const opensWithBasmala = (block: Block) => block.opens && block.surah !== 1 && block.surah !== 9;

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
      <span className="rd-mark">
        {' ۝'}
        {arabicIndic(ayah.number)}
      </span>
    </>
  );
}

/* ─── The page as it is printed ────────────────────────────────────────── */

function MushafView({
  page,
  blocks,
  locale,
  translated,
  active,
  playing,
  juzLabel,
  surahLabel,
  onAyah,
}: {
  page: MushafPage;
  blocks: Block[];
  locale: Locale;
  translated: boolean;
  active: number | null;
  playing: boolean;
  juzLabel: string;
  surahLabel: string;
  onAyah: (index: number) => void;
}) {
  const t = useTranslations('quran');
  const ayah = (item: PageAyah, at: number) => (
    <span
      key={`${item.surah}:${item.number}`}
      id={verseId(item.surah, item.number)}
      className="rd-ayah"
      role="button"
      tabIndex={0}
      aria-label={t('playVerse', { n: digits(item.number, locale) })}
      data-active={active === at || undefined}
      data-playing={(active === at && playing) || undefined}
      onClick={() => onAyah(at)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onAyah(at);
        }
      }}
    >
      <Arabic ayah={item} />{' '}
    </span>
  );

  return (
    <>
      <article
        className="rd-mushaf rd-rise"
        aria-label={t('pageOf', { n: digits(page.number, locale) })}
      >
        <div className="rd-mushaf-frame">
          <header className="rd-mushaf-head">
            <span>{surahLabel}</span>
            <span className="tabular">{juzLabel}</span>
          </header>
          {blocks.map((block) => {
            const fatiha = block.opens && block.surah === 1;
            return (
              <div
                key={`${block.surah}-${block.ayahs[0]?.number}`}
                id={block.opens ? `surah-${block.surah}` : undefined}
              >
                {block.opens ? (
                  <h2 className="rd-mushaf-title" lang="ar" dir="rtl">
                    <span>{page.surahs[block.surah]?.name}</span>
                  </h2>
                ) : null}
                {opensWithBasmala(block) ? (
                  <p className="rd-bism" lang="ar" dir="rtl">
                    {BASMALA}
                  </p>
                ) : null}
                {/* Al-Fatiha's first verse *is* the Basmala, and stands on
                    its own line with its ۝١, as it is printed. */}
                {fatiha ? (
                  <p className="rd-mushaf-text rd-mushaf-alone" lang="ar" dir="rtl">
                    {ayah(block.ayahs[0]!, block.start)}
                  </p>
                ) : null}
                <p className="rd-mushaf-text" lang="ar" dir="rtl">
                  {(fatiha ? block.ayahs.slice(1) : block.ayahs).map((item) =>
                    ayah(item, block.start + block.ayahs.indexOf(item)),
                  )}
                </p>
              </div>
            );
          })}
          <footer className="rd-mushaf-foot">
            <span className="rd-folio tabular">{digits(page.number, locale)}</span>
          </footer>
        </div>
      </article>

      {translated ? (
        <section
          className="rd-mushaf-tr rd-rise"
          lang={locale}
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          <h2 className="rd-kicker">{t('translationShort')}</h2>
          <p>
            {page.ayahs.map((item) => (
              <span key={`${item.surah}:${item.number}`}>
                <sup className="tabular">{digits(item.number, locale)}</sup>
                {item.translation}{' '}
              </span>
            ))}
          </p>
        </section>
      ) : null}
    </>
  );
}
