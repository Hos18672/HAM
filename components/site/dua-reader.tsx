'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  BookOpen,
  CaretLeft,
  CaretRight,
  CornersIn,
  CornersOut,
  ListNumbers,
  Minus,
  Plus,
  Presentation,
  SlidersHorizontal,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { arabicIndic, digits } from '@/lib/i18n/format';
import type { DuaCategory, DuaPayload, DuaStub } from '@/lib/dua-texts';
import type { Locale } from '@/lib/i18n/config';
import { PatternPlate, Ring, Rosette } from './ornaments';
import { useReader } from './use-reader';
import { DuaPresent } from './dua-present';
import { Fixed } from './reader-fixed';

/**
 * A du'a read the way the Quran is read on this site: the same sheet, the
 * same bar, the same full screen and the same presentation overlay.
 *
 * It owns the whole du'a — the heading band, the words and the facts under
 * them — because turning to the next one replaces all three at once. Like
 * the mushaf, it fetches the next text and writes the address itself rather
 * than navigating: `router.push` is a route change, and a route change
 * throws away the reader's place, its size and its full screen, and plays
 * the page's reveal again from the top.
 */

/**
 * Whether a line is the Basmala, whatever marks it carries: the du'as spell
 * it with a superscript alef where the Quran spells it with a dagger one,
 * and either way it opens the text rather than being the first thing said
 * in it. Compared with the marks stripped, as the mushaf does it.
 */
const bare = (text: string) =>
  text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // The texts are not all spelled with the same letterforms: Du'a Faraj
    // writes the Basmala with the Persian yeh where Du'a Kumail writes the
    // Arabic one, and either is the same word. Keheh and kaf likewise.
    .replace(/\u0671/g, '\u0627')
    .replace(/[\u06CC\u0649]/g, '\u064A')
    .replace(/\u06A9/g, '\u0643')
    .replace(/\s+/g, ' ')
    .trim();
