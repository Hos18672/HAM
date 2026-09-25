/**
 * Real loading progress of the page: web fonts, the images in the document and the window
 * load event. Calls onProgress(0…1); always reaches 1 after at most 8 seconds.
 */
export function pageProgress(onProgress) {
  const tasks = [];
  if (document.fonts?.ready) tasks.push(document.fonts.ready);
  for (const img of Array.from(document.images)) {
    if (!img.complete) {
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
  setTimeout(() => onProgress(1), 8000);
}
