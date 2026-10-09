'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js`, which — together with the web app manifest — is
 * what lets a phone install the site as an app rather than only as a
 * bookmark on the home screen.
 *
 * Production builds only: in development a worker that caches pages gets in
 * the way of every reload.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, []);
  return null;
}
