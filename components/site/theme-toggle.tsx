'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sun, Moon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '../ui/button';
import { THEME_COOKIE, type ThemeValue } from './theme';

/**
 * Theme switch with the soft circular wash.
 *
 * The wash is a single fixed element sized to cover the viewport from the
 * button's own position, animated on transform and opacity only — no layout
 * thrash, no second paint of the page. Under `prefers-reduced-motion` the
 * element is hidden by the stylesheet and the swap is instant.
 */
export function ThemeToggle({ theme }: { theme: ThemeValue }) {
  const t = useTranslations('theme');

  // The prop is the server's reading of the cookie, which only changes on the
  // next server render. Toggling has to move a piece of client state as well,
  // or the second click computes the same "next" theme as the first and the
  // switch appears to be stuck.
  const [current, setCurrent] = useState<ThemeValue>(theme);
  useEffect(() => setCurrent(theme), [theme]);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: ThemeValue = current === 'dark' ? 'light' : 'dark';

    // Persist first so a reload — and every server render after this one —
    // already carries the right token set. A year is long enough that the
    // choice survives, and the cookie holds no personal data.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      // Radius that reaches the furthest corner from the button.
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const wash = document.createElement('div');
      wash.className = 'theme-wash';
      wash.style.inlineSize = `${radius * 2}px`;
      wash.style.blockSize = `${radius * 2}px`;
      wash.style.insetInlineStart = `${x - radius}px`;
      wash.style.insetBlockStart = `${y - radius}px`;
      wash.addEventListener('animationend', () => wash.remove(), { once: true });
      document.body.append(wash);
    }

    document.documentElement.dataset.theme = next;
    setCurrent(next);
  }

  const isDark = current === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      onClick={toggle}
      aria-label={t('toggle')}
      title={isDark ? t('light') : t('dark')}
    >
      {isDark ? (
        <Sun size={20} weight="duotone" aria-hidden="true" />
      ) : (
        <Moon size={20} weight="duotone" aria-hidden="true" />
      )}
    </Button>
  );
}
