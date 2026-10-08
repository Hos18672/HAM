'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  BookOpen,
  BookmarkSimple,
  CaretDown,
  CaretLeft,
  CaretRight,
  Copy,
  DotsThree,
  LinkSimple,
  ListBullets,
  ListNumbers,
  MagnifyingGlass,
  Moon,
  ProjectorScreen,
  SidebarSimple,
  SlidersHorizontal,
  Sun,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { arabicIndic, digits } from '@/lib/i18n/format';
import type { DuaCategory, DuaPayload, DuaStub } from '@/lib/dua-texts';
import type { Locale } from '@/lib/i18n/config';
import { Brand } from './header';
import {
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
import { readJson, useStored, writeJson } from './rd/storage';
import { useScheme } from './rd/scheme';

/**
 * A du'a, read the way the Quran is read on this site: the same bar, the
 * same list beside the text, the same cards, sheets and presentation.
 *
 * It owns the whole du'a — the heading, the words and the facts under them
 * — because turning to the next one replaces all three at once. Like the
 * mushaf, it fetches the next text and writes the address itself rather
 * than navigating: a route change would throw away the reader's place and
 * play the page's arrival again.
 */

/**
 * Whether a line is the Basmala, whatever marks and letterforms it carries:
 * the texts spell it with a superscript alef or a dagger one, with the
 * Persian yeh or the Arabic. It opens the text rather than being counted in
 * it. Compared with the marks stripped, as the mushaf does it.
 */
const bare = (text: string) =>
  text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
    .replace(/ٱ/g, 'ا')
    .replace(/[یى]/g, 'ي')
    .replace(/ک/g, 'ك')
    .replace(/\s+/g, ' ')
    .trim();
const BASMALA_BARE = bare('بسم الله الرحمن الرحيم');
const isBasmala = (text: string) => bare(text).startsWith(BASMALA_BARE);

/** Folded for search: no case, no Latin accents, no Arabic marks. */
const fold = (text: string) =>
  bare(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ'ʿʾ`-]/g, ''),
  );

/** Kept outside the component, so a turn does not throw the texts away. */
const loaded = new Map<string, DuaPayload>();
const pending = new Map<string, Promise<DuaPayload>>();
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function fetchDua(slug: string, locale: Locale): Promise<DuaPayload> {
  const key = `${locale}:${slug}`;
  const have = loaded.get(key);
  if (have) return Promise.resolve(have);
  let entry = pending.get(key);
  if (!entry) {
    // On GitHub Pages there is no server to ask, so the snapshot writes the
    // same object out as a file and the reader reads that instead.
    const url = BASE_PATH
      ? `${BASE_PATH}/dua-data/${locale}/${slug}.json`
      : `/api/duas/${slug}?locale=${locale}`;
    entry = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`du'a ${response.status}`);
        return response.json() as Promise<DuaPayload>;
      })
      .then((data) => {
        loaded.set(key, data);
        return data;
      });
    entry.catch(() => pending.delete(key));
    pending.set(key, entry);
  }
  return entry;
}

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

interface DuaPrefs {
  view: 'lines' | 'flow';
  scale: number;
  translated: boolean;
}

/**
 * Bookmarks, in this browser only (`ham:dua:bm`): a whole du'a, or one line
 * of it. Keyed by the slug, and the line's number after a `#`.
 */
export interface DuaBookmark {
  slug: string;
  n: number | null;
  en: number;
}
const BM_KEY = 'ham:dua:bm';
const markKey = (slug: string, n: number | null) => (n === null ? slug : `${slug}#${n}`);

function useDuaBookmarks() {
  const [marks, setMarks] = useState<Record<string, DuaBookmark>>({});
  useEffect(() => {
    const read = readJson<Record<string, DuaBookmark>>(BM_KEY);
    if (read && typeof read === 'object') setMarks(read);
  }, []);
  /** Adds or takes away; says which it did. */
  const toggle = useCallback(
    (slug: string, n: number | null) => {
      const key = markKey(slug, n);
      const added = !marks[key];
      const next = { ...marks };
      if (added) next[key] = { slug, n, en: Date.now() };
      else delete next[key];
      writeJson(BM_KEY, next);
      setMarks(next);
      return added;
    },
    [marks],
  );
  const has = (slug: string, n: number | null) => Boolean(marks[markKey(slug, n)]);
  return { marks, toggle, has };
}

