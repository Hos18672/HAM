'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from '@/lib/i18n/navigation';
import type { PageSkyControl } from '@/lib/homecoming/page-sky.js';
import { loadSilhouette, skylineBoxes, type Silhouette } from './skyline-silhouette';

/** What counts as a card: the flocks keep off every one of these. */
const CARDS = '.card, .tile, .surf, .cta-panel, .card-plate, .frame, .pull-quote-plated';

/**
 * The Homecoming birds, over every page.
 *
 * `lib/homecoming/page-sky.js` draws the hero's own birds — same shape, same
 * flap and glide, same loose flocks, same shyness of the pointer — in groups
 * that cross the window and come back from another edge a while later. This
 * is only the fixed layer it draws into, and the rules for when it shows.
 *
 * The layer never takes a click and sits under the header and every drawer
 * and dialog. It lives in the site layout, so the flocks keep flying across
 * navigations instead of starting over on each page.
 *
 * On the home page they hold back while the intro plays. Nothing is drawn with `prefers-reduced-motion`, and without WebGL the
 * layer simply stays empty.
 *
 * The birds keep off the page's cards and off the city in the footer: both
 * are handed to the scene each frame as no-fly boxes. A flock turns away as
 * it nears one, and a bird the scroll carries over one is steered off it. The
 * city's boxes follow its roof line (see `skyline-silhouette.ts`), so birds
 * still fly in the sky above it.
 *
 * The contact page has none: it is there to be read at once, and the scene's
 * frame loop cost a phone seconds of main thread before the page answered.
 */
export function WanderingBirds() {
  const hostRef = useRef<HTMLDivElement>(null);
  const grounded = usePathname() === '/contact';

  useEffect(() => {
    const host = hostRef.current;
    if (!host || grounded) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const root = document.documentElement;
    let disposed = false;
    let control: PageSkyControl | null = null;

    // Held back while the home page's intro is up.
    const visibility = () => (root.dataset.intro === 'play' ? 0 : 1);

    // The cards on the page. The list is refreshed now and then (the page
    // changes under a client-side navigation); their boxes are read fresh
    // each frame, since they move with every scroll.
    let cards: Element[] = [];
    let cardsAt = -Infinity;
    let silhouette: Silhouette | null = null;
    void loadSilhouette()
      .then((tops) => {
        silhouette = tops;
      })
      .catch(() => {
        // Without the outline the birds simply do not know about the city.
      });

    const obstacles = () => {
      const now = performance.now();
      if (now - cardsAt > 500) {
        cards = Array.from(document.querySelectorAll(CARDS));
        cardsAt = now;
      }
      const vh = window.innerHeight;
      const boxes: Array<[number, number, number, number, number]> = [];
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.bottom < -200 || r.top > vh + 200) continue;
        boxes.push([r.left, r.top, r.right, r.bottom, 0]);
      }
      const city = silhouette && document.querySelector('.footer-skyline');
      if (city && silhouette) boxes.push(...skylineBoxes(city, silhouette));
      return boxes;
    };

    // Dynamic, so Three.js stays off the critical path of every page.
    void import('@/lib/homecoming/page-sky.js')
      .then(({ createPageSky }) => {
        if (disposed || !hostRef.current) return;
        control = createPageSky(hostRef.current, {
          themeEl: root,
          themeAttr: 'data-theme',
          visibility,
          obstacles,
        });
      })
      .catch(() => {
        // No WebGL, or the chunk failed: the page is complete without birds.
      });

    return () => {
      disposed = true;
      control?.dispose();
      control = null;
    };
  }, [grounded]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 'calc(var(--z-header) - 1)',
      }}
    />
  );
}
