import { useEffect, useState, useSyncExternalStore } from 'react';
import { DEFAULT_CITY_ID, findCity, type City } from './cities';
import { localPrayerDay, type LocalPlace } from './prayer-local';
import type { PrayerDay } from './prayer-page';

/**
 * Where the prayer times are for — one answer shared by every part of the
 * site that needs it: the prayer page, its month table, the strip on the home
 * page and the qibla's first guess.
 *
 * The reader's own position is the default. On the first visit the browser
 * is asked for it; the answer is rounded to two decimals (about a kilometre)
 * and remembered on this device only, so the next page has it at once. A city
 * picked from the list wins over the position, and "back to Vienna" is a
 * choice that is remembered too. Vienna — the house — is what is left when
 * the position is refused or cannot be had.
 */

export type PlaceChoice =
  { kind: 'house' } | { kind: 'city'; city: City } | { kind: 'located'; place: LocalPlace };

export type GeoState = 'idle' | 'locating' | 'located' | 'denied' | 'unsupported' | 'failed';

export interface PlaceState {
  choice: PlaceChoice;
  geo: GeoState;
}

const CITY_KEY = 'ham-city';
const PLACE_KEY = 'ham-place';
const HOUSE_KEY = 'ham-place-house';

/** What the server renders, and what the first paint in the browser matches. */
const INITIAL: PlaceState = { choice: { kind: 'house' }, geo: 'idle' };

let state: PlaceState = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function set(next: PlaceState) {
  state = next;
  for (const listener of listeners) listener();
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Private windows and blocked storage simply forget; nothing breaks. */
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // The choice still holds for this page.
  }
}

/** The position remembered from an earlier visit, if it is well formed. */
export function rememberedPlace(): LocalPlace | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(read(PLACE_KEY) ?? 'null') as Partial<LocalPlace> | null;
    if (
      value &&
      typeof value.latitude === 'number' &&
      typeof value.longitude === 'number' &&
      Math.abs(value.latitude) <= 90 &&
      Math.abs(value.longitude) <= 180 &&
      typeof value.timeZone === 'string' &&
      value.timeZone
    ) {
      return { latitude: value.latitude, longitude: value.longitude, timeZone: value.timeZone };
    }
  } catch {
    // Not JSON: treated as nothing remembered.
  }
  return null;
}

/** Once per page load, in the browser: the remembered choice, or the position. */
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const city = findCity(read(CITY_KEY));
  if (city && city.id !== DEFAULT_CITY_ID) {
    set({ choice: { kind: 'city', city }, geo: 'idle' });
    return;
  }
  if (read(HOUSE_KEY)) return;
  const remembered = rememberedPlace();
  if (remembered) set({ choice: { kind: 'located', place: remembered }, geo: 'located' });
  // Refreshed every visit: silent once the browser has said yes.
  locate();
}

/** Ask the browser where the reader is, and use it. */
export function locate() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    set({ ...state, geo: 'unsupported' });
    return;
  }
  write(HOUSE_KEY, null);
  if (state.choice.kind !== 'located') set({ ...state, geo: 'locating' });
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const place: LocalPlace = {
        latitude: Number(position.coords.latitude.toFixed(2)),
        longitude: Number(position.coords.longitude.toFixed(2)),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Vienna',
      };
      write(PLACE_KEY, JSON.stringify(place));
      write(CITY_KEY, null);
      set({ choice: { kind: 'located', place }, geo: 'located' });
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        write(PLACE_KEY, null);
        set({
          choice: state.choice.kind === 'located' ? { kind: 'house' } : state.choice,
          geo: 'denied',
        });
        return;
      }
      // A position from an earlier visit is still a good answer when a
      // refresh times out.
      set({ ...state, geo: state.choice.kind === 'located' ? 'located' : 'failed' });
    },
    { timeout: 10_000, maximumAge: 600_000 },
  );
}

/**
 * A position found elsewhere on the site — the qibla page asks for its own,
 * more precise one — kept as the default too, unless the reader has chosen a
 * city or Vienna, which a position never overrides.
 */
export function offerPosition(latitude: number, longitude: number) {
  if (typeof window === 'undefined') return;
  if (read(HOUSE_KEY) || findCity(read(CITY_KEY))) return;
  const place: LocalPlace = {
    latitude: Number(latitude.toFixed(2)),
    longitude: Number(longitude.toFixed(2)),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Vienna',
  };
  write(PLACE_KEY, JSON.stringify(place));
  if (started) set({ choice: { kind: 'located', place }, geo: 'located' });
}

/** A city from the list. Vienna's own entry means the house. */
export function chooseCity(id: string) {
  const city = findCity(id);
  if (!city || city.id === DEFAULT_CITY_ID) {
    chooseHouse();
    return;
  }
  write(CITY_KEY, city.id);
  set({ choice: { kind: 'city', city }, geo: 'idle' });
}

/** Back to Vienna, remembered as a choice: the position is forgotten and not asked for again. */
export function chooseHouse() {
  write(CITY_KEY, null);
  write(PLACE_KEY, null);
  write(HOUSE_KEY, '1');
  set({ choice: { kind: 'house' }, geo: 'idle' });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The shared answer, kept current. */
export function usePrayerPlace(): PlaceState {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
  useEffect(() => {
    start();
  }, []);
  return current;
}

/** The coordinates of a choice; null for the house, whose times the server has. */
export function placeOf(choice: PlaceChoice): LocalPlace | null {
  if (choice.kind === 'city') return choice.city;
  if (choice.kind === 'located') return choice.place;
  return null;
}

/** A stable key for a choice, for caches and effect dependencies. */
export function placeKey(choice: PlaceChoice): string {
  const place = placeOf(choice);
  return place ? `${place.latitude},${place.longitude},${place.timeZone}` : 'house';
}

/**
 * Today's times for the chosen place. The house's are the server's, already
 * on the page. A city's are worked out here. The reader's own position is
 * worked out here at once and then asked of this site's `/api/prayer/day`
 * (never of the API directly), whose answer replaces it; the static preview
 * has no such route and keeps the local one.
 */
export function usePlaceDay(houseDay: PrayerDay): { day: PrayerDay; place: PlaceState } {
  const place = usePrayerPlace();
  const [day, setDay] = useState(houseDay);
  const key = placeKey(place.choice);

  useEffect(() => {
    const choice = place.choice;
    if (choice.kind === 'house') {
      setDay(houseDay);
      return undefined;
    }
    if (choice.kind === 'city') {
      setDay(localPrayerDay(new Date(), choice.city));
      return undefined;
    }
    let live = true;
    const at = choice.place;
    setDay(localPrayerDay(new Date(), at));
    const query = new URLSearchParams({
      lat: String(at.latitude),
      lng: String(at.longitude),
      tz: at.timeZone,
    });
    fetch(`/api/prayer/day?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<PrayerDay>;
      })
      .then((answer) => {
        if (live) setDay(answer);
      })
      .catch(() => {
        // The local day stands.
      });
    return () => {
      live = false;
    };
    // `key` stands for `place.choice`, which is a new object on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, houseDay]);

  return { day, place };
}
