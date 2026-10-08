'use client';

import { useCallback, useEffect, useState } from 'react';
import { THEME_COOKIE, type ThemeValue } from '../theme';

/**
 * Light or night, for the readers — the site's own theme rather than a
 * second one. It follows the system until somebody picks, and the pick is
 * the same cookie the header's switch writes, so the whole site turns with it.
 */
export function useScheme() {
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
  return { night, setScheme };
}
