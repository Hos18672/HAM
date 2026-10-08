'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowUpRight,
  CaretDown,
  Check,
  Circle,
  Cursor,
  DotsSixVertical,
  Eraser,
  Highlighter,
  LineSegment,
  Minus,
  Palette,
  PencilSimple,
  Rectangle,
  Square,
  Star,
  Trash,
  Triangle,
} from '@phosphor-icons/react/dist/ssr';
import { readJson, writeJson } from './storage';

/**
 * Ink for the presentation: a pen, a highlighter and shapes drawn straight
 * over the words, for teaching. What is drawn belongs to the slide it was
 * drawn on — turning away and back brings it back — and lasts as long as
 * the presentation is open. Only the chosen tool, colour and width are kept.
 */

export type InkTool =
  | 'select'
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'square'
  | 'ellipse'
  | 'circle'
  | 'triangle'
  | 'star';

type Point = [number, number];
type Mark = {
  tool: Exclude<InkTool, 'eraser' | 'select'>;
  color: string;
  size: number;
  points: Point[];
};
type Page = { marks: Mark[]; undo: Mark[][]; redo: Mark[][] };

const PREFS_KEY = 'ham:present:ink';

export const INK_COLORS = [
  ['gold', '#c8a45d'],
  ['white', '#f7f3e8'],
  ['red', '#f05252'],
  ['yellow', '#fde047'],
  ['green', '#4ade80'],
  ['blue', '#60a5fa'],
  ['pink', '#f472b6'],
  ['black', '#111111'],
] as const;

const FREEHAND = new Set<InkTool>(['pen', 'marker']);

function Ellipse(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 256 256" aria-hidden="true">
      <ellipse
        cx="128"
        cy="128"
        rx="104"
        ry="68"
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
      />
    </svg>
  );
}

const TOOLS: [InkTool, (size: number) => ReactNode][] = [
  ['select', (s) => <Cursor size={s} weight="duotone" aria-hidden="true" />],
  ['pen', (s) => <PencilSimple size={s} weight="duotone" aria-hidden="true" />],
  ['marker', (s) => <Highlighter size={s} weight="duotone" aria-hidden="true" />],
  ['eraser', (s) => <Eraser size={s} weight="duotone" aria-hidden="true" />],
  ['line', (s) => <LineSegment size={s} weight="bold" aria-hidden="true" />],
  ['arrow', (s) => <ArrowUpRight size={s} weight="bold" aria-hidden="true" />],
  ['rect', (s) => <Rectangle size={s} weight="bold" aria-hidden="true" />],
  ['square', (s) => <Square size={s} weight="bold" aria-hidden="true" />],
  ['ellipse', (s) => <Ellipse size={s} />],
  ['circle', (s) => <Circle size={s} weight="bold" aria-hidden="true" />],
  ['triangle', (s) => <Triangle size={s} weight="bold" aria-hidden="true" />],
  ['star', (s) => <Star size={s} weight="bold" aria-hidden="true" />],
];

/** The box a shape is drawn in, made even for the square and the circle. */
function box(mark: Mark): { x: number; y: number; w: number; h: number } {
  const [a, b] = [mark.points[0], mark.points[mark.points.length - 1]];
  let w = b[0] - a[0];
  let h = b[1] - a[1];
  if (mark.tool === 'square' || mark.tool === 'circle') {
    const side = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * side;
    h = Math.sign(h || 1) * side;
  }
  return { x: a[0], y: a[1], w, h };
}

