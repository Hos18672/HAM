'use client';

import { useEffect, useRef } from 'react';
import type { ViennaSkylineControl } from '@/lib/vienna-skyline/vienna-skyline.js';

/**
 * The Vienna skyline, standing on top of the footer band.
 *
 * `lib/vienna-skyline` draws it: vector line art with the Riesenrad turning,
 * a few birds, drifting clouds and the Danube shimmering along the bottom,
 * drawn in from left to right when it scrolls into view. This is only the box
 * it lives in, the colour it is given, and when the drawing-in happens.
 *
 * The city is drawn in the site's main green (`--green`), so it follows the
 * theme: the deep green on paper, the lighter green in the dark. The skyline
 * would pick that change up on its own within a second; the observer below
 * makes it immediate.
 *
 * The footer lives in the layout, so this is mounted once and survives every
 * navigation — which means the library's own one-shot reveal would play on
 * the first page seen and never again, on any page. It is replayed here each
 * time the city comes back into view after leaving it, so arriving at the
 * bottom of a page always draws the city in. The library stops its frame loop
 * under `prefers-reduced-motion`, so a replay there would blank the city for
 * good: in that case it is left alone, drawn and still.
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

    const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Seen once, so the first arrival draws the city in rather than finding it
    // already there — the library starts its own reveal a little early.
    let away = true;
    // Two thresholds, so the city has to leave the screen altogether before it
    // will draw itself in again — nudging the scroll around the edge of the
    // viewport must not restart it.
    const replayWatch = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio === 0) {
          away = true;
          return;
        }
        if (entry.intersectionRatio < 0.25) return;
        if (away && !stillness.matches) control?.replay();
        away = false;
      },
      { threshold: [0, 0.25] },
    );

    void import('@/lib/vienna-skyline/vienna-skyline.js')
      .then(({ createViennaSkyline }) => {
        if (disposed || !hostRef.current) return;
        control = createViennaSkyline(hostRef.current, { color: 'var(--green)' });
        themeWatch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        replayWatch.observe(hostRef.current);
      })
      .catch(() => {
        // No WebGL, or the chunk failed: the footer is complete without it.
      });

    return () => {
      disposed = true;
      themeWatch.disconnect();
      replayWatch.disconnect();
      control?.destroy();
      control = null;
    };
  }, []);

  return <div ref={hostRef} className="footer-skyline" aria-hidden="true" />;
}
