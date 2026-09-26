'use client';

import { useEffect, useRef } from 'react';
import type { ViennaSkylineControl } from '@/lib/vienna-skyline/vienna-skyline.js';

/**
 * The Vienna skyline, standing on top of the footer band.
 *
 * `lib/vienna-skyline` draws it: vector line art with the Riesenrad turning,
 * a few birds, drifting clouds and the Danube shimmering along the bottom.
 * This is only the box it lives in and the colour it is given.
 *
 * The city is simply there — `reveal: false`. The library can draw itself in
 * from left to right when it first appears, and that is off on purpose: the
 * footer is somewhere you arrive, not something to be performed at.
 *
 * The city is drawn in the site's main green (`--green`), so it follows the
 * theme: the deep green on paper, the lighter green in the dark. The skyline
 * would pick that change up on its own within a second; the observer below
 * makes it immediate.
 *
 * Three.js is imported inside the effect, so it stays off the critical path.
 */
export function FooterSkyline() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const root = document.documentElement;
    let disposed = false;
    let control: ViennaSkylineControl | null = null;
    const themeWatch = new MutationObserver(() => control?.setColor('var(--green)'));

    void import('@/lib/vienna-skyline/vienna-skyline.js')
      .then(({ createViennaSkyline }) => {
        if (disposed || !hostRef.current) return;
        control = createViennaSkyline(hostRef.current, { color: 'var(--green)', reveal: false });
        themeWatch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      })
      .catch(() => {
        // No WebGL, or the chunk failed: the footer is complete without it.
      });

    return () => {
      disposed = true;
      themeWatch.disconnect();
      control?.destroy();
      control = null;
    };
  }, []);

  return <div ref={hostRef} className="footer-skyline" aria-hidden="true" />;
}
