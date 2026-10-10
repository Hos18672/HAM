'use client';

import { useEffect } from 'react';
import { THEME_COOKIE } from './theme';

/**
 * Keeps `<html data-theme>` on the reader's theme across navigations.
 *
 * The server renders the attribute from the cookie, and the head script
 * corrects it before the first paint — from the cookie on the static preview,
 * and from the phone's own setting when nobody has chosen. But the root
 * layout's props can be applied again later (a prefetched or refetched page
 * brings the layout with it), and React then writes back whatever the server
 * or the build had: a phone in dark mode turned light on the next page.
 *
 * So the wanted theme is worked out here the same way the head script does
 * it, and put back whenever the attribute changes to something else.
 */
export function ThemeKeeper() {
  useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia('(max-width: 1023.98px)');
    const system = window.matchMedia('(prefers-color-scheme: dark)');

    const wanted = (): 'dark' | 'light' | null => {
      const chosen = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(dark|light)`));
      if (chosen) return chosen[1] as 'dark' | 'light';
      if (phone.matches) return system.matches ? 'dark' : 'light';
      return null;
    };
    const keep = () => {
      const theme = wanted();
      if (theme && root.dataset.theme !== theme) root.dataset.theme = theme;
    };

    keep();
    const watch = new MutationObserver(keep);
    watch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    system.addEventListener('change', keep);
    return () => {
      watch.disconnect();
      system.removeEventListener('change', keep);
    };
  }, []);
  return null;
}
