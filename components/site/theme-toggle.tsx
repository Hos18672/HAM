'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, Moon } from '@phosphor-icons/react/dist/ssr';
import { THEME_COOKIE, type ThemeValue } from './theme';

/** Theme switch. The swap is immediate — no wipe over the page. */
export function ThemeToggle({ theme }: { theme: ThemeValue }) {
  const t = useTranslations('theme');

  // The prop is the server's reading of the cookie, which only changes on the
  // next server render. Toggling has to move a piece of client state as well,
  // or the second click computes the same "next" theme as the first and the
  // switch appears to be stuck.
  const [current, setCurrent] = useState<ThemeValue>(theme);
  useEffect(() => setCurrent(theme), [theme]);

  function toggle() {
    const next: ThemeValue = current === 'dark' ? 'light' : 'dark';

    // Persist first so a reload — and every server render after this one —
    // already carries the right token set. A year is long enough that the
    // choice survives, and the cookie holds no personal data.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;

    document.documentElement.dataset.theme = next;
    setCurrent(next);
  }

  const isDark = current === 'dark';

  return (
    <button
      type="button"
      className="chrome-btn"
      onClick={toggle}
      aria-label={t('toggle')}
      title={isDark ? t('light') : t('dark')}
    >
      {isDark ? (
        <Sun size={20} weight="duotone" aria-hidden="true" />
      ) : (
        <Moon size={20} weight="duotone" aria-hidden="true" />
      )}
    </button>
  );
}
