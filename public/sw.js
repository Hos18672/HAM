/*
 * The service worker that makes the site installable as an app and keeps the
 * pages a reader has already opened readable without a connection.
 *
 * Network first, always: online, every request goes to the server exactly as
 * it would without this file, so nothing is ever served stale. Only when the
 * network fails does the copy from the reader's last visit answer instead.
 * The one exception is `_next/static`, whose file names carry a content hash
 * and so never change — those come from the cache once they are in it.
 *
 * Nothing behind a login is touched: the admin, the login page, Auth.js and
 * every POST go straight to the network and are never stored.
 */
const CACHE = 'ham-v1';
// '/' in production, '/HAM/' on the preview.
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function bypass(url) {
  const rest = url.pathname.slice(SCOPE.length);
  if (/^(admin|login)(\/|$)/.test(rest)) return true;
  // Of the API, only the Quran and the du'as are worth keeping offline.
  if (/^api\//.test(rest) && !/^api\/(quran|duas)\//.test(rest)) return true;
  return false;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === 'navigate') {
      // Somewhere to land rather than the browser's offline page.
      for (const home of [`${SCOPE}fa`, `${SCOPE}de`, `${SCOPE}fa/`, `${SCOPE}de/`]) {
        const fallback = await cache.match(home);
        if (fallback) return fallback;
      }
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (bypass(url)) return;

  if (url.pathname.startsWith(`${SCOPE}_next/static/`)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
