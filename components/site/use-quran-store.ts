'use client';

import { useCallback, useEffect, useState } from 'react';
import { readJson, useStored, writeJson } from './rd/storage';
import { RECITERS, SPEEDS, type Reciter } from './use-quran-audio';
import { THEME_COOKIE, type ThemeValue } from './theme';

/**
 * What the Quran reader remembers, all of it in this browser only:
 *
 *   ham:quran:prefs  the view, the size, the translation, the silent
 *                    letters, the reciter and the speed
 *   ham:quran:bm     bookmarks, keyed by the verse's number in the Quran
 *   ham:quran:last   the page and verse to continue from
 */

export type QuranView = 'verse' | 'mushaf';

export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.5;

export interface QuranPrefs {
  view: QuranView;
  scale: number;
  translated: boolean;
  silent: boolean;
  reciter: Reciter;
  speed: number;
}

const DEFAULTS: QuranPrefs = {
  view: 'verse',
  scale: 1,
  translated: true,
  silent: true,
  reciter: 'alafasy',
  speed: 1,
};

export interface Bookmark {
  /** Surah, verse in it, the page it is on, and when it was set. */
  s: number;
  n: number;
  page: number;
  en: number;
}

export interface LastRead {
  page: number;
  s: number;
  n: number;
}

export const LAST_KEY = 'ham:quran:last';
const BM_KEY = 'ham:quran:bm';

export function rememberLast(last: LastRead) {
  writeJson(LAST_KEY, last);
}

export function readLast(): LastRead | null {
  const last = readJson<LastRead>(LAST_KEY);
  return last && Number.isInteger(last.page) && last.page >= 1 && last.page <= 604 ? last : null;
}

export function useQuranStore() {
  const [stored, update, ready] = useStored<QuranPrefs>('ham:quran:prefs', DEFAULTS);
  // Whatever was stored, only what the reader can show.
  const prefs: QuranPrefs = {
    view: stored.view === 'mushaf' ? 'mushaf' : 'verse',
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(stored.scale) || 1)),
    translated: stored.translated !== false,
    silent: stored.silent !== false,
    reciter: RECITERS.includes(stored.reciter) ? stored.reciter : 'alafasy',
    speed: (SPEEDS as readonly number[]).includes(stored.speed) ? stored.speed : 1,
  };

  const sized = useCallback(
    (by: number) =>
      update((was) => ({
        // Rounded to the step: repeated addition leaves 1.0999999999999999.
        scale: Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, Math.round(((was.scale || 1) + by) * 10) / 10),
        ),
      })),
    [update],
  );

  const cycleSpeed = useCallback(
    () =>
      update((was) => {
        const at = (SPEEDS as readonly number[]).indexOf(was.speed);
        return { speed: SPEEDS[(at + 1) % SPEEDS.length] };
      }),
    [update],
  );

  /* ── Bookmarks ───────────────────────────────────────────────────────── */
  const [bookmarks, setBookmarks] = useState<Record<number, Bookmark>>({});
  useEffect(() => {
    const read = readJson<Record<number, Bookmark>>(BM_KEY);
    if (read && typeof read === 'object') setBookmarks(read);
  }, []);
  /** Adds or takes away; says which it did. */
  const toggleBookmark = useCallback(
    (global: number, mark: Omit<Bookmark, 'en'>) => {
      const added = !bookmarks[global];
      const next = { ...bookmarks };
      if (added) next[global] = { ...mark, en: Date.now() };
      else delete next[global];
      writeJson(BM_KEY, next);
      setBookmarks(next);
      return added;
    },
    [bookmarks],
  );

  /* ── Night ───────────────────────────────────────────────────────────────
     The site's own theme rather than a second one: it follows the system
     until somebody picks, and the pick is the same cookie the header's
     switch writes, so the whole site turns with it. */
  const [night, setNight] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setNight(root.dataset.theme === 'dark');
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => watch.disconnect();
  }, []);
  const setScheme = useCallback((dark: boolean) => {
    const next: ThemeValue = dark ? 'dark' : 'light';
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.theme = next;
    setNight(dark);
  }, []);

  return {
    prefs,
    ready,
    setView: (view: QuranView) => update({ view }),
    toggleTranslated: () => update((was) => ({ translated: was.translated === false })),
    toggleSilent: () => update((was) => ({ silent: was.silent === false })),
    larger: () => sized(0.1),
    smaller: () => sized(-0.1),
    setReciter: (reciter: Reciter) => update({ reciter }),
    cycleSpeed,
    bookmarks,
    toggleBookmark,
    night,
    setScheme,
  };
}
