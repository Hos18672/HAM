/**
 * Whether this visitor has agreed to Google Maps being loaded.
 *
 * An embedded Google map sets cookies and tells Google about the visit, so it
 * waits for a tap ("Google Maps laden"). That tap used to count for one page
 * view only, and every map on the site asked again; now it is remembered in
 * this browser, every map — the house's on the home and contact pages, the
 * qibla map — loads straight away afterwards, and "hide Google Maps" under
 * any of them takes the agreement back again.
 */

const KEY = 'ham.gmaps.consent';
const EVENT = 'ham:gmaps-consent';

export function hasGoogleConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setGoogleConsent(value: boolean) {
  try {
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage switched off: the choice lasts as long as the page.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/** Calls `listener` whenever any map on the page changes the agreement. */
export function onGoogleConsent(listener: (value: boolean) => void) {
  const handle = (event: Event) => listener((event as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handle);
  return () => window.removeEventListener(EVENT, handle);
}
