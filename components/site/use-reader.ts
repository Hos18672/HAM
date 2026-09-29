'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * What a long text needs to be read on a phone: the whole screen, a size the
 * reader chooses, and a page that turns under the thumb.
 *
 * Shared by the mushaf and the du'a reader because it is the same reading —
 * a right-to-left text held open for a long time — and because a reader who
 * has learnt it in one place should not have to learn it again in the other.
 *
 * Nothing here is required to read: the page works without any of it, and
 * each piece is dropped quietly where the browser has no such thing.
 */

const MIN_SCALE = 0.75;
const MAX_SCALE = 2.2;
const STEP = 0.15;

/** Pixels a finger must travel across before it counts as a page turn. */
const SWIPE_DISTANCE = 56;
/** …and how much straighter across than up or down it has to be. */
const SWIPE_STRAIGHTNESS = 1.6;
/** A slow drag is somebody scrolling or thinking, not turning a page. */
const SWIPE_MS = 900;

/**
 * Whether the screen is full, kept outside the component.
 *
 * Turning a page changes the address, and changing the address makes Next
 * remount the route's client tree — which is why `mushaf-reader` keeps the
 * pages it has fetched out here too. Without this, every turn dropped the
 * reader out of fullscreen: the state went with the old copy of it.
 *
 * Written as the state changes rather than on the way out, because React
 * mounts the new copy *before* unmounting the old one, so an unmount is too
 * late to be read. `live` counts the copies mounted under a key so that a
 * reader who leaves the page altogether — the count reaching nought and
 * staying there — does not find the screen still full on their return.
 */
const wasFull = new Map<string, boolean>();
const live = new Map<string, number>();
/** Long enough for a remount to have happened, short enough not to matter. */
const HANDOVER_MS = 150;

/**
 * Whether the browser actually granted real fullscreen, or only the overlay.
 * Out here for the same reason: a ref would be forgotten on a page turn, and
 * the reader would then be left in fullscreen with nothing that knew it.
 */
let native = false;

export interface Reader {
  /** Whether the reader is filling the screen. */
  full: boolean;
  toggleFull: () => void;
  /** Multiplier on the text's own size, 0.75 to 2.2. */
  scale: number;
  larger: () => void;
  smaller: () => void;
  canEnlarge: boolean;
  canReduce: boolean;
  /** Put on the element that becomes the screen. */
  shellRef: React.RefObject<HTMLDivElement | null>;
  /** Spread onto the element the reader swipes across. */
  swipe: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: () => void;
  };
}

export function useReader({
  storageKey,
  onNext,
  onPrevious,
}: {
  /** Where the chosen text size is remembered, per reader. */
  storageKey: string;
  /** Onwards — leftwards, the way an Arabic book turns. */
  onNext?: () => void;
  onPrevious?: () => void;
}): Reader {
  const [full, setFull] = useState(() => wasFull.get(storageKey) === true);
  const [scale, setScale] = useState(1);
  const shellRef = useRef<HTMLDivElement>(null);

  // Hand the state on to whatever copy of the reader a page turn remounts.
  useEffect(() => {
    wasFull.set(storageKey, full);
  }, [full, storageKey]);

  // …and forget it once no copy is left, which is somebody leaving the page.
  useEffect(() => {
    live.set(storageKey, (live.get(storageKey) ?? 0) + 1);
    return () => {
      live.set(storageKey, (live.get(storageKey) ?? 1) - 1);
      setTimeout(() => {
        if ((live.get(storageKey) ?? 0) > 0) return;
        wasFull.delete(storageKey);
        if (native && document.fullscreenElement) void document.exitFullscreen();
        native = false;
      }, HANDOVER_MS);
    };
  }, [storageKey]);

  /* ── The chosen size ──────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(`${storageKey}-scale`));
      if (stored >= MIN_SCALE && stored <= MAX_SCALE) setScale(stored);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);

  const change = useCallback(
    (by: number) => {
      setScale((current) => {
        // Rounded to the step: repeated floating-point addition otherwise
        // leaves 1.0499999999999998 in storage and on the button's label.
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, Math.round((current + by) * 100) / 100),
        );
        try {
          localStorage.setItem(`${storageKey}-scale`, String(next));
        } catch {
          /* storage unavailable */
        }
        return next;
      });
    },
    [storageKey],
  );

  const larger = useCallback(() => change(STEP), [change]);
  const smaller = useCallback(() => change(-STEP), [change]);

  /* ── The whole screen ─────────────────────────────────────────────────── */
  const toggleFull = useCallback(() => {
    setFull((current) => {
      if (current) {
        if (document.fullscreenElement) void document.exitFullscreen();
        native = false;
        return false;
      }
      // Real fullscreen where there is one — it hides the browser's own
      // chrome, which is most of what a phone screen is. iOS Safari refuses
      // it for anything but a video; the overlay below is the whole feature
      // there, and works.
      //
      // Asked of the document, not of the reader's own element: a page turn
      // remounts the reader, and a browser leaves fullscreen the moment the
      // element it was showing is taken out of the page.
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen({ navigationUI: 'hide' }).then(
          () => {
            native = true;
          },
          () => {
            native = false;
          },
        );
      }
      return true;
    });
  }, []);

  // Leaving fullscreen by the browser's own means — Escape, the system
  // gesture, the button Chrome puts in the toolbar — leaves the overlay too.
  useEffect(() => {
    const onChange = () => {
      if (native && !document.fullscreenElement) {
        native = false;
        setFull(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Escape closes the overlay where there was no real fullscreen to leave.
  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setFull(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full]);

  // The page behind must not scroll under the overlay.
  useEffect(() => {
    if (!full) return;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previous;
    };
  }, [full]);

  /* ── The turn under the thumb ─────────────────────────────────────────── */
  const from = useRef<{ x: number; y: number; at: number; id: number } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    // A mouse drag is how text is selected; only a finger or a pen turns a
    // page. Controls keep their own gestures.
    if (event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, summary')) {
      from.current = null;
      return;
    }
    from.current = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const start = from.current;
      from.current = null;
      if (!start || start.id !== event.pointerId) return;
      if (Date.now() - start.at > SWIPE_MS) return;

      const across = event.clientX - start.x;
      const down = event.clientY - start.y;
      if (Math.abs(across) < SWIPE_DISTANCE) return;
      if (Math.abs(across) < Math.abs(down) * SWIPE_STRAIGHTNESS) return;
      // Somebody who was marking a verse is not asking for the next page.
      if (window.getSelection()?.toString()) return;

      // Leftwards is onwards, as the buttons under the page have it and as
      // the arrow keys do: in an Arabic book the next page lies to the left.
      if (across < 0) onNext?.();
      else onPrevious?.();
    },
    [onNext, onPrevious],
  );

  const onPointerCancel = useCallback(() => {
    from.current = null;
  }, []);

  return {
    full,
    toggleFull,
    scale,
    larger,
    smaller,
    canEnlarge: scale < MAX_SCALE,
    canReduce: scale > MIN_SCALE,
    shellRef,
    swipe: { onPointerDown, onPointerUp, onPointerCancel },
  };
}
