'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react/dist/ssr';

/**
 * The parts both readers are built from — the Quran's and the du'a's — so
 * that somebody who has learnt one has learnt the other: the bottom sheet,
 * the popover, the switch, the segmented choice, the star that numbers a
 * verse, the equaliser and the toast.
 */

/* ─── Mounting ─────────────────────────────────────────────────────────── */

/** Into the body: the site reveals each page with a transform, and a
 *  transformed ancestor would be the containing block for anything fixed. */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

/**
 * Kept in the page while it animates out. `mounted` says whether to render
 * at all, `shown` whether it is in its open state; the second follows the
 * first by a frame so the transition has something to start from.
 */
export function usePresence(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(timer);
  }, [open, ms]);
  return { mounted, shown };
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus moves in on open, stays inside while open, and goes back on close. */
function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, trap: boolean) {
  useEffect(() => {
    if (!active) return;
    const before = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
    first?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (!trap || event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const head = items[0]!;
      const tail = items[items.length - 1]!;
      if (event.shiftKey && (document.activeElement === head || document.activeElement === panel)) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [ref, active, trap]);
}

/* ─── The bottom sheet ─────────────────────────────────────────────────── */

const SHEET_MS = 450;

export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const { mounted, shown } = usePresence(open, SHEET_MS);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panel, open && mounted, true);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const body = document.body.style;
    const was = body.overflow;
    body.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      body.overflow = was;
    };
  }, [open, onClose]);

  // Pulled down by the grabber or the head, it follows the finger and goes
  // if it was pulled far enough or flicked; otherwise it springs back.
  const drag = useRef<{ y: number; at: number; id: number } | null>(null);
  const [pull, setPull] = useState(0);
  const onPointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button, a, input')) return;
    drag.current = { y: event.clientY, at: Date.now(), id: event.pointerId };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (drag.current?.id !== event.pointerId) return;
    setPull(Math.max(0, event.clientY - drag.current.y));
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dy = event.clientY - start.y;
    const fast = dy / Math.max(1, Date.now() - start.at) > 0.6;
    setPull(0);
    if (dy > 110 || (fast && dy > 30)) onClose();
  };

  if (!mounted) return null;
  return (
    <Portal>
      <div className="rd-sheet-root" data-state={shown ? 'open' : 'closed'}>
        <div className="rd-backdrop" onClick={onClose} aria-hidden="true" />
        <div
          ref={panel}
          className={`rd-sheet ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={pull ? { transform: `translateY(${pull}px)`, transition: 'none' } : undefined}
        >
          <div
            className="rd-sheet-head"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null;
              setPull(0);
            }}
          >
            <span className="rd-grabber" aria-hidden="true" />
            <div className="rd-sheet-title" id={titleId}>
              {title}
            </div>
            <button
              type="button"
              className="rd-round rd-sheet-x"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <X size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className="rd-sheet-body">{children}</div>
        </div>
      </div>
    </Portal>
  );
}

/* ─── The popover ──────────────────────────────────────────────────────── */

export function Popover({
  open,
  onClose,
  label,
  anchor,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  /** The button that opens it: a press there is not a press outside. */
  anchor: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) {
  const { mounted, shown } = usePresence(open, 300);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open && mounted, false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchor]);

  if (!mounted) return null;
  return (
    <div
      ref={panel}
      className={`rd-pop ${className}`}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      data-state={shown ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
}

/* ─── Controls ─────────────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  icon,
}: {
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="rd-row rd-toggle"
      onClick={onChange}
    >
      {icon ? <span className="rd-row-icon">{icon}</span> : null}
      <span className="rd-row-text">
        <span className="rd-row-label">{label}</span>
        {hint ? <span className="rd-row-hint">{hint}</span> : null}
      </span>
      <span className="rd-switch" aria-hidden="true">
        <span className="rd-knob" />
      </span>
    </button>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const at = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div
      className="rd-seg"
      role="group"
      aria-label={label}
      style={{ ['--n' as string]: options.length, ['--at' as string]: at }}
    >
      <span className="rd-seg-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A− [bar] A+, for the size of the Arabic. */
export function SizeControl({
  value,
  min,
  max,
  onSmaller,
  onLarger,
  label,
  smallerLabel,
  largerLabel,
  readout,
}: {
  value: number;
  min: number;
  max: number;
  onSmaller: () => void;
  onLarger: () => void;
  label: string;
  smallerLabel: string;
  largerLabel: string;
  readout: string;
}) {
  return (
    <div className="rd-size" role="group" aria-label={label}>
      <button
        type="button"
        className="rd-round"
        onClick={onSmaller}
        disabled={value <= min}
        aria-label={smallerLabel}
      >
        <span aria-hidden="true">A−</span>
      </button>
      <span className="rd-size-bar" aria-hidden="true">
        <i style={{ inlineSize: `${((value - min) / (max - min)) * 100}%` }} />
      </span>
      <span className="rd-size-readout tabular" aria-live="polite">
        {readout}
      </span>
      <button
        type="button"
        className="rd-round"
        onClick={onLarger}
        disabled={value >= max}
        aria-label={largerLabel}
      >
        <span aria-hidden="true" className="rd-size-big">
          A+
        </span>
      </button>
    </div>
  );
}

/* ─── The verse's star ─────────────────────────────────────────────────── */

/**
 * An eight-pointed star — two rounded squares, one turned by 45° — with a
 * gold line round it and the number in it. Filled green for the verse that
 * is playing. A button when it plays something, a plain mark otherwise.
 */
export function Medallion({
  label,
  active,
  onClick,
  ariaLabel,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const inner = (
    <>
      <span className="rd-medal-fill" aria-hidden="true" />
      <span className="rd-medal-n tabular" aria-hidden={ariaLabel ? true : undefined}>
        {label}
      </span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className="rd-medal"
      data-active={active || undefined}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {inner}
    </button>
  ) : (
    <span className="rd-medal" data-active={active || undefined}>
      {inner}
    </span>
  );
}

export function Equaliser({ paused }: { paused?: boolean }) {
  return (
    <span className="rd-eq" data-paused={paused || undefined} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/* ─── The toast ────────────────────────────────────────────────────────── */

export function useToast(ms = 1800) {
  const [message, setMessage] = useState<string | null>(null);
  const [seq, setSeq] = useState(0);
  const timer = useRef(0);
  const show = useCallback(
    (text: string) => {
      window.clearTimeout(timer.current);
      setMessage(text);
      setSeq((n) => n + 1);
      timer.current = window.setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = (
    <Portal>
      <div className="rd-toast-wrap" role="status" aria-live="polite">
        {message ? (
          <p key={seq} className="rd-toast">
            {message}
          </p>
        ) : null}
      </div>
    </Portal>
  );
  return [node, show] as const;
}

/** Text to the clipboard, falling back to a hidden field where it is refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand('copy');
      field.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The system share sheet where there is one, the clipboard where not. */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ url, title });
      return 'shared';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return 'shared';
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}

/** The swipe across the content: far, fast and mostly sideways. */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const from = useRef<{ x: number; y: number; at: number; id: number } | null>(null);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) {
      from.current = null;
      return;
    }
    from.current = { x: event.clientX, y: event.clientY, at: Date.now(), id: event.pointerId };
  }, []);
  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const start = from.current;
      from.current = null;
      if (!start || start.id !== event.pointerId || Date.now() - start.at > 900) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      if (window.getSelection()?.toString()) return;
      if (dx < 0) onLeft();
      else onRight();
    },
    [onLeft, onRight],
  );
  const onPointerCancel = useCallback(() => {
    from.current = null;
  }, []);
  return { onPointerDown, onPointerUp, onPointerCancel };
}
