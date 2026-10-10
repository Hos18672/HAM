'use client';

import { useSyncExternalStore } from 'react';
import type { PrayerKey } from '@/lib/prayer-times';

/**
 * Which prayers the reader wants the adhan for, kept on this device. The
 * five prayers are on and sunrise is off until somebody says otherwise.
 * The Android app reads the same choices when it schedules its alarms.
 */
export type AdhanKey = Exclude<PrayerKey, 'midnight'>;
export type AdhanPrefs = Record<AdhanKey, boolean>;

export const ADHAN_KEY = 'ham:adhan';
export const ADHAN_DEFAULT: AdhanPrefs = {
  fajr: true,
  sunrise: false,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
};

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: AdhanPrefs } = { raw: null, value: ADHAN_DEFAULT };

function read(): AdhanPrefs {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(ADHAN_KEY);
  } catch {
    // Storage blocked: the defaults hold.
  }
  if (raw === cache.raw) return cache.value;
  let value = ADHAN_DEFAULT;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<AdhanPrefs>) : {};
    value = { ...ADHAN_DEFAULT };
    for (const key of Object.keys(ADHAN_DEFAULT) as AdhanKey[]) {
      if (typeof parsed[key] === 'boolean') value[key] = parsed[key];
    }
  } catch {
    value = ADHAN_DEFAULT;
  }
  cache = { raw, value };
  return value;
}

const APP_KEY = 'ham:in-app';
const PACKAGE = 'at.hausallermenschen.app';

/**
 * Whether the page is running inside the Android app. Chrome opens the app's
 * first page with the app as its referrer; that is remembered for the rest
 * of the visit, since later pages have the site itself as referrer.
 */
export function inApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (document.referrer.startsWith(`android-app://${PACKAGE}`)) {
      window.sessionStorage.setItem(APP_KEY, '1');
      return true;
    }
    return window.sessionStorage.getItem(APP_KEY) === '1';
  } catch {
    return document.referrer.startsWith(`android-app://${PACKAGE}`);
  }
}

/** The app's own adhan screen, or one choice handed to it. */
export const ADHAN_APP_URL = 'hamapp://adhan';

export function setAdhan(key: AdhanKey, on: boolean) {
  const next = { ...read(), [key]: on };
  try {
    window.localStorage.setItem(ADHAN_KEY, JSON.stringify(next));
  } catch {
    // Not kept, but the page still shows the choice until it reloads.
    cache = { raw: cache.raw, value: next };
  }
  for (const listener of listeners) listener();
  // In the app the alarms are the phone's: the choice is handed to them too.
  if (inApp()) window.location.href = `${ADHAN_APP_URL}?prayer=${key}&on=${on ? 1 : 0}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === ADHAN_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useAdhanPrefs(): AdhanPrefs {
  return useSyncExternalStore(subscribe, read, () => ADHAN_DEFAULT);
}
