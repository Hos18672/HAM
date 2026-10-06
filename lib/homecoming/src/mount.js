// Framework-agnostic integration of the Homecoming loader + hero.
//
// It takes care of everything around the scene: the page states on <html data-hc>,
// locking the scroll while loading, starting at the top on reload, real loading progress,
// the progress line, theme changes, a picture fallback without WebGL 2, and a safety net
// so the page is always usable.
//
//   <html data-hc="boot">   set in index.html: header + hero text hidden from the first paint
//   data-hc="loading"       the loader is running
//   data-hc="ready"         the hand-over has started: header + hero text fade in
import { createHomecoming } from './homecoming.js';
import { pageProgress } from './page-progress.js';

const html = () => document.documentElement;

function toTop() {
  try {
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    scrollTo(0, 0);
  }
}

export function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * @param {object} o
 * @param {HTMLElement} o.host          element covering the hero section (the canvas goes in here)
 * @param {HTMLElement} o.anchor        square box in the hero layout where the logo ends up
 * @param {HTMLElement} [o.eventsEl]    element that receives clicks (usually the hero section)
 * @param {HTMLElement} [o.meterEl]     element scaled from 0 to 1 as loading progresses
 * @param {'light'|'dark'} [o.theme]    current site theme
 * @param {boolean} [o.skipLoader]      go straight to the hero (e.g. when navigating back home)
 * @param {'page'|Promise|null} [o.progress='page']  'page' = fonts + images + window load;
 *                                      a Promise = done when it resolves; null = call complete() yourself
 * @param {string} [o.fallbackImage]    logo picture shown in the anchor when WebGL 2 is missing
 * @param {() => void} [o.onReady]      the hand-over starts (header + text may fade in now)
 * @param {(err: Error) => void} [o.onError]
 * @param {object} [o.sceneOptions]     passed through to createHomecoming (themes, minDuration, ringScale …)
 */
export function mountHomecoming(o) {
  const { host, anchor, eventsEl = host, meterEl, skipLoader = false, progress = 'page' } = o;
  let disposed = false;
  let guard = 0;

  const showPage = () => {
    if (html().dataset.hc === 'ready') return;
    html().dataset.hc = 'ready';
    html().style.removeProperty('overflow');
    o.onReady?.();
  };

  const fallback = (err) => {
    if (err) {
      console.error('Homecoming:', err);
      o.onError?.(err);
    }
    if (anchor && o.fallbackImage && !anchor.querySelector('img')) {
      const img = document.createElement('img');
      img.src = o.fallbackImage;
      img.alt = '';
      img.style.cssText = 'width:74%;height:74%;margin:13%;border-radius:50%;object-fit:cover';
      anchor.append(img);
    }
    showPage();
  };

  if (!skipLoader) {
    // a reload must start at the top, where the loader is
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    html().dataset.hc = 'loading';
    html().style.overflow = 'hidden';
    toTop();
    requestAnimationFrame(toTop);
    addEventListener('load', () => html().dataset.hc === 'loading' && toTop(), { once: true });
  } else {
    html().dataset.hc = 'ready';
  }

  if (!hasWebGL2()) {
    fallback(new Error('WebGL 2 is not available'));
    return { scene: null, setTheme() {}, setProgress() {}, complete() {}, dispose() {} };
  }

  let scene;
  try {
    scene = createHomecoming(host, {
      ...(o.sceneOptions || {}),
      anchor,
      eventsEl,
      skipLoader,
      onProgress: (p) => {
        if (meterEl) meterEl.style.transform = `scaleX(${p.toFixed(3)})`;
        o.sceneOptions?.onProgress?.(p);
      },
      onReady: showPage,
      onError: (err) => fallback(err),
    });
  } catch (err) {
    fallback(err);
    return { scene: null, setTheme() {}, setProgress() {}, complete() {}, dispose() {} };
  }
  if (o.theme) scene.setTheme(o.theme);

  if (skipLoader) scene.complete();
  else {
    if (progress === 'page') pageProgress((p) => !disposed && scene.setProgress(p));
    else if (progress && typeof progress.then === 'function') progress.then(() => !disposed && scene.complete(), () => !disposed && scene.complete());
    // safety net: whatever happens, the page is usable after 20 s
    guard = setTimeout(() => {
      if (html().dataset.hc !== 'loading') return;
      scene.complete();
      guard = setTimeout(showPage, 6000);
    }, 20000);
  }

  return {
    scene,
    setTheme: (t) => scene.setTheme(t),
    setProgress: (p) => scene.setProgress(p),
    complete: () => scene.complete(),
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(guard);
      scene.dispose();
      // never leave the page hidden or locked
      if (html().dataset.hc !== 'ready') {
        html().dataset.hc = 'ready';
        html().style.removeProperty('overflow');
      }
    },
  };
}
