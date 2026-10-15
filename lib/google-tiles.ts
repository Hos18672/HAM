/**
 * Google's own map tiles (the Map Tiles API, "2D tiles"), for the qibla map.
 *
 * The same slippy-map squares the page has always drawn, so nothing about the
 * arrow, the dragging or the zoom changes — only who paints the streets. They
 * need a browser key from Google Cloud with the Map Tiles API enabled, read
 * from `NEXT_PUBLIC_GOOGLE_MAPS_KEY` at build time (it travels in every tile
 * URL, so it is public by nature: restrict it to the site's domains in the
 * console). Without one the map falls back to CARTO's tiles, as before.
 *
 * Every tile request names a session, created once per browser and language
 * and kept until shortly before Google says it expires (about two weeks), so
 * a visit costs one session request at most and usually none.
 */

export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
export const GOOGLE_TILE_ORIGIN = 'https://tile.googleapis.com';

export interface GoogleSession {
  session: string;
  /** Unix seconds. */
  expiry: number;
}

const STORE = 'ham.gmaps.session';
/** A session within a day of its end is replaced rather than used. */
const MARGIN_SECONDS = 24 * 60 * 60;

function storeKey(language: string) {
  return `${STORE}.${language}`;
}

function remembered(language: string): GoogleSession | null {
  try {
    const raw = localStorage.getItem(storeKey(language));
    if (!raw) return null;
    const value = JSON.parse(raw) as GoogleSession;
    if (typeof value.session !== 'string' || typeof value.expiry !== 'number') return null;
    return value.expiry - MARGIN_SECONDS > Date.now() / 1000 ? value : null;
  } catch {
    return null;
  }
}

const pending = new Map<string, Promise<GoogleSession | null>>();

/**
 * A session for the map in `language` (the site's locale), or null when there
 * is no key or Google refuses — the caller then uses the other tiles.
 */
export function googleSession(language: string): Promise<GoogleSession | null> {
  if (!GOOGLE_KEY) return Promise.resolve(null);
  const kept = remembered(language);
  if (kept) return Promise.resolve(kept);
  const inFlight = pending.get(language);
  if (inFlight) return inFlight;

  const request = fetch(
    `${GOOGLE_TILE_ORIGIN}/v1/createSession?key=${encodeURIComponent(GOOGLE_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mapType: 'roadmap',
        language,
        region: 'AT',
        // Tiles of 512 pixels for the area of 256: sharp on a phone's screen,
        // with labels at their usual size.
        scale: 'scaleFactor2x',
        highDpi: true,
      }),
    },
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { session?: string; expiry?: string | number };
      if (!body.session) return null;
      const value: GoogleSession = { session: body.session, expiry: Number(body.expiry) || 0 };
      try {
        localStorage.setItem(storeKey(language), JSON.stringify(value));
      } catch {
        // Private mode: the session simply lasts as long as the page.
      }
      return value;
    })
    .catch(() => null)
    .finally(() => pending.delete(language));
  pending.set(language, request);
  return request;
}

/** Forgets a session Google no longer accepts, so the next visit makes a new one. */
export function dropGoogleSession(language: string) {
  try {
    localStorage.removeItem(storeKey(language));
  } catch {
    // Nothing kept.
  }
}

export function googleTileUrl(session: string, z: number, x: number, y: number) {
  return `${GOOGLE_TILE_ORIGIN}/v1/2dtiles/${z}/${x}/${y}?session=${encodeURIComponent(session)}&key=${encodeURIComponent(GOOGLE_KEY)}`;
}

/**
 * The copyright line Google asks to be shown for the area in view
 * ("Map data ©2026 Google"). Null if it cannot be had; the caller shows a
 * plain credit to Google instead.
 */
export async function googleCopyright(
  session: string,
  zoom: number,
  bounds: { north: number; south: number; east: number; west: number },
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    session,
    key: GOOGLE_KEY,
    zoom: String(zoom),
    north: bounds.north.toFixed(6),
    south: bounds.south.toFixed(6),
    east: bounds.east.toFixed(6),
    west: bounds.west.toFixed(6),
  });
  try {
    const response = await fetch(`${GOOGLE_TILE_ORIGIN}/tile/v1/viewport?${params}`, { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as { copyright?: string };
    return body.copyright?.trim() || null;
  } catch {
    return null;
  }
}
