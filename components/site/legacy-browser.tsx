'use client';

import { useEffect } from 'react';

/**
 * What the stylesheet cannot do on its own in an older browser — the
 * Chromium 85 or 94 of a TV or display browser (a Samsung Flip among
 * them). A current browser returns at the first check and runs none of it.
 *
 *  - `:has()`: each `:has()` rule that keeps the layout whole has a twin in
 *    the stylesheet keyed on a class this sets ("Stand-ins for :has()" in
 *    globals.css).
 *  - `aspect-ratio` (Chromium 88): the build writes each one again as
 *    `--ham-ar` (scripts/postcss-legacy.cjs); this gives those boxes the
 *    height the ratio would — the hero's logo, the maps and the qibla dial
 *    were otherwise nothing high.
 */
const BODY: [string, string][] = [
  ['has-rd-app', '.rd-app'],
  ['has-tab-bar', '.tab-bar'],
  ['has-edit-bar', '.edit-bar'],
  ['has-contact-page', '.contact-page'],
];

function syncHas() {
  for (const [name, selector] of BODY)
    document.body.classList.toggle(name, document.querySelector(selector) !== null);
  document.querySelectorAll('.contact-chip').forEach((el) => {
    el.classList.toggle('is-checked', el.querySelector('input:checked') !== null);
  });
  document.querySelectorAll('.prayer-next').forEach((el) => {
    el.classList.toggle('is-open', el.querySelector('.city-box-list:not([hidden])') !== null);
  });
  document.querySelectorAll('.m-view').forEach((el) => {
    el.classList.toggle('has-fab', el.querySelector('.a-fab-bar') !== null);
  });
  document.querySelectorAll('.card > * > .card-link').forEach((link) => {
    link.parentElement?.classList.add('has-card-link');
  });
}

/** Every selector the stylesheets give a `--ham-ar`. */
function ratioSelectors(): string[] {
  const found = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        if (rule.style.getPropertyValue('--ham-ar')) found.add(rule.selectorText);
      } else if ('cssRules' in rule) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      /* another origin's sheet */
    }
  }
  return Array.from(found);
}

/** `4 / 3` → 4/3; `1` → 1; `auto` or nothing → null. */
function ratioOf(el: Element): number | null {
  const value = getComputedStyle(el).getPropertyValue('--ham-ar').trim();
  const [w, h = '1'] = value.split('/').map((part) => part.trim());
  const ratio = Number(w) / Number(h);
  return ratio > 0 && Number.isFinite(ratio) ? ratio : null;
}

export function LegacyBrowser() {
  useEffect(() => {
    const supports = (test: string) => {
      try {
        return CSS.supports(test);
      } catch {
        return false;
      }
    };
    const has = supports('selector(:has(a))');
    const ratio = supports('(aspect-ratio: 1)');
    if (has && ratio) return;

    const selectors = ratio ? '' : ratioSelectors().join(',');
    const sized = new Set<HTMLElement>();
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            for (const entry of entries) fit(entry.target as HTMLElement);
          });
    function fit(el: HTMLElement) {
      const r = ratioOf(el);
      if (!r) {
        el.style.removeProperty('height');
        return;
      }
      const width = el.getBoundingClientRect().width;
      if (width) el.style.height = `${Math.round(width / r)}px`;
    }
    const syncRatio = () => {
      if (!selectors) return;
      document.querySelectorAll<HTMLElement>(selectors).forEach((el) => {
        if (!sized.has(el)) {
          sized.add(el);
          resize?.observe(el);
        }
        fit(el);
      });
    };

    let frame = 0;
    const sync = () => {
      if (!has) syncHas();
      syncRatio();
    };
    const soon = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(soon);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });
    document.addEventListener('change', soon, true);
    window.addEventListener('resize', soon);
    return () => {
      observer.disconnect();
      resize?.disconnect();
      document.removeEventListener('change', soon, true);
      window.removeEventListener('resize', soon);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