function draw(ctx: CanvasRenderingContext2D, mark: Mark) {
  const { points, color, tool } = mark;
  if (!points.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = tool === 'marker' ? mark.size * 3 : mark.size;
  if (tool === 'marker') ctx.globalAlpha = 0.35;
  ctx.beginPath();

  if (FREEHAND.has(tool)) {
    const [first] = points;
    if (points.length < 3) {
      // A tap is a dot.
      const last = points[points.length - 1];
      ctx.moveTo(first[0], first[1]);
      ctx.lineTo(last[0] + 0.01, last[1]);
    } else {
      // Through the midpoints, so the line runs smooth rather than in steps.
      ctx.moveTo(first[0], first[1]);
      for (let i = 1; i < points.length - 1; i++) {
        const [x, y] = points[i];
        const [nx, ny] = points[i + 1];
        ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last[0], last[1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  const a = points[0];
  const b = points[points.length - 1];
  const { x, y, w, h } = box(mark);
  switch (tool) {
    case 'line':
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      break;
    case 'arrow': {
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const head = Math.max(14, mark.size * 3.2);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.moveTo(
        b[0] - head * Math.cos(angle - Math.PI / 6),
        b[1] - head * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(
        b[0] - head * Math.cos(angle + Math.PI / 6),
        b[1] - head * Math.sin(angle + Math.PI / 6),
      );
      break;
    }
    case 'rect':
    case 'square':
      ctx.rect(x, y, w, h);
      break;
    case 'ellipse':
    case 'circle':
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case 'star': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 0.4 : 1;
        const px = cx + (Math.cos(angle) * r * w) / 2;
        const py = cy + (Math.sin(angle) * r * Math.abs(h)) / 2;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Whether a point lies within reach of what a mark drew. */
function touches(mark: Mark, p: Point, reach: number): boolean {
  const r = reach + (mark.tool === 'marker' ? mark.size * 1.5 : mark.size / 2);
  const near = (a: Point, b: Point) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)) <= r;
  };
  const path = outline(mark);
  if (path.length === 1) return Math.hypot(p[0] - path[0][0], p[1] - path[0][1]) <= r;
  for (let i = 1; i < path.length; i++) {
    if (near(path[i - 1], path[i])) return true;
  }
  return false;
}

/** The marks as runs of straight segments, for the eraser. */
function outline(mark: Mark): Point[] {
  if (FREEHAND.has(mark.tool)) return mark.points;
  if (mark.tool === 'line' || mark.tool === 'arrow')
    return [mark.points[0], mark.points[mark.points.length - 1]];
  const { x, y, w, h } = box(mark);
  if (mark.tool === 'rect' || mark.tool === 'square')
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ];
  if (mark.tool === 'triangle')
    return [
      [x + w / 2, y],
      [x + w, y + h],
      [x, y + h],
      [x + w / 2, y],
    ];
  // Ellipse, circle and star: near enough as a ring of points.
  const ring: Point[] = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    ring.push([x + w / 2 + (Math.cos(angle) * w) / 2, y + h / 2 + (Math.sin(angle) * h) / 2]);
  }
  return ring;
}

const BOX_SHAPES = new Set<InkTool>(['rect', 'square', 'ellipse', 'circle', 'triangle', 'star']);
const EVEN = new Set<InkTool>(['square', 'circle']);

type Bounds = { x0: number; y0: number; x1: number; y1: number };

/** A box shape held as its two corners, so moving and stretching it is plain. */
function settle(mark: Mark): Mark {
  if (!BOX_SHAPES.has(mark.tool)) return mark;
  const { x, y, w, h } = box(mark);
  return {
    ...mark,
    points: [
      [Math.min(x, x + w), Math.min(y, y + h)],
      [Math.max(x, x + w), Math.max(y, y + h)],
    ],
  };
}

function bounds(mark: Mark): Bounds {
  const points = FREEHAND.has(mark.tool) ? mark.points : settle(mark).points;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** The frame drawn around a chosen mark: its bounds with room for the stroke. */
function frame(mark: Mark): Bounds {
  const b = bounds(mark);
  const pad = (mark.tool === 'marker' ? mark.size * 1.5 : mark.size / 2) + 8;
  return { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad };
}

/** The four corners of a frame, clockwise from the top left. */
function corners(b: Bounds): Point[] {
  return [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x1, b.y1],
    [b.x0, b.y1],
  ];
}

const HANDLE = 22; // how near a finger must come to a corner to take it

function handleAt(mark: Mark, p: Point): number {
  return corners(frame(mark)).findIndex((c) => Math.hypot(p[0] - c[0], p[1] - c[1]) <= HANDLE);
}

function inside(b: Bounds, p: Point) {
  return p[0] >= b.x0 && p[0] <= b.x1 && p[1] >= b.y0 && p[1] <= b.y1;
}

function paintSelection(ctx: CanvasRenderingContext2D, mark: Mark) {
  const b = frame(mark);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(247, 243, 232, 0.85)';
  ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.setLineDash([]);
  for (const [x, y] of corners(b)) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f3e8';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c8a45d';
    ctx.stroke();
  }
  ctx.restore();
}

type Edit = {
  kind: 'move' | 'resize';
  index: number;
  start: Point;
  base: Mark;
  before: Mark[];
  /** For a resize: the corner held still, the one taken, and where the finger sat on it. */
  anchor?: Point;
  corner?: Point;
  grip?: Point;
  changed: boolean;
};

function moved(mark: Mark, dx: number, dy: number): Mark {
  return { ...mark, points: mark.points.map(([x, y]): Point => [x + dx, y + dy]) };
}

function stretched(edit: Edit, p: Point): Mark {
  const { base, anchor, corner, grip } = edit;
  const [ax, ay] = anchor!;
  const tx = p[0] - grip![0];
  const ty = p[1] - grip![1];
  const spanX = corner![0] - ax;
  const spanY = corner![1] - ay;
  let sx = Math.abs(spanX) < 1 ? 1 : (tx - ax) / spanX;
  let sy = Math.abs(spanY) < 1 ? 1 : (ty - ay) / spanY;
  if (EVEN.has(base.tool)) {
    const s = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx || 1) * s;
    sy = Math.sign(sy || 1) * s;
  }
  // Not so small it can no longer be found again.
  const min = 0.05;
  if (Math.abs(sx) < min) sx = Math.sign(sx || 1) * min;
  if (Math.abs(sy) < min) sy = Math.sign(sy || 1) * min;
  return {
    ...base,
    points: base.points.map(([x, y]): Point => [ax + (x - ax) * sx, ay + (y - ay) * sy]),
  };
}

type Prefs = { tool: InkTool; color: string; size: number };
const DEFAULTS: Prefs = { tool: 'pen', color: '#c8a45d', size: 6 };
type Panel = 'tool' | 'color' | 'size' | null;

/** The drawing layer, and while drawing, its tools. */
export function Ink({
  active,
  pageKey,
  onDone,
}: {
  active: boolean;
  /** One set of drawings for each slide. */
  pageKey: string;
  onDone: () => void;
}) {
  const t = useTranslations('ink');
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const pages = useRef(new Map<string, Page>());
  const current = useRef<Mark | null>(null);
  const selected = useRef<number | null>(null);
  const edit = useRef<Edit | null>(null);
  const restyled = useRef<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [panel, setPanel] = useState<Panel>(null);
  const [below, setBelow] = useState(false);
  const [mini, setMini] = useState(false);
  // Where the bar was dragged to, within the presentation; at first it rests at the foot.
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  // Bumped whenever a page changes, so the buttons know what can be undone.
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  useEffect(() => {
    const kept = readJson<Partial<Prefs>>(PREFS_KEY) ?? {};
    setPrefs((was) => ({
      tool: TOOLS.some(([tool]) => tool === kept.tool) ? (kept.tool as InkTool) : was.tool,
      color:
        typeof kept.color === 'string' && /^#[0-9a-f]{6}$/i.test(kept.color)
          ? kept.color
          : was.color,
      size: typeof kept.size === 'number' ? Math.min(48, Math.max(2, kept.size)) : was.size,
    }));
  }, []);

  const page = useCallback((): Page => {
    let found = pages.current.get(pageKey);
    if (!found) {
      found = { marks: [], undo: [], redo: [] };
      pages.current.set(pageKey, found);
    }
    return found;
  }, [pageKey]);

  const paint = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    const { marks } = page();
    for (const mark of marks) draw(ctx, mark);
    if (current.current) draw(ctx, current.current);
    const chosen = selected.current === null ? undefined : marks[selected.current];
    if (active && chosen) paintSelection(ctx, chosen);
  }, [page, active]);

  const select = useCallback(
    (index: number | null) => {
      restyled.current = null;
      selected.current = index;
      bump();
      paint();
    },
    [paint],
  );

  // Sharp on every screen, and redrawn when the window changes size.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = el.getBoundingClientRect();
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);
      paint();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paint]);

  const commit = useCallback(
    (marks: Mark[]) => {
      restyled.current = null;
      const p = page();
      p.undo.push(p.marks);
      p.redo = [];
      p.marks = marks;
      bump();
      paint();
    },
    [page, paint],
  );

  const undo = useCallback(() => {
    const p = page();
    const was = p.undo.pop();
    if (!was) return;
    p.redo.push(p.marks);
    p.marks = was;
    selected.current = null;
    bump();
    paint();
  }, [page, paint]);

  const redo = useCallback(() => {
    const p = page();
    const next = p.redo.pop();
    if (!next) return;
    p.undo.push(p.marks);
    p.marks = next;
    selected.current = null;
    bump();
    paint();
  }, [page, paint]);

  const clear = () => {
    selected.current = null;
    if (page().marks.length) commit([]);
    setPanel(null);
  };

  const remove = useCallback(() => {
    const index = selected.current;
    if (index === null) return;
    selected.current = null;
    commit(page().marks.filter((_, i) => i !== index));
  }, [commit, page]);

  const choose = (next: Partial<Prefs>) => {
    setPrefs((was) => {
      const prefs = { ...was, ...next };
      writeJson(PREFS_KEY, prefs);
      return prefs;
    });
    // A new colour or width also goes to what is chosen.
    const index = selected.current;
    const mark = index === null ? undefined : page().marks[index];
    if (mark && (next.color || next.size)) {
      const marks = page().marks.slice();
      marks[index!] = { ...mark, ...next, tool: mark.tool, points: mark.points };
      // Sliding the width is one change, not one for every step.
      if (restyled.current === marks[index!].tool + index && next.size) {
        page().marks = marks;
        paint();
      } else {
        commit(marks);
        restyled.current = next.size ? mark.tool + index : null;
      }
    }
    if (
      next.tool &&
      next.tool !== 'select' &&
      !BOX_SHAPES.has(next.tool) &&
      next.tool !== 'line' &&
      next.tool !== 'arrow'
    ) {
      select(null);
    }
  };

  useEffect(() => {
    if (!active) {
      setPanel(null);
      selected.current = null;
      paint();
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected.current !== null) {
        remove();
      } else if (!(event.ctrlKey || event.metaKey)) {
        return;
      } else {
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) undo();
        else if (key === 'y' || (key === 'z' && event.shiftKey)) redo();
        else return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, undo, redo, remove, paint]);

  const at = (event: { clientX: number; clientY: number }): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  const erasing = useRef<Mark[] | null>(null);
  const erase = (p: Point) => {
    const left = erasing.current!.filter((mark) => !touches(mark, p, prefs.size));
    if (left.length !== erasing.current!.length) {
      erasing.current = left;
      page().marks = left;
      paint();
    }
  };

  /** Takes hold of a mark to move it, or of one of its corners to stretch it. */
  const grab = (index: number, p: Point, corner: number) => {
    const before = page().marks;
    const base = settle(before[index]);
    if (corner < 0) {
      edit.current = { kind: 'move', index, start: p, base, before, changed: false };
      return;
    }
    const raw = corners(bounds(base));
    edit.current = {
      kind: 'resize',
      index,
      start: p,
      base,
      before,
      anchor: raw[(corner + 2) % 4],
      corner: raw[corner],
      grip: [p[0] - raw[corner][0], p[1] - raw[corner][1]],
      changed: false,
    };
  };

  /** What the finger landed on, topmost first. */
  const hit = (p: Point, loose: boolean): number => {
    const { marks } = page();
    for (let i = marks.length - 1; i >= 0; i--) if (touches(marks[i], p, 10)) return i;
    if (loose) for (let i = marks.length - 1; i >= 0; i--) if (inside(frame(marks[i]), p)) return i;
    return -1;
  };

  const onDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    setPanel(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = at(event);
    const { marks } = page();
    const tool = prefs.tool;

    if (tool === 'eraser') {
      selected.current = null;
      const was = marks;
      erasing.current = was;
      page().undo.push(was);
      page().redo = [];
      erase(p);
      return;
    }

    // What is chosen can be taken by a corner, or by itself to move it.
    const index = selected.current;
    const chosen = index === null ? undefined : marks[index];
    if (chosen && !FREEHAND.has(tool)) {
      const corner = handleAt(chosen, p);
      if (corner >= 0) return grab(index!, p, corner);
      if (tool === 'select' ? inside(frame(chosen), p) : touches(chosen, p, 10))
        return grab(index!, p, -1);
    }

    if (tool === 'select') {
      const found = hit(p, true);
      selected.current = found < 0 ? null : found;
      if (found >= 0) grab(found, p, -1);
      bump();
      paint();
      return;
    }

    selected.current = null;
    current.current = { tool, color: prefs.color, size: prefs.size, points: [p] };
    paint();
  };

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (erasing.current) {
      erase(at(event));
      return;
    }
    const e = edit.current;
    if (e) {
      const p = at(event);
      if (!e.changed && Math.hypot(p[0] - e.start[0], p[1] - e.start[1]) < 3) return;
      e.changed = true;
      const mark =
        e.kind === 'move' ? moved(e.base, p[0] - e.start[0], p[1] - e.start[1]) : stretched(e, p);
      const marks = e.before.slice();
      marks[e.index] = mark;
      page().marks = marks;
      paint();
      return;
    }
    const mark = current.current;
    if (!mark) {
      // Show what a press would do here.
      const el = canvas.current;
      if (!el || !active) return;
      const index = selected.current;
      const chosen = index === null ? undefined : page().marks[index];
      const p = at(event);
      let cursor = '';
      if (chosen && !FREEHAND.has(prefs.tool) && prefs.tool !== 'eraser') {
        const corner = handleAt(chosen, p);
        if (corner >= 0) cursor = corner % 2 ? 'nesw-resize' : 'nwse-resize';
        else if (prefs.tool === 'select' ? inside(frame(chosen), p) : touches(chosen, p, 10))
          cursor = 'move';
      }
      if (!cursor && prefs.tool === 'select' && hit(p, true) >= 0) cursor = 'pointer';
      el.style.cursor = cursor;
      return;
    }
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    const points = events.map(at);
    if (FREEHAND.has(mark.tool)) mark.points.push(...points);
    else mark.points = [mark.points[0], points[points.length - 1]];
    paint();
  };

  const onUp = () => {
    if (erasing.current) {
      const p = page();
      // An eraser that touched nothing leaves nothing to undo.
      if (p.undo[p.undo.length - 1] === erasing.current) p.undo.pop();
      erasing.current = null;
      bump();
      return;
    }
    const e = edit.current;
    if (e) {
      edit.current = null;
      const p = page();
      if (e.changed) {
        p.undo.push(e.before);
        p.redo = [];
      } else {
        p.marks = e.before;
      }
      bump();
      paint();
      return;
    }
    const mark = current.current;
    current.current = null;
    if (!mark) return;
    const [a] = mark.points;
    const b = mark.points[mark.points.length - 1];
    // A shape needs some extent; a slip of the finger is not one.
    if (!FREEHAND.has(mark.tool) && Math.hypot(b[0] - a[0], b[1] - a[1]) < 4) {
      paint();
      return;
    }
    const marks = [...page().marks, FREEHAND.has(mark.tool) ? mark : settle(mark)];
    // A shape just drawn stays chosen, ready to be moved or stretched.
    selected.current = FREEHAND.has(mark.tool) ? null : marks.length - 1;
    commit(marks);
  };

  // A different slide: its own drawings.
  useEffect(() => {
    current.current = null;
    erasing.current = null;
    edit.current = null;
    selected.current = null;
    bump();
    paint();
  }, [pageKey, paint]);

  /* ── The bar: dragged by its grip, folded into one button, kept in view ── */

  const keepInView = useCallback((x: number, y: number) => {
    const el = bar.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    const margin = 8;
    return {
      x: Math.min(Math.max(margin, x), parent.clientWidth - el.offsetWidth - margin),
      y: Math.min(Math.max(margin, y), parent.clientHeight - el.offsetHeight - margin),
    };
  }, []);

  useLayoutEffect(() => {
    if (!spot) return;
    const fixed = keepInView(spot.x, spot.y);
    if (fixed.x !== spot.x || fixed.y !== spot.y) setSpot(fixed);
  }, [spot, mini, keepInView]);
  useEffect(() => {
    const onResize = () => setSpot((was) => (was ? keepInView(was.x, was.y) : was));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [keepInView]);

  const dragging = useRef<{ dx: number; dy: number; sx: number; sy: number; far: boolean } | null>(
    null,
  );
  const drag = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      const el = bar.current;
      if (!el || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = {
        dx: event.clientX - el.offsetLeft,
        dy: event.clientY - el.offsetTop,
        sx: event.clientX,
        sy: event.clientY,
        far: false,
      };
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      const d = dragging.current;
      if (!d) return;
      if (!d.far && Math.hypot(event.clientX - d.sx, event.clientY - d.sy) < 5) return;
      d.far = true;
      setPanel(null);
      setSpot(keepInView(event.clientX - d.dx, event.clientY - d.dy));
    },
    onPointerUp: () => {
      setTimeout(() => (dragging.current = null));
    },
    onPointerCancel: () => {
      dragging.current = null;
    },
  };
  // A drag that ends on a button is not a press.
  const pressed = (then: () => void) => () => {
    if (dragging.current?.far) return;
    then();
  };
  const nudge = (event: React.KeyboardEvent) => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-24, 0],
      ArrowRight: [24, 0],
      ArrowUp: [0, -24],
      ArrowDown: [0, 24],
    };
    const step = steps[event.key];
    const el = bar.current;
    if (!step || !el) return;
    event.preventDefault();
    setSpot(keepInView(el.offsetLeft + step[0], el.offsetTop + step[1]));
  };

  const open = (which: Exclude<Panel, null>) => {
    if (panel === which) return setPanel(null);
    const el = bar.current;
    const parent = el?.offsetParent as HTMLElement | null;
    // Open towards the larger space.
    if (el && parent) setBelow(el.offsetTop + el.offsetHeight / 2 < parent.clientHeight / 2);
    setPanel(which);
  };

  const p = page();
  const presetColor = INK_COLORS.some(([, hex]) => hex === prefs.color);
  const toolIcon = (TOOLS.find(([tool]) => tool === prefs.tool) ?? TOOLS[1])[1];
  const chosen = active && selected.current !== null ? p.marks[selected.current] : undefined;
  const chosenFrame = chosen ? frame(chosen) : null;
  const place = spot ? { left: spot.x, top: spot.y, right: 'auto', bottom: 'auto' } : undefined;

  return (
    <>
      <canvas
        ref={canvas}
        className="rd-ink"
        data-active={active ? 'on' : 'off'}
        data-tool={prefs.tool}
        aria-hidden="true"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(event) => event.stopPropagation()}
      />
      {chosenFrame && !edit.current ? (
        <button
          type="button"
          className="rd-ink-remove"
          style={{
            left: (chosenFrame.x0 + chosenFrame.x1) / 2,
            top: chosenFrame.y0 > 56 ? chosenFrame.y0 - 46 : chosenFrame.y1 + 10,
          }}
          aria-label={t('remove')}
          title={t('remove')}
          onClick={remove}
        >
          <Trash size={18} weight="duotone" aria-hidden="true" />
        </button>
      ) : null}
      {active && mini ? (
        <button
          ref={bar as React.RefObject<HTMLButtonElement>}
          type="button"
          className="rd-ink-mini"
          style={place}
          aria-label={t('expand')}
          title={t('expand')}
          {...drag}
          onKeyDown={nudge}
          onClick={pressed(() => setMini(false))}
        >
          <Palette size={26} weight="duotone" aria-hidden="true" />
          <span className="rd-ink-mini-dot" style={{ background: prefs.color }} />
        </button>
      ) : null}
      {active && !mini ? (
        <div
          ref={bar as React.RefObject<HTMLDivElement>}
          className="rd-ink-bar"
          role="toolbar"
          aria-label={t('toolbar')}
          style={place}
        >
          <button
            type="button"
            className="rd-ink-grip"
            aria-label={t('move')}
            title={t('move')}
            {...drag}
            onKeyDown={nudge}
          >
            <DotsSixVertical size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rd-ink-btn rd-ink-pick"
            aria-label={`${t('tools')}: ${t(`tool.${prefs.tool}`)}`}
            title={t('tools')}
            aria-expanded={panel === 'tool'}
            onClick={() => open('tool')}
          >
            {toolIcon(20)}
            <CaretDown size={10} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rd-ink-btn"
            aria-label={t('color')}
            title={t('color')}
            aria-expanded={panel === 'color'}
            onClick={() => open('color')}
          >
            <span className="rd-ink-current" style={{ background: prefs.color }} />
          </button>
          <button
            type="button"
            className="rd-ink-btn"
            aria-label={`${t('size')}: ${prefs.size} px`}
            title={t('size')}
            aria-expanded={panel === 'size'}
            onClick={() => open('size')}
          >
            <span className="rd-ink-dot" aria-hidden="true">
              <i
                style={{
                  inlineSize: Math.min(22, Math.max(3, prefs.size / 2)),
                  blockSize: Math.min(22, Math.max(3, prefs.size / 2)),
                  background: prefs.color,
                }}
              />
            </span>
          </button>
          <button
            type="button"
            className="rd-ink-btn"
            aria-label={t('undo')}
            title={t('undo')}
            disabled={!p.undo.length}
            onClick={undo}
          >
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rd-ink-btn"
            aria-label={t('redo')}
            title={t('redo')}
            disabled={!p.redo.length}
            onClick={redo}
          >
            <ArrowClockwise size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rd-ink-btn"
            aria-label={t('minimize')}
            title={t('minimize')}
            onClick={() => {
              setPanel(null);
              setMini(true);
            }}
          >
            <Minus size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="rd-ink-done"
            onClick={onDone}
            aria-label={t('done')}
            title={t('done')}
          >
            <Check size={18} weight="bold" aria-hidden="true" />
          </button>

          {panel ? (
            <div className="rd-ink-panel" data-side={below ? 'below' : 'above'}>
              {panel === 'tool' ? (
                <>
                  <div className="rd-ink-tools" role="group" aria-label={t('tools')}>
                    {TOOLS.map(([tool, icon]) => (
                      <button
                        key={tool}
                        type="button"
                        className="rd-ink-btn"
                        aria-pressed={prefs.tool === tool}
                        aria-label={t(`tool.${tool}`)}
                        title={t(`tool.${tool}`)}
                        onClick={() => {
                          choose({ tool });
                          setPanel(null);
                        }}
                      >
                        {icon(20)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="rd-ink-clear"
                    disabled={!p.marks.length}
                    onClick={clear}
                  >
                    <Trash size={18} weight="duotone" aria-hidden="true" />
                    <span>{t('clear')}</span>
                  </button>
                </>
              ) : null}
              {panel === 'color' ? (
                <div className="rd-ink-colors" role="group" aria-label={t('color')}>
                  {INK_COLORS.map(([name, hex]) => (
                    <button
                      key={name}
                      type="button"
                      className="rd-ink-swatch"
                      style={{ background: hex }}
                      aria-pressed={prefs.color === hex}
                      aria-label={t(`colors.${name}`)}
                      title={t(`colors.${name}`)}
                      onClick={() => choose({ color: hex })}
                    />
                  ))}
                  <label
                    className="rd-ink-swatch rd-ink-custom"
                    data-on={presetColor ? 'off' : 'on'}
                    style={presetColor ? undefined : { background: prefs.color }}
                    title={t('customColor')}
                  >
                    <input
                      type="color"
                      value={prefs.color}
                      aria-label={t('customColor')}
                      onChange={(event) => choose({ color: event.target.value })}
                    />
                  </label>
                </div>
              ) : null}
              {panel === 'size' ? (
                <label className="rd-ink-size">
                  <span className="rd-ink-dot" aria-hidden="true">
                    <i
                      style={{
                        inlineSize: Math.min(28, prefs.size),
                        blockSize: Math.min(28, prefs.size),
                        background: prefs.color,
                      }}
                    />
                  </span>
                  <input
                    type="range"
                    min={2}
                    max={48}
                    step={1}
                    value={prefs.size}
                    aria-label={t('size')}
                    aria-valuetext={`${prefs.size} px`}
                    onChange={(event) => choose({ size: Number(event.target.value) })}
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function InkToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const t = useTranslations('ink');
  return (
    <button
      type="button"
      className="rd-present-btn"
      aria-pressed={active}
      onClick={onToggle}
      aria-label={t('toggle')}
      title={`${t('toggle')} (D)`}
    >
      <PencilSimple size={20} weight="duotone" aria-hidden="true" />
    </button>
  );
}
