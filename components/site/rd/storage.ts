'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Small JSON values in `localStorage`, for the readers' conveniences: the
 * view, the size, the bookmarks, the place to continue from.
 *
 * None of it is needed to read. Every access is wrapped, because a private
 * window throws on storage, and the value starts at its fallback on the
 * server and on the first client pass so the two render the same; what is
 * stored is read straight after hydration.
 */

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/** A stored object, merged over its defaults, with a setter that saves. */
export function useStored<T extends object>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readJson<Partial<T>>(key);
    if (stored && typeof stored === 'object') setValue((was) => ({ ...was, ...stored }));
    setReady(true);
    // The defaults are a literal at every call site; reading once is the point.
  }, [key]);

  const update = useCallback(
    (patch: Partial<T> | ((was: T) => Partial<T>)) => {
      setValue((was) => {
        const next = { ...was, ...(typeof patch === 'function' ? patch(was) : patch) };
        writeJson(key, next);
        return next;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}
