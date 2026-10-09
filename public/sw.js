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
const CACHE = 'ham-v3';
// '/' in production, '/HAM/' on the preview.
const SCOPE = new URL(self.registration.scope).pathname;

// The prayer times, computed here, and the calendar feed's reader, for the
// Windows widgets (see below).
importScripts('widgets/prayer.js', 'widgets/calendar.js');

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

/*
 * The Windows 11 widgets. The widget board asks the service worker for their
 * content, which is an Adaptive Card template in `widgets/` filled in here:
 *
 *   prayer-times  today's prayer times at the house, the next one picked
 *                 out, computed right here — no server, no network
 *   calendar      today in three calendars and the coming events and
 *                 occasions, from the site's calendar feed; the last copy
 *                 fetched answers when there is no connection
 *
 * They refresh on the board's own schedule (the manifest's `update`), when
 * the board is opened again, and whenever this worker is updated.
 */
const WIDGET_TAGS = ['prayer-times', 'calendar'];
const WIDGET_PAGES = { 'prayer-times': 'prayer', calendar: 'events' };

async function calendarFeed() {
  const request = new Request(`${SCOPE}widget-data/calendar.json`);
  try {
    return await (await networkFirst(request)).json();
  } catch {
    return null;
  }
}

async function renderWidget(widget) {
  const template = await (await fetch(widget.definition.msAcTemplate)).text();
  const tag = widget.definition.tag;
  const content =
    tag === 'calendar'
      ? self.HamCalendar.widgetData(await calendarFeed(), new Date())
      : self.HamPrayer.widgetData(new Date());
  await self.widgets.updateByTag(tag, { template, data: JSON.stringify(content) });
}

self.addEventListener('widgetinstall', (event) => {
  event.waitUntil(
    (async () => {
      const sync = self.registration.periodicSync;
      if (sync && event.widget.definition.update) {
        const tags = await sync.getTags();
        if (!tags.includes(event.widget.definition.tag)) {
          await sync.register(event.widget.definition.tag, {
            minInterval: event.widget.definition.update * 1000,
          });
        }
      }
      await renderWidget(event.widget);
    })(),
  );
});

self.addEventListener('widgetuninstall', (event) => {
  event.waitUntil(
    (async () => {
      if (event.widget.instances.length <= 1 && self.registration.periodicSync) {
        await self.registration.periodicSync.unregister(event.widget.definition.tag);
      }
    })(),
  );
});

self.addEventListener('widgetresume', (event) => event.waitUntil(renderWidget(event.widget)));

self.addEventListener('periodicsync', (event) => {
  if (!WIDGET_TAGS.includes(event.tag) || !self.widgets) return;
  event.waitUntil(
    self.widgets.getByTag(event.tag).then((widget) => widget && renderWidget(widget)),
  );
});

self.addEventListener('widgetclick', (event) => {
  if (event.action !== 'open') return;
  const page = WIDGET_PAGES[event.widget.definition.tag] ?? '';
  event.waitUntil(self.clients.openWindow(`${SCOPE}${page}`));
});

// A new version of this worker brings fresh times to a widget already pinned.
self.addEventListener('activate', (event) => {
  if (!self.widgets) return;
  event.waitUntil(
    Promise.all(
      WIDGET_TAGS.map((tag) =>
        self.widgets
          .getByTag(tag)
          .then((widget) => widget && widget.instances.length && renderWidget(widget))
          .catch(() => {}),
      ),
    ),
  );
});
