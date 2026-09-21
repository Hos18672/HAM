'use client';

import { useEffect } from 'react';

/**
 * Staggered reveal on section entry.
 *
 * The elements start *visible* in the stylesheet and are only hidden once this
 * observer has claimed them (`data-rise-armed`). That ordering matters: with no
 * JavaScript, or before hydration, the page is fully readable — the animation
 * is an enhancement, never a prerequisite for seeing the content.
 */
export function RiseObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-rise]'));
    if (nodes.length === 0) return;

    // Arm only what is still below the fold; anything already on screen stays
    // as it is rather than fading in under the reader's eyes.
    const pending: HTMLElement[] = [];
    for (const node of nodes) {
      if (node.dataset.riseIn === 'true') continue;
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        node.dataset.riseIn = 'true';
        continue;
      }
      node.dataset.riseArmed = 'true';
      pending.push(node);
    }
    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Stagger within one batch so a row of cards arrives in sequence.
        let index = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.setProperty('--rise-delay', `${Math.min(index, 5) * 60}ms`);
          el.dataset.riseIn = 'true';
          observer.unobserve(el);
          index += 1;
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    for (const node of pending) observer.observe(node);
    return () => observer.disconnect();
  });

  return null;
}
