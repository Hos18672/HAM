'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_COOKIE, type ThemeValue } from './theme';

/**
 * What the reader has chosen, and remembers.
 *
 * All of it is a convenience, none of it is required to read: the page is
 * complete and legible before any of this loads, and every write is wrapped
 * because a browser in private mode throws on `localStorage`.
 *
 * Kept outside the component as well as in storage, so the choices survive a
 * remount within the visit even where storage is refused.
 */

export type QuranView = 'verse' | 'mushaf';

export const MIN_SCALE = 0.7;
export const MAX_SCALE = 1.8;
const STEP = 0.1;

const KEY = {
  page: 'ham-quran-page',
  view: 'ham-quran-view',
  translation: 'ham-quran-tr',
  silent: 'ham-quran-silent',
  scale: 'ham-quran-scale',
} as const;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

/** The page the reader was last on, for the Quran index to offer. */
export function rememberPage(n: number) {
  write(KEY.page, String(n));
}

export interface QuranSettings {
  view: QuranView;
  setView: (view: QuranView) => void;
  translated: boolean;
  toggleTranslated: () => void;
  silent: boolean;
  toggleSilent: () => void;
  scale: number;
  larger: () => void;
  smaller: () => void;
  canEnlarge: boolean;
  canReduce: boolean;
  night: boolean;
  toggleNight: () => void;
  /** False until the stored choices have been read, to avoid a flash. */
  ready: boolean;
}

export function useQuranSettings(): QuranSettings {
  const [view, setViewState] = useState<QuranView>('verse');
  const [translated, setTranslated] = useState(true);
  const [silent, setSilent] = useState(true);
  const [scale, setScale] = useState(1);
  const [night, setNight] = useState(false);
  const [ready, setReady] = useState(false);

  // Read once, after hydration: the server cannot know any of this, and
  // rendering it differently on the first pass is a hydration mismatch.
  useEffect(() => {
    const stored = read(KEY.view);
    if (stored === 'verse' || stored === 'mushaf') setViewState(stored);
    if (read(KEY.translation) === 'off') setTranslated(false);
    if (read(KEY.silent) === 'off') setSilent(false);
    const size = Number(read(KEY.scale));
    if (size >= MIN_SCALE && size <= MAX_SCALE) setScale(size);
    setNight(document.documentElement.dataset.theme === 'dark');
    setReady(true);
  }, []);

  const setView = useCallback((next: QuranView) => {
    setViewState(next);
    write(KEY.view, next);
  }, []);

  const toggleTranslated = useCallback(() => {
    setTranslated((on) => {
      write(KEY.translation, on ? 'off' : 'on');
      return !on;
    });
  }, []);

  const toggleSilent = useCallback(() => {
    setSilent((on) => {
      write(KEY.silent, on ? 'off' : 'on');
      return !on;
    });
  }, []);

  const change = useCallback((by: number) => {
    setScale((current) => {
      // Rounded to the step: repeated floating-point addition otherwise
      // leaves 1.0999999999999999 in storage and on the button's label.
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((current + by) * 10) / 10));
      write(KEY.scale, String(next));
      return next;
    });
  }, []);

  /**
   * Night is the site's own theme, not a second one.
   *
   * The design reference carries its own night palette because it is a page
   * on its own; here the site already has a dark theme, a switch for it in
   * the header and a cookie that every server render reads. A reader who
   * turns the lights down on the Quran page means the lights, not the Quran
   * page — so this drives the same switch.
   */
  const toggleNight = useCallback(() => {
    setNight((dark) => {
      const next: ThemeValue = dark ? 'light' : 'dark';
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.dataset.theme = next;
      return !dark;
    });
  }, []);

  return {
    view,
    setView,
    translated,
    toggleTranslated,
    silent,
    toggleSilent,
    scale,
    larger: () => change(STEP),
    smaller: () => change(-STEP),
    canEnlarge: scale < MAX_SCALE,
    canReduce: scale > MIN_SCALE,
    night,
    toggleNight,
    ready,
  };
}