const BASMALA_BARE = bare('بسم الله الرحمن الرحيم');
const isBasmala = (text: string) => bare(text).startsWith(BASMALA_BARE);

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
  const tReader = useTranslations('reader');

  const [dua, setDua] = useState(initial);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    loaded.set(`${locale}:${initial.slug}`, initial);
    setDua(initial);
  }, [initial, locale]);

  const at = catalogue.findIndex((entry) => entry.slug === dua.slug);
  const previous = at > 0 ? catalogue[at - 1] : undefined;
  const next = at >= 0 && at < catalogue.length - 1 ? catalogue[at + 1] : undefined;

  /* ── Presentation, and where in the du'a it is ──────────────────────── */
  const [presenting, setPresenting] = useState(false);
  const [line, setLine] = useState(0);

  /** Only the spoken lines: a rubric is an instruction, not words to say. */
  const spoken = useMemo(() => {
    const out: { arabic: string; rendering: string; number: number | null; at: number }[] = [];
    let n = 0;
    dua.lines.forEach((line, at) => {
      const arabic = line[0];
      if (arabic === null) return;
      // The Basmala opens the du'a and is not one of its lines. Counting
      // it made the first line of the prayer the second.
      const opening = out.length === 0 && isBasmala(arabic);
      out.push({
        arabic,
        rendering: line[locale === 'fa' ? 1 : 2] ?? '',
        number: opening ? null : ++n,
        at,
      });
    });
    return out;
  }, [dua.lines, locale]);
  /** How many numbered lines there are — the Basmala is not one of them. */
  const counted = spoken.reduce((most, l) => Math.max(most, l.number ?? 0), 0);
  /** Each spoken line by where it sits in the text, with its step number. */
  const bySource = useMemo(
    () => new Map(spoken.map((line, step) => [line.at, { ...line, step }])),
    [spoken],
  );

  /* ── Turning, without telling the router ────────────────────────────── */
  const turn = useCallback(
    async (slug: string | undefined) => {
      if (!slug || slug === dua.slug) return;
      try {
        const data = await fetchDua(slug, locale);
        setDua(data);
        setLine(0);
        setFailed(false);
        // Through `History.prototype` on purpose: Next replaces
        // `history.replaceState` with a version that tells its router the
        // path has changed, and the router then rebuilds the whole route.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          '',
          `${BASE_PATH}${basePath}/${slug}`,
        );
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

  const reader = useReader({
    storageKey: 'dua',
    // Carried rightwards is onwards, as in the mushaf: bound on the right,
    // the leaf you have finished goes over the spine.
    onNext: next ? () => void turn(next.slug) : undefined,
    onPrevious: previous ? () => void turn(previous.slug) : undefined,
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
  const toggleTranslated = useCallback(() => {
    setTranslated((on) => {
      try {
        localStorage.setItem('dua-translated', on ? 'off' : 'on');
      } catch {
        /* storage unavailable */
      }
      return !on;
    });
  }, []);

  /* ── The picker, and the filter above it ────────────────────────────── */
  const [filter, setFilter] = useState<DuaCategory | 'all'>('all');
  const shown = useMemo(
    () => catalogue.filter((entry) => filter === 'all' || entry.category === filter),
    [catalogue, filter],
  );
  // A filter that would hide the open du'a is a filter that cannot be used
  // to leave it: it stays in the list, at the end.
  const options = useMemo(
    () =>
      shown.some((entry) => entry.slug === dua.slug)
        ? shown
        : [...shown, catalogue[at]].filter((entry): entry is DuaStub => Boolean(entry)),
    [shown, catalogue, at, dua.slug],
  );

  /**
   * Line by line, or the whole du'a at a stretch — the same choice the
   * mushaf offers between its two views. One is for learning a text, the
   * other for reciting it, and which a reader wants does not change from
   * one du'a to the next, so it is remembered.
   */
  const [flow, setFlow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('dua-view') === 'flow') setFlow(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setView = useCallback((on: boolean) => {
    setFlow(on);
    try {
      localStorage.setItem('dua-view', on ? 'flow' : 'lines');
    } catch {
      /* storage unavailable */
    }
  }, []);

  /** The controls that fold away on a narrow screen. */
  const [open, setOpen] = useState(false);

  const present = useCallback((from = 0) => {
    setLine(from);
    setPresenting(true);
    setOpen(false);
  }, []);
  const step = useCallback(
    (by: 1 | -1) => setLine((n) => Math.min(spoken.length - 1, Math.max(0, n + by))),
    [spoken.length],
  );

  /* ── The whole screen, the way the Quran does it ────────────────────── */
  useEffect(() => {
    const root = document.documentElement;
    if (reader.full || presenting) root.dataset.readerFull = 'true';
    else delete root.dataset.readerFull;
    return () => {
      delete root.dataset.readerFull;
    };
  }, [reader.full, presenting]);

  /* ── Keys ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (el?.closest('input, select, textarea, [contenteditable]') && event.key !== 'Escape')
        return;

      if (presenting) {
        if (['ArrowLeft', ' ', 'PageDown', 'Enter', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          step(1);
        } else if (['ArrowRight', 'PageUp', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'Escape') setPresenting(false);
        else if (event.key.toLowerCase() === 't') toggleTranslated();
        return;
      }

      if (event.key === 'ArrowLeft') void turn(next?.slug);
      else if (event.key === 'ArrowRight') void turn(previous?.slug);
      else if (event.key.toLowerCase() === 'f') reader.toggleFull();
      else if (event.key.toLowerCase() === 'p') present(0);
      else if (event.key.toLowerCase() === 't') toggleTranslated();
      else if (event.key === 'Escape' && reader.full) reader.toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, step, toggleTranslated, turn, next, previous, reader, present]);

  const opensWithBasmala = spoken[0]?.number === null;

  const here = spoken[Math.min(line, spoken.length - 1)];
  const column = locale === 'fa' ? 1 : 2;

  return (
    <div
      ref={reader.shellRef}
      className="qr dua-reader"
      data-full={reader.full || undefined}
      // Two names for one number: `--qr-scale` is what the shared chrome
      // reads, `--reader-scale` what the du'a's own lines have always read.
      style={
        {
          ['--qr-scale' as string]: reader.scale,
          ['--reader-scale' as string]: reader.scale,
          ['--qr-ar' as string]: `calc(${reader.scale} * clamp(1.3rem, 3.6vw, 1.95rem))`,
        } as React.CSSProperties
      }
    >
      {/* ── Which du'a this is ───────────────────────────────────────── */}
      <header className="section-band page-head-band" data-rise>
        <PatternPlate tiling="shesh" drift opacity={0.7} />
        <Ring />
        <div className="page" style={{ position: 'relative' }}>
          <div style={{ maxInlineSize: '32em' }}>
            <Link href={basePath} className="dua-back">
              <ArrowLeft size={15} weight="bold" aria-hidden="true" className="mirror" />
              {t('allDuas')}
            </Link>
            <p className="kicker dua-kicker">{t(`category.${dua.category}`)}</p>
            <h1 className="dua-title">{dua.title}</h1>
            <p lang="ar" dir="rtl" className="dua-head-ar">
              {dua.arabicTitle}
            </p>
            <p className="dua-lede">{dua.summary}</p>
          </div>
        </div>
      </header>

      <div className="dua-body">
        {/* ── Every choice there is ──────────────────────────────────── */}
        <div className="qr-bar">
          <div className="qr-compact">
            <button
              type="button"
              className="qr-chip"
              aria-expanded={open}
              aria-controls="dua-controls"
              onClick={() => setOpen((on) => !on)}
              aria-label={tReader('settings')}
            >
              <SlidersHorizontal size={18} weight="duotone" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="qr-chip"
              aria-pressed={reader.full}
              onClick={reader.toggleFull}
              aria-label={reader.full ? tReader('exitFullscreen') : tReader('fullscreen')}
            >
              {reader.full ? (
                <CornersIn size={18} weight="duotone" aria-hidden="true" />
              ) : (
                <CornersOut size={18} weight="duotone" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="qr-chip qr-present"
              onClick={() => present(0)}
              aria-label={tReader('presentation')}
            >
              <Presentation size={18} weight="duotone" aria-hidden="true" />
            </button>
          </div>

          <div className="qr-controls" id="dua-controls" data-open={open || undefined}>
            {/* Which du'a, and which kind — the mushaf's surah and juz
                pickers, for a shelf of texts rather than a book. */}
            <label className="qr-select">
              <span className="visually-hidden">{t('allDuas')}</span>
              <select value={dua.slug} onChange={(event) => void turn(event.target.value)}>
                {options.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="qr-select qr-select-narrow">
              <span className="visually-hidden">{t('filterByCategory')}</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as DuaCategory | 'all')}
              >
                <option value="all">{tReader('allKinds')}</option>
                <option value="dua">{t('category.dua')}</option>
                <option value="ziyara">{t('category.ziyara')}</option>
                <option value="taqib">{t('category.taqib')}</option>
              </select>
            </label>

            <div className="qr-seg" role="group" aria-label={tReader('viewSelect')}>
              <button type="button" aria-pressed={!flow} onClick={() => setView(false)}>
                <ListNumbers size={17} weight="duotone" aria-hidden="true" />
                {tReader('viewLines')}
              </button>
              <button type="button" aria-pressed={flow} onClick={() => setView(true)}>
                <BookOpen size={17} weight="duotone" aria-hidden="true" />
                {tReader('viewFlow')}
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={translated}
              className="qr-chip qr-chip-wide"
              onClick={toggleTranslated}
            >
              <Translate size={17} weight="duotone" aria-hidden="true" />
              <span className="qr-chip-word">{t('showTranslation')}</span>
            </button>

            <div className="qr-size" role="group" aria-label={tReader('textSize')}>
              <button
                type="button"
                onClick={reader.smaller}
                disabled={!reader.canReduce}
                aria-label={tReader('smaller')}
              >
                <Minus size={13} weight="bold" aria-hidden="true" />
              </button>
              <span className="tabular" aria-hidden="true">
                {digits(Math.round(reader.scale * 100), locale)}%
              </span>
              <button
                type="button"
                onClick={reader.larger}
                disabled={!reader.canEnlarge}
                aria-label={tReader('larger')}
              >
                <Plus size={13} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <div className="qr-screen">
              <button
                type="button"
                className="qr-chip qr-chip-wide"
                aria-pressed={reader.full}
                onClick={reader.toggleFull}
              >
                {reader.full ? (
                  <CornersIn size={17} weight="duotone" aria-hidden="true" />
                ) : (
                  <CornersOut size={17} weight="duotone" aria-hidden="true" />
                )}
                {reader.full ? tReader('exitFullscreen') : tReader('fullscreen')}
              </button>
              <button
                type="button"
                className="qr-chip qr-present qr-chip-wide"
                onClick={() => present(0)}
              >
                <Presentation size={17} weight="duotone" aria-hidden="true" />
                {tReader('presentation')}
              </button>
            </div>
          </div>
        </div>

        {/* ── The sheet ────────────────────────────────────────────────── */}
        <div className="qr-main" {...reader.swipe}>
          {failed ? <p className="qr-failed">{tReader('unavailable')}</p> : null}
          <article className="mushaf qr-paper dua-sheet" aria-label={dua.title}>
            <Rosette className="mushaf-corner" />
            <Rosette className="mushaf-corner" />
            <Rosette className="mushaf-corner" />
            <Rosette className="mushaf-corner" />

            <header className="mushaf-head qr-head-band">
              <h2 className="qr-banner mushaf-banner" lang="ar" dir="rtl">
                <Rosette className="mushaf-banner-star" />
                <span>{dua.arabicTitle}</span>
                <Rosette className="mushaf-banner-star" />
              </h2>
            </header>

            {flow ? (
              /* At a stretch: the whole du'a as one passage, the way it is
                 recited, with the rubrics still set apart because they are
                 instructions and not words to say. Clicking anywhere in it
                 presents from that line. */
              <div className="dua-flow" data-translated={translated ? 'on' : 'off'}>
                {opensWithBasmala ? (
                  <p className="dua-ar dua-flow-bism" lang="ar" dir="rtl">
                    {spoken[0]!.arabic}
                  </p>
                ) : null}
                <p className="dua-ar dua-flow-ar" lang="ar" dir="rtl">
                  {dua.lines.map((entry, index) => {
                    const line = bySource.get(index);
                    if (!line || line.number === null) return null;
                    return (
                      <span
                        key={index}
                        className="qr-sheet-ayah"
                        role="button"
                        tabIndex={0}
                        onClick={() => present(line.step)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            present(line.step);
                          }
                        }}
                      >
                        {line.arabic}
                        <span className="qr-mark" aria-hidden="true">
                          {'\u06DD'}
                          {arabicIndic(line.number)}
                        </span>{' '}
                      </span>
                    );
                  })}
                </p>
                {translated ? (
                  <div className="qr-mushaf-tr">
                    <p className="qr-mushaf-tr-head">{t('showTranslation')}</p>
                    <p>
                      {dua.lines.map((entry, index) => {
                        if (!entry[column]) return null;
                        const number = bySource.get(index)?.number ?? null;
                        return (
                          <span key={index}>
                            {number === null ? null : <sup>{digits(number, locale)}</sup>}
                            {entry[column]}{' '}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <ol className="dua-lines" data-translated={translated ? 'on' : 'off'}>
                {dua.lines.map((entry, index) => {
                  const [arabic] = entry;
                  const rendering = entry[column] ?? '';
                  if (arabic === null) {
                    return (
                      <li key={index} className="dua-rubric">
                        {rendering}
                      </li>
                    );
                  }
                  const line = bySource.get(index)!;
                  // The opening, set apart and unnumbered as it is at the
                  // head of a surah.
                  if (line.number === null) {
                    return (
                      <li key={index} className="dua-opening">
                        <p className="dua-ar dua-flow-bism" lang="ar" dir="rtl">
                          {arabic}
                        </p>
                        {rendering ? <p className="dua-tr dua-opening-tr">{rendering}</p> : null}
                      </li>
                    );
                  }
                  return (
                    <li key={index} className="dua-line">
                      <div className="qr-verse-top">
                        <span className="qr-pill">{digits(line.number, locale)}</span>
                        <button
                          type="button"
                          className="qr-from"
                          onClick={() => present(line.step)}
                          aria-label={tReader('presentFrom')}
                          title={tReader('presentFrom')}
                        >
                          <Presentation size={18} weight="duotone" aria-hidden="true" />
                          <span className="qr-from-word">{tReader('presentFrom')}</span>
                        </button>
                      </div>
                      <p className="dua-ar" lang="ar" dir="rtl">
                        {arabic}
                      </p>
                      {rendering ? <p className="dua-tr">{rendering}</p> : null}
                    </li>
                  );
                })}
              </ol>
            )}

            {/* How many lines there are, and what kind of text this is. */}
            <footer className="mushaf-foot">
              <span className="mushaf-folio">{digits(counted, locale)}</span>
              <span className="qr-foot-juz">{t(`category.${dua.category}`)}</span>
            </footer>
          </article>

          <dl className="dua-facts">
            <dt>{t('whenToRead')}</dt>
            <dd>{dua.whenToRead}</dd>
            <dt>{t('source')}</dt>
            <dd>{dua.source}</dd>
            <dt>{t('textSource')}</dt>
            <dd>{t(`textOrigin.${dua.origin}`)}</dd>
          </dl>

          <p className="reader-hint text-xs">{tReader('turnHintDua')}</p>
        </div>
      </div>

      <Fixed scale={reader.scale} silent={false}>
        {/* ── Along the foot: the du'a before and the one after ───────── */}
        <div className="qr-foot">
          <div className="qr-foot-inner" dir="rtl">
            <button
              type="button"
              className="qr-step"
              onClick={() => void turn(previous?.slug)}
              disabled={!previous}
              aria-label={previous ? `${t('previousDua')}: ${previous.title}` : t('previousDua')}
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
              <span className="qr-step-word">{t('previousDua')}</span>
            </button>
            <p className="qr-foot-title">{dua.title}</p>
            <button
              type="button"
              className="qr-step qr-step-next"
              onClick={() => void turn(next?.slug)}
              disabled={!next}
              aria-label={next ? `${t('nextDua')}: ${next.title}` : t('nextDua')}
            >
              <span className="qr-step-word">{t('nextDua')}</span>
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        {presenting && here ? (
          <DuaPresent
            arabic={here.arabic}
            translation={here.rendering || null}
            number={here.number}
            count={counted}
            arabicTitle={dua.arabicTitle}
            locale={locale}
            translated={translated}
            scale={reader.scale}
            onStep={step}
            onClose={() => setPresenting(false)}
            onToggleTranslated={toggleTranslated}
            onLarger={reader.larger}
            onSmaller={reader.smaller}
          />
        ) : null}
      </Fixed>
    </div>
  );
}