/** `#line-12` → 12. */
const lineFromHash = () => {
  const match = /^#line-(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
};

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function DuaReader({
  initial,
  catalogue,
  locale,
  basePath,
}: {
  initial: DuaPayload;
  /** Every du'a that has a text, in the order the index lists them. */
  catalogue: readonly DuaStub[];
  locale: Locale;
  /** Locale-prefixed, e.g. `/de/duas`. */
  basePath: string;
}) {
  const t = useTranslations('duas');
  const tr = useTranslations('reader');
  const rtl = locale === 'fa';
  const d = useCallback((value: number) => digits(value, locale), [locale]);
  const column = rtl ? 1 : 2;

  const [dua, setDua] = useState(initial);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loaded.set(`${locale}:${initial.slug}`, initial);
    setDua(initial);
  }, [initial, locale]);

  const at = catalogue.findIndex((entry) => entry.slug === dua.slug);
  const previous = at > 0 ? catalogue[at - 1] : undefined;
  const next = at >= 0 && at < catalogue.length - 1 ? catalogue[at + 1] : undefined;

  const [stored, update] = useStored<DuaPrefs>('ham:dua:prefs', {
    view: 'lines',
    scale: 1,
    translated: true,
  });
  const prefs: DuaPrefs = {
    view: stored.view === 'flow' ? 'flow' : 'lines',
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(stored.scale) || 1)),
    translated: stored.translated !== false,
  };
  const sized = (by: number) =>
    update((was) => ({
      scale: Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.round(((was.scale || 1) + by) * 10) / 10),
      ),
    }));
  const toggleTranslated = useCallback(
    () => update((was) => ({ translated: was.translated === false })),
    [update],
  );
  // The colour scheme is the site's, shared with the Quran reader.
  const scheme = useScheme();
  const desktop = useMedia('(min-width: 1024px)');
  const [toastNode, toast] = useToast();
  const bm = useDuaBookmarks();
  const toggleMark = (n: number | null) =>
    toast(bm.toggle(dua.slug, n) ? tr('bookmarked') : tr('unbookmarked'));
  const duaMarked = bm.has(dua.slug, null);

  /* ── The lines that are said, numbered ───────────────────────────────── */
  const spoken = useMemo(() => {
    const out: { arabic: string; rendering: string; number: number | null; at: number }[] = [];
    let n = 0;
    dua.lines.forEach((line, index) => {
      const arabic = line[0];
      if (arabic === null) return;
      // The Basmala opens the du'a and is not one of its lines.
      const opening = out.length === 0 && isBasmala(arabic);
      out.push({ arabic, rendering: line[column] ?? '', number: opening ? null : ++n, at: index });
    });
    return out;
  }, [dua.lines, column]);
  const counted = spoken.reduce((most, line) => Math.max(most, line.number ?? 0), 0);
  const bySource = useMemo(
    () => new Map(spoken.map((line, step) => [line.at, { ...line, step }])),
    [spoken],
  );
  const opening = spoken[0]?.number === null ? spoken[0] : undefined;

  /* ── Turning, without telling the router ─────────────────────────────── */
  const [highlight, setHighlight] = useState<number | null>(null);
  // Bumped by a pick from the bookmarks, so the same line can be gone to twice.
  const [jump, setJump] = useState(0);
  const turn = useCallback(
    async (slug: string | undefined, line: number | null = null) => {
      if (!slug) return;
      if (slug === dua.slug) {
        if (line !== null) {
          setHighlight(line);
          setJump((was) => was + 1);
        }
        return;
      }
      try {
        const data = await fetchDua(slug, locale);
        setDua(data);
        setHighlight(line);
        setJump((was) => was + 1);
        setFailed(false);
        // Through `History.prototype` on purpose: Next replaces
        // `history.replaceState` with a version that tells its router the
        // path has changed, and the router then rebuilds the whole route.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          '',
          `${BASE_PATH}${basePath}/${slug}${line === null ? '' : `#line-${line}`}`,
        );
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      } catch {
        setFailed(true);
      }
    },
    [dua.slug, locale, basePath],
  );

  // The one after this is almost always the one wanted next.
  useEffect(() => {
    if (next) void fetchDua(next.slug, locale).catch(() => {});
  }, [next, locale]);

  // A link to a line lights it, and brings it into view.
  useEffect(() => {
    const read = () => {
      const n = lineFromHash();
      if (n !== null) setHighlight(n);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  useEffect(() => {
    if (highlight === null) return;
    const element = document.getElementById(`line-${highlight}`);
    element?.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [highlight, prefs.view, dua.slug, jump]);

  /* ── How far down the du'a ───────────────────────────────────────────── */
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(room > 0 ? Math.min(1, window.scrollY / room) : 1);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [dua.slug, prefs.view]);

  /* ── Panels ──────────────────────────────────────────────────────────── */
  const [sideOpen, setSideOpen] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lineMenu, setLineMenu] = useState<number | null>(null);
  const settingsAnchor = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closeLineMenu = useCallback(() => setLineMenu(null), []);

  /* ── Presentation ────────────────────────────────────────────────────── */
  const [presentAt, setPresentAt] = useState<number | null>(null);
  const present = (step: number) => {
    setSettingsOpen(false);
    setLineMenu(null);
    setPresentAt(step);
  };
  const stepPresent = useCallback(
    (by: 1 | -1) =>
      setPresentAt((was) => Math.min(spoken.length - 1, Math.max(0, (was ?? 0) + by))),
    [spoken.length],
  );
  const closePresent = useCallback(() => setPresentAt(null), []);
  const here = presentAt === null ? undefined : spoken[Math.min(presentAt, spoken.length - 1)];

  /* ── Line actions ────────────────────────────────────────────────────── */
  const reference = (n: number) => `${dua.title} · ${tr('lineTitle', { n: d(n) })}`;
  const copyLine = async (step: number) => {
    const line = spoken[step];
    if (!line) return;
    const text = [
      line.arabic,
      line.rendering,
      `— ${line.number ? reference(line.number) : dua.title}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    if (await copyText(text)) toast(tr('lineCopied'));
  };
  const shareLine = async (step: number) => {
    const line = spoken[step];
    if (!line?.number) return;
    const url = `${window.location.origin}${BASE_PATH}${basePath}/${dua.slug}#line-${line.number}`;
    if ((await shareLink(url, reference(line.number))) === 'copied') toast(tr('linkCopied'));
  };

  /* ── Turning by hand ─────────────────────────────────────────────────── */
  const forward = useCallback(() => void turn(next?.slug), [turn, next]);
  const backward = useCallback(() => void turn(previous?.slug), [turn, previous]);
  // Onwards is the way the script runs: leftwards in German, rightwards in Persian.
  const swipe = useSwipe(rtl ? backward : forward, rtl ? forward : backward);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (presentAt !== null || pickerOpen || lineMenu !== null) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest('input, select, textarea, [contenteditable]')) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight') (rtl ? backward : forward)();
      else if (event.key === 'ArrowLeft') (rtl ? forward : backward)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentAt, pickerOpen, lineMenu, rtl, forward, backward]);

  const flow = prefs.view === 'flow';
  const arPx = desktop ? 30 : 24;
  const category = t(`category.${dua.category}`);
  const meta = `${category} · ${tr('linesCount', { n: d(counted) })}`;
  const ThemeIcon = scheme.night ? Sun : Moon;
  const PrevIcon = rtl ? CaretRight : CaretLeft;
  const NextIcon = rtl ? CaretLeft : CaretRight;

  const settings = (
    <div className="rd-settings">
      <div className="rd-field">
        <p className="rd-field-label">{tr('viewSelect')}</p>
        <Seg
          label={tr('viewSelect')}
          value={prefs.view}
          onChange={(view) => update({ view })}
          options={[
            {
              value: 'lines',
              label: tr('viewLines'),
              icon: <ListNumbers size={17} weight="duotone" aria-hidden="true" />,
            },
            {
              value: 'flow',
              label: tr('viewFlow'),
              icon: <BookOpen size={17} weight="duotone" aria-hidden="true" />,
            },
          ]}
        />
      </div>
      <div className="rd-field">
        <p className="rd-field-label">{tr('textSize')}</p>
        <SizeControl
          value={prefs.scale}
          min={MIN_SCALE}
          max={MAX_SCALE}
          onSmaller={() => sized(-0.1)}
          onLarger={() => sized(0.1)}
          label={tr('textSize')}
          smallerLabel={tr('smaller')}
          largerLabel={tr('larger')}
          readout={`${d(Math.round(prefs.scale * 100))}%`}
        />
      </div>
      <Toggle
        checked={prefs.translated}
        onChange={toggleTranslated}
        label={t('showTranslation')}
        icon={<Translate size={18} weight="duotone" aria-hidden="true" />}
      />
      <div className="rd-field">
        <p className="rd-field-label">{tr('scheme')}</p>
        <Seg
          label={tr('scheme')}
          value={scheme.night ? 'night' : 'light'}
          onChange={(value) => scheme.setScheme(value === 'night')}
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
      <button type="button" className="rd-row rd-row-action" onClick={() => present(0)}>
        <span className="rd-row-icon">
          <ProjectorScreen size={18} weight="duotone" aria-hidden="true" />
        </span>
        <span className="rd-row-label">{tr('startPresentation')}</span>
      </button>
    </div>
  );

  const pickerProps = {
    locale,
    catalogue,
    current: dua.slug,
    marks: bm.marks,
    onPick: (slug: string, line: number | null = null) => {
      setPickerOpen(false);
      void turn(slug, line);
    },
  };

  const menuLine = lineMenu === null ? undefined : spoken[lineMenu];

  return (
    <div
      className="rd rd-app rd-dua"
      data-view={prefs.view}
      data-side={sideOpen ? 'open' : 'closed'}
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
            <Link href="/duas" className="rd-round rd-mob" aria-label={t('allDuas')}>
              <ArrowLeft size={20} weight="bold" aria-hidden="true" className="mirror" />
            </Link>
          </div>

          <button
            type="button"
            className="rd-title"
            onClick={() => (desktop ? setSideOpen(true) : setPickerOpen(true))}
            aria-haspopup={desktop ? undefined : 'dialog'}
          >
            <span className="rd-title-ar" lang="ar" dir="rtl">
              {dua.arabicTitle}
            </span>
            <span className="rd-title-text">
              <span className="rd-title-name">
                <span className="rd-title-clip">{dua.title}</span>
                <CaretDown size={13} weight="bold" aria-hidden="true" className="rd-mob" />
              </span>
              <span className="rd-title-meta tabular">{meta}</span>
            </span>
          </button>

          <div className="rd-bar-end">
            <button
              type="button"
              className="rd-round"
              aria-pressed={duaMarked}
              onClick={() => toggleMark(null)}
              aria-label={duaMarked ? t('unbookmarkDua') : t('bookmarkDua')}
              title={duaMarked ? t('unbookmarkDua') : t('bookmarkDua')}
            >
              <BookmarkSimple
                size={20}
                weight={duaMarked ? 'fill' : 'duotone'}
                aria-hidden="true"
                className={duaMarked ? 'rd-flag' : undefined}
              />
            </button>
            <button
              type="button"
              className="rd-round"
              onClick={() => scheme.setScheme(!scheme.night)}
              aria-label={scheme.night ? tr('themeToLight') : tr('themeToNight')}
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
          <i style={{ inlineSize: `${progress * 100}%` }} />
        </div>
      </header>

      <div className="rd-layout">
        <aside className="rd-side" aria-label={t('allDuas')} inert={!sideOpen || undefined}>
          <div className="rd-side-inner">
            <DuaPicker {...pickerProps} variant="side" />
          </div>
        </aside>

        <div className="rd-main" {...swipe}>
          {failed ? (
            <div className="rd-failed" role="alert">
              <p>{tr('unavailable')}</p>
            </div>
          ) : null}

          <div className="rd-col" key={`${dua.slug}-${prefs.view}`}>
            {/* ── Which du'a this is ─────────────────────────────────── */}
            <header className="rd-surah rd-rise">
              <p className="rd-kicker">{category}</p>
              <h1 className="rd-dua-h1">
                <span className="rd-surah-ar" lang="ar" dir="rtl">
                  {dua.arabicTitle}
                </span>
                <span className="rd-dua-title">{dua.title}</span>
              </h1>
              <p className="rd-surah-meta rd-dua-lede">{dua.summary}</p>
              {opening ? (
                <>
                  <p className="rd-bism" lang="ar" dir="rtl">
                    {opening.arabic}
                  </p>
                  {prefs.translated && opening.rendering ? (
                    <p className="rd-bism-tr" lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
                      {opening.rendering}
                    </p>
                  ) : null}
                </>
              ) : null}
            </header>

            {flow ? (
              /* At a stretch: the du'a as one passage, the way it is
                 recited, the rubrics still set apart. A line pressed is
                 presented from there. */
              <>
                <article className="rd-mushaf rd-rise" aria-label={dua.title}>
                  <div className="rd-mushaf-frame">
                    <header className="rd-mushaf-head">
                      <span>{dua.title}</span>
                      <span>{category}</span>
                    </header>
                    <p className="rd-mushaf-text" lang="ar" dir="rtl">
                      {dua.lines.map((entry, index) => {
                        const line = bySource.get(index);
                        if (!line || line.number === null) return null;
                        return (
                          <span
                            key={index}
                            id={`line-${line.number}`}
                            className="rd-ayah"
                            role="button"
                            tabIndex={0}
                            aria-label={`${tr('presentHere')} · ${tr('lineTitle', { n: d(line.number) })}`}
                            data-active={highlight === line.number || undefined}
                            onClick={() => present(line.step)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                present(line.step);
                              }
                            }}
                          >
                            {line.arabic}
                            <span className="rd-mark" aria-hidden="true">
                              {' ۝'}
                              {arabicIndic(line.number)}
                            </span>{' '}
                          </span>
                        );
                      })}
                    </p>
                    <footer className="rd-mushaf-foot">
                      <span className="rd-folio tabular">{d(counted)}</span>
                    </footer>
                  </div>
                </article>
                {prefs.translated ? (
                  <section className="rd-mushaf-tr rd-rise" lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
                    <h2 className="rd-kicker">{t('showTranslation')}</h2>
                    <p>
                      {dua.lines.map((entry, index) => {
                        if (!entry[column]) return null;
                        const number = bySource.get(index)?.number ?? null;
                        return (
                          <span key={index}>
                            {number === null ? null : <sup className="tabular">{d(number)}</sup>}
                            {entry[column]}{' '}
                          </span>
                        );
                      })}
                    </p>
                  </section>
                ) : null}
              </>
            ) : (
              <ol className="rd-lines">
                {dua.lines.map((entry, index) => {
                  const rendering = entry[column] ?? '';
                  if (entry[0] === null) {
                    return (
                      <li key={index} className="rd-rubric rd-rise">
                        {rendering}
                      </li>
                    );
                  }
                  const line = bySource.get(index)!;
                  if (line.number === null) return null;
                  const active = highlight === line.number;
                  const marked = bm.has(dua.slug, line.number);
                  return (
                    <li
                      key={index}
                      id={`line-${line.number}`}
                      className="rd-verse rd-rise"
                      style={{ ['--i' as string]: Math.min(line.step, 8) }}
                      aria-label={tr('lineTitle', { n: d(line.number) })}
                      aria-current={active || undefined}
                      data-active={active || undefined}
                    >
                      <div className="rd-verse-top">
                        <Medallion label={d(line.number)} active={active} />
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
                            aria-pressed={marked}
                            onClick={() => toggleMark(line.number)}
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
                            onClick={() => void copyLine(line.step)}
                            aria-label={tr('copyLine')}
                          >
                            <Copy size={18} weight="duotone" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="rd-ghost"
                            onClick={() => void shareLine(line.step)}
                            aria-label={tr('shareLink')}
                          >
                            <LinkSimple size={18} weight="duotone" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="rd-ghost"
                            onClick={() => present(line.step)}
                            aria-label={tr('presentHere')}
                          >
                            <ProjectorScreen size={18} weight="duotone" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="rd-ghost rd-more rd-mob"
                          onClick={() => setLineMenu(line.step)}
                          aria-label={tr('lineMenu', { n: d(line.number) })}
                          aria-haspopup="dialog"
                        >
                          <DotsThree size={24} weight="bold" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="rd-ar" lang="ar" dir="rtl">
                        {line.arabic}
                      </p>
                      {prefs.translated && rendering ? (
                        <p className="rd-tr" lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
                          {rendering}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}

            {/* ── When, from where ───────────────────────────────────── */}
            <dl className="rd-facts">
              <div>
                <dt>{t('whenToRead')}</dt>
                <dd>{dua.whenToRead}</dd>
              </div>
              <div>
                <dt>{t('source')}</dt>
                <dd>{dua.source}</dd>
              </div>
              <div>
                <dt>{t('textSource')}</dt>
                <dd>{t(`textOrigin.${dua.origin}`)}</dd>
              </div>
            </dl>
          </div>

          {/* ── The du'as either side ─────────────────────────────────── */}
          <nav className="rd-pagenav" aria-label={tr('dock')}>
            <button
              type="button"
              className="rd-pill rd-pill-outline"
              onClick={backward}
              disabled={!previous}
              aria-label={previous ? `${t('previousDua')}: ${previous.title}` : t('previousDua')}
            >
              <PrevIcon size={16} weight="bold" aria-hidden="true" />
              <span className="rd-pagenav-word">{previous?.title ?? t('previousDua')}</span>
            </button>
            <span className="rd-pagenav-at tabular">
              {tr('ofCount', { n: d(at + 1), of: d(catalogue.length) })}
            </span>
            <button
              type="button"
              className="rd-pill"
              onClick={forward}
              disabled={!next}
              aria-label={next ? `${t('nextDua')}: ${next.title}` : t('nextDua')}
            >
              <span className="rd-pagenav-word">{next?.title ?? t('nextDua')}</span>
              <NextIcon size={16} weight="bold" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>

      {/* ── The dock, on a phone: the du'as either side ────────────────── */}
      <Portal>
        <div className="rd-dock-wrap rd-mob" data-side={sideOpen ? 'open' : 'closed'}>
          <div className="rd-dock rd-dock-navonly" dir={rtl ? 'rtl' : 'ltr'} lang={locale}>
            <nav className="rd-dock-nav" aria-label={tr('dock')}>
              <button type="button" className="rd-dock-word" onClick={() => setPickerOpen(true)}>
                <ListBullets size={20} weight="duotone" aria-hidden="true" />
                <span>{tr('contents')}</span>
              </button>
              <button
                type="button"
                className="rd-round rd-round-lg"
                onClick={backward}
                disabled={!previous}
                aria-label={t('previousDua')}
              >
                <PrevIcon size={20} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" className="rd-dock-centre" onClick={() => setPickerOpen(true)}>
                <span className="rd-dock-centre-top">{category}</span>
                <span className="rd-dock-centre-sub tabular">
                  {tr('ofCount', { n: d(at + 1), of: d(catalogue.length) })}
                </span>
              </button>
              <button
                type="button"
                className="rd-round rd-round-lg"
                onClick={forward}
                disabled={!next}
                aria-label={t('nextDua')}
              >
                <NextIcon size={20} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" className="rd-dock-word" onClick={() => setSettingsOpen(true)}>
                <SlidersHorizontal size={20} weight="duotone" aria-hidden="true" />
                <span>{tr('viewSelect')}</span>
              </button>
            </nav>
          </div>
        </div>
      </Portal>

      {!desktop ? (
        <>
          <Sheet
            open={pickerOpen}
            onClose={closePicker}
            title={tr('contents')}
            closeLabel={tr('close')}
            className="rd-sheet-tall"
          >
            <DuaPicker {...pickerProps} variant="sheet" />
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
        open={menuLine !== undefined}
        onClose={closeLineMenu}
        title={menuLine?.number ? reference(menuLine.number) : dua.title}
        closeLabel={tr('close')}
      >
        {menuLine ? (
          <div className="rd-menu">
            <p className="rd-menu-preview" lang="ar" dir="rtl">
              {menuLine.arabic}
            </p>
            {menuLine.number !== null ? (
              <button
                type="button"
                className="rd-row rd-row-action"
                onClick={() => {
                  toggleMark(menuLine.number);
                  closeLineMenu();
                }}
              >
                <span className="rd-row-icon">
                  <BookmarkSimple
                    size={20}
                    weight={bm.has(dua.slug, menuLine.number) ? 'fill' : 'duotone'}
                    aria-hidden="true"
                  />
                </span>
                <span className="rd-row-label">
                  {bm.has(dua.slug, menuLine.number) ? tr('bookmarkRemove') : tr('bookmarkAdd')}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="rd-row rd-row-action"
              onClick={() => {
                void copyLine(lineMenu!);
                closeLineMenu();
              }}
            >
              <span className="rd-row-icon">
                <Copy size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="rd-row-label">{tr('copyLine')}</span>
            </button>
            <button
              type="button"
              className="rd-row rd-row-action"
              onClick={() => {
                void shareLine(lineMenu!);
                closeLineMenu();
              }}
            >
              <span className="rd-row-icon">
                <LinkSimple size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="rd-row-label">{tr('shareLink')}</span>
            </button>
            <button
              type="button"
              className="rd-row rd-row-action"
              onClick={() => present(lineMenu!)}
            >
              <span className="rd-row-icon">
                <ProjectorScreen size={20} weight="duotone" aria-hidden="true" />
              </span>
              <span className="rd-row-label">{tr('presentHere')}</span>
            </button>
          </div>
        ) : null}
      </Sheet>

      {here ? (
        <Present
          locale={locale}
          arabicName={dua.arabicTitle}
          title={
            here.number === null
              ? `${dua.title} · ${tr('opening')}`
              : `${dua.title} · ${tr('lineOf', { n: d(here.number), of: d(counted) })}`
          }
          progress={counted ? (here.number ?? 0) / counted : 0}
          counter={`${d(here.number ?? 0)} / ${d(counted)}`}
          arabic={
            <>
              {here.arabic}
              {here.number ? (
                <span className="rd-mark">
                  {' ۝'}
                  {arabicIndic(here.number)}
                </span>
              ) : null}
            </>
          }
          length={here.arabic.length}
          translation={here.rendering || null}
          translated={prefs.translated}
          stepKey={`${dua.slug}:${presentAt}`}
          labels={{
            dialog: tr('presentation'),
            close: tr('exitPresentation'),
            translation: tr('translationToggle'),
            next: tr('nextLine'),
            previous: tr('previousLine'),
          }}
          onStep={stepPresent}
          onClose={closePresent}
          onToggleTranslated={toggleTranslated}
        />
      ) : null}

      {toastNode}
    </div>
  );
}

/* ─── The shelf: every du'a, by kind, searchable ───────────────────────── */

function DuaPicker({
  locale,
  variant,
  catalogue,
  current,
  marks,
  onPick,
}: {
  locale: Locale;
  variant: 'side' | 'sheet';
  catalogue: readonly DuaStub[];
  current: string;
  marks: Record<string, DuaBookmark>;
  onPick: (slug: string, line?: number | null) => void;
}) {
  const t = useTranslations('duas');
  const tr = useTranslations('reader');
  const d = (value: number) => digits(value, locale);
  const [tab, setTab] = useState<'duas' | 'bookmarks'>('duas');
  const [kind, setKind] = useState<DuaCategory | 'all'>('all');
  // Newest first; one whose du'a is no longer listed is left out.
  const bySlug = useMemo(() => new Map(catalogue.map((entry) => [entry.slug, entry])), [catalogue]);
  const saved = Object.values(marks)
    .filter((mark) => bySlug.has(mark.slug))
    .sort((a, b) => b.en - a.en);
  const [query, setQuery] = useState('');
  const kinds = (['dua', 'ziyara', 'taqib'] as const).filter((k) =>
    catalogue.some((entry) => entry.category === k),
  );

  const shown = useMemo(() => {
    const q = fold(query);
    return catalogue
      .map((entry, index) => ({ entry, index }))
      .filter(
        ({ entry }) =>
          (kind === 'all' || entry.category === kind) &&
          (!q || fold(entry.title).includes(q) || fold(entry.arabicTitle).includes(q)),
      );
  }, [catalogue, kind, query]);

  return (
    <div className="rd-picker" data-variant={variant}>
      <Seg
        label={tr('contents')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'duas', label: t('tabDuas') },
          {
            value: 'bookmarks',
            label: (
              <>
                {tr('bookmarks')}
                {saved.length ? (
                  <span className="rd-count tabular"> · {d(saved.length)}</span>
                ) : null}
              </>
            ),
          },
        ]}
      />
      {tab === 'bookmarks' ? (
        saved.length === 0 ? (
          <p className="rd-empty">{t('bookmarksEmpty')}</p>
        ) : (
          <ul className="rd-list">
            {saved.map((mark) => {
              const entry = bySlug.get(mark.slug)!;
              return (
                <li key={markKey(mark.slug, mark.n)}>
                  <button
                    type="button"
                    className="rd-surah-row"
                    onClick={() => onPick(mark.slug, mark.n)}
                  >
                    <span className="rd-chip-n">
                      <BookmarkSimple size={16} weight="fill" aria-hidden="true" />
                    </span>
                    <span className="rd-surah-row-text">
                      <span className="rd-surah-row-name">{entry.title}</span>
                      <span className="rd-surah-row-meta">
                        {mark.n === null ? t('wholeDua') : tr('lineTitle', { n: d(mark.n) })}
                        {' · '}
                        {t(`category.${entry.category}`)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <>
          {kinds.length > 1 ? (
            <Seg
              label={t('filterByCategory')}
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: tr('all') },
                ...kinds.map((k) => ({ value: k, label: t(`category.${k}`) })),
              ]}
            />
          ) : null}
          <label className="rd-search">
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className="visually-hidden">{tr('search')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tr('search')}
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          {shown.length === 0 ? <p className="rd-empty">{tr('noMatch')}</p> : null}
          <ul className="rd-list">
            {shown.map(({ entry, index }) => (
              <li key={entry.slug}>
                <button
                  type="button"
                  className="rd-surah-row"
                  aria-current={entry.slug === current || undefined}
                  onClick={() => onPick(entry.slug)}
                >
                  <span className="rd-chip-n tabular">{digits(index + 1, locale)}</span>
                  <span className="rd-surah-row-text">
                    <span className="rd-surah-row-name">{entry.title}</span>
                    <span className="rd-surah-row-meta">{t(`category.${entry.category}`)}</span>
                  </span>
                  {/* In Persian the title already reads much as the Arabic does. */}
                  {locale === 'fa' ? null : (
                    <span className="rd-surah-row-ar" lang="ar" dir="rtl">
                      {entry.arabicTitle}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
