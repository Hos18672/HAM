'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Turning a page like paper.
 *
 * The leaf is a real sheet: it hangs on the spine — the right-hand edge, this
 * being a book bound on the right — and swings about it. So onwards is a
 * sweep from left to right, which is the hand a reader of a mushaf already
 * has: you take the leaf you have finished and carry it over the spine.
 * Dragging moves it under the finger; letting go either carries it over or
 * lets it fall back.
 * Past ninety degrees its back is towards the reader and `backface-visibility`
 * takes it out of sight, which is what a turning page does.
 *
 * The angle is written straight onto the element rather than held in state:
 * a turn is sixty frames, and sixty renders of a page of the Quran is sixty
 * frames dropped. React is told only which two pages are on the deck.
 *
 * Only on a small screen. A phone is held like a book and turned with the
 * thumb; on a tablet or a desk the page simply changes, from the buttons or
 * the arrow keys, with no leaf and no swipe.
 */

/** Below this the page turns like paper; at and above it, it just changes. */
const PAPER_QUERY = '(max-width: 767.98px)';

/** How far the sheet must be carried before letting go completes the turn. */
const COMMIT_AT = 0.32;
/** …or how fast it must be moving, in pixels per millisecond. */
const COMMIT_SPEED = 0.45;
const DURATION_MS = 460;

export interface PaperTurn {
  /** The page the leaf is turning to, or null at rest. */
  to: number | null;
  /** 1 going on (the sheet sweeps rightwards), -1 going back. */
  direction: 1 | -1;
  /** True from the first movement until the new page is in place. */
  turning: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  leafRef: React.RefObject<HTMLDivElement | null>;
  /** Start a turn from a button or a key, with the full animation. */
  turn: (to: number) => void;
  gesture: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
  };
}

const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function usePaperTurn({
  page,
  canGo,
  prepare,
  commit,
}: {
  /** The page number on the deck now. */
  page: number;
  canGo: (to: number) => boolean;
  /** Make sure the page can be drawn; false if it cannot be had. */
  prepare: (to: number) => Promise<boolean>;
  /** Put the new page in place, once the leaf has fallen. */
  commit: (to: number) => void;
}): PaperTurn {
  const [state, setState] = useState<{ to: number | null; direction: 1 | -1 }>({
    to: null,
    direction: 1,
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);

  /** Everything the gesture needs between events, none of it worth a render. */
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    at: number;
    lastX: number;
    lastAt: number;
    axis: 'none' | 'across' | 'down';
    to: number | null;
    direction: 1 | -1;
  } | null>(null);
  const settling = useRef(false);
  const reduced = useRef(false);
  /** True where there is no leaf: a wide screen, or reduced motion. */
  const still = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia(PAPER_QUERY);
    const update = () => {
      still.current = reduced.current || !small.matches;
    };
    update();
    small.addEventListener('change', update);
    return () => small.removeEventListener('change', update);
  }, []);

  /** Put the leaf at `progress`, 0 flat on the book and 1 fully turned. */
  const place = useCallback((progress: number, direction: 1 | -1, animate = false) => {
    const leaf = leafRef.current;
    if (!leaf) return;
    const angle = direction === 1 ? progress * 180 : (1 - progress) * 180;
    leaf.style.transition = animate ? `transform ${DURATION_MS}ms cubic-bezier(.3,0,.2,1)` : 'none';
    leaf.style.transform = `rotateY(${angle}deg)`;
    // The sheet darkens as it comes up and lightens as it lies down again.
    leaf.style.setProperty('--leaf-shade', String(Math.sin((angle * Math.PI) / 180) * 0.5));
  }, []);

  /** Carry the leaf the rest of the way, or let it fall back. */
  const settle = useCallback(
    (progress: number, direction: 1 | -1, to: number, through: boolean) => {
      settling.current = true;
      const finish = () => {
        settling.current = false;
        if (through) commit(to);
        setState({ to: null, direction });
        const leaf = leafRef.current;
        if (leaf) {
          leaf.style.transition = 'none';
          leaf.style.transform = '';
        }
      };

      if (reduced.current) {
        finish();
        return;
      }
      // One frame at the current angle first, so the transition has
      // something to run from when the turn began with a tap.
      place(progress, direction);
      requestAnimationFrame(() => {
        place(through ? 1 : 0, direction, true);
        window.setTimeout(finish, DURATION_MS + 20);
      });
    },
    [commit, place],
  );

  const turn = useCallback(
    (to: number) => {
      if (settling.current || drag.current || !canGo(to)) return;
      const direction: 1 | -1 = to > page ? 1 : -1;
      void prepare(to).then((ready) => {
        if (!ready) return;
        // No leaf on a wide screen: the new page is simply put in place.
        if (still.current) {
          commit(to);
          return;
        }
        setState({ to, direction });
        // The leaf only exists once React has drawn it.
        requestAnimationFrame(() => settle(0, direction, to, true));
      });
    },
    [canGo, commit, page, prepare, settle],
  );

  /* ── The gesture ──────────────────────────────────────────────────────── */
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' || settling.current || still.current) return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, summary'))
      return;
    // A touch is captured by the element it began on anyway; a pen is not,
    // and without this a sheet could be left in the air when the hand
    // wandered off the book before letting go.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* the pointer is already gone */
    }
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
      lastX: event.clientX,
      lastAt: Date.now(),
      axis: 'none',
      to: null,
      direction: 1,
    };
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;

      if (d.axis === 'none') {
        // Wait until the finger has shown which way it is going. Up and down
        // belongs to the page, not to the book.
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) < Math.abs(dy)) {
          d.axis = 'down';
          return;
        }
        d.axis = 'across';
        // Onwards is a sweep to the right: the mushaf is bound on the
        // right, so the sheet you have finished is the one on the left, and
        // you carry it over the spine to the right to reach the next page.
        // That is the hand a reader already has, and it is the way the leaf
        // swings here — it hangs on the right and sweeps right.
        const direction: 1 | -1 = dx > 0 ? 1 : -1;
        const to = direction === 1 ? page + 1 : page - 1;
        if (!canGo(to)) {
          drag.current = null;
          return;
        }
        d.direction = direction;
        d.to = to;
        void prepare(to).then((ready) => {
          if (!ready || drag.current !== d) return;
          setState({ to, direction });
        });
      }
      if (d.axis !== 'across' || d.to === null) return;

      const width = stageRef.current?.getBoundingClientRect().width || 1;
      place(clamp((d.direction === 1 ? dx : -dx) / width), d.direction);
      d.lastX = event.clientX;
      d.lastAt = Date.now();
    },
    [canGo, page, place, prepare],
  );

  const end = useCallback(
    (event: React.PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      drag.current = null;
      if (d.axis !== 'across' || d.to === null) {
        setState({ to: null, direction: 1 });
        return;
      }

      const width = stageRef.current?.getBoundingClientRect().width || 1;
      const dx = event.clientX - d.x;
      const progress = clamp((d.direction === 1 ? dx : -dx) / width);
      const elapsed = Math.max(1, Date.now() - d.lastAt);
      const speed = Math.abs(event.clientX - d.lastX) / elapsed;
      const flung = speed > COMMIT_SPEED && progress > 0.08;
      settle(progress, d.direction, d.to, progress >= COMMIT_AT || flung);
    },
    [settle],
  );

  return {
    to: state.to,
    direction: state.direction,
    turning: state.to !== null,
    stageRef,
    leafRef,
    turn,
    gesture: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}
