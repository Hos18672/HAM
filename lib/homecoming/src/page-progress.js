/**
 * Real loading progress of the page: web fonts, the images in the document and the window
 * load event. Calls onProgress(0…1); always reaches 1 after at most 3 seconds.
 *
 * CHANGED FOR THIS SITE: lazy images are not waited for. A lazy image further
 * down the page is not fetched until it is scrolled near — and the page cannot
 * be scrolled while the loader holds it — so waiting for one stalled the meter
 * until the timeout (the house map on the home page has eight such tiles).
 * The timeout itself came down from 8 s: past three seconds, a loader that
 * waits for a slow image only looks frozen.
 */
export function pageProgress(onProgress) {
  const tasks = [];
  if (document.fonts?.ready) tasks.push(document.fonts.ready);
  for (const img of Array.from(document.images)) {
    if (!img.complete && img.loading !== 'lazy') {
      tasks.push(
        new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        }),
      );
    }
  }
  if (document.readyState !== 'complete') tasks.push(new Promise((r) => addEventListener('load', r, { once: true })));
  if (!tasks.length) {
    onProgress(1);
    return;
  }
  let done = 0;
  tasks.forEach((t) => Promise.resolve(t).then(() => onProgress(++done / tasks.length)));
  setTimeout(() => onProgress(1), 3000);
}
