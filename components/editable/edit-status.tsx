'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface EditStatusValue {
  state: SaveState;
  lastSavedAt: Date | null;
  error: string | null;
  setSaving: () => void;
  setSaved: () => void;
  setFailed: (error: string) => void;
}

/**
 * Shared save state for the in-place editor. Every editable region reports
 * into it and the bottom bar reads it, so there is exactly one place that
 * knows whether the page has unsaved work.
 */
const EditStatusContext = createContext<EditStatusValue | null>(null);

export function EditStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setSaving = useCallback(() => {
    setState('saving');
    setError(null);
  }, []);
  const setSaved = useCallback(() => {
    setState('saved');
    setLastSavedAt(new Date());
    setError(null);
  }, []);
  const setFailed = useCallback((message: string) => {
    setState('failed');
    setError(message);
  }, []);

  const value = useMemo(
    () => ({ state, lastSavedAt, error, setSaving, setSaved, setFailed }),
    [state, lastSavedAt, error, setSaving, setSaved, setFailed],
  );

  return <EditStatusContext.Provider value={value}>{children}</EditStatusContext.Provider>;
}

/** Falls back to a no-op so an editable region works outside the provider
 *  (for instance in a unit test) rather than throwing. */
export function useEditStatus(): EditStatusValue {
  const context = useContext(EditStatusContext);
  return (
    context ?? {
      state: 'idle',
      lastSavedAt: null,
      error: null,
      setSaving: () => {},
      setSaved: () => {},
      setFailed: () => {},
    }
  );
}
