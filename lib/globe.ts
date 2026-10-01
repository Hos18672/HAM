import type { Coordinates } from './qibla';
import type { Point } from './world-outline';

/**
 * An orthographic globe: the earth as it is seen from far away, which is the
 * only projection on which the qibla is a straight-looking thing.
 *
 * The direction of prayer is the initial bearing of a great circle, and a
 * great circle is a straight line on no flat map at all — on Mercator the
 * line from Vienna to Mecca bends visibly south, which is precisely the
 * misunderstanding a qibla map exists to prevent. On a globe the shortest
 * path is what it looks like: an arc across the face of the earth.
 *
 * Everything here is pure arithmetic on the unit sphere, so it runs on the
 * server, in the browser, and in a test.
 */

const DEG = Math.PI / 180;

/** A point of the sphere in the frame where the map's centre is towards the
 *  viewer: `x` right, `y` up, `z` towards the eye. Behind the globe if z < 0. */
export interface Projected {
  x: number;
  y: number;
  z: number;
}

export function project(centre: Coordinates, lon: number, lat: number): Projected {
  const lat0 = centre.latitude * DEG;
  const phi = lat * DEG;
  const delta = (lon - centre.longitude) * DEG;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosDelta = Math.cos(delta);

  return {
    x: cosPhi * Math.sin(delta),
    y: Math.cos(lat0) * sinPhi - Math.sin(lat0) * cosPhi * cosDelta,
    z: Math.sin(lat0) * sinPhi + Math.cos(lat0) * cosPhi * cosDelta,
  };
}

/** The point of the great circle from `a` to `b` at fraction `t`. */
export function along(a: Coordinates, b: Coordinates, t: number): Point {
  const phi1 = a.latitude * DEG;
  const lam1 = a.longitude * DEG;
  const phi2 = b.latitude * DEG;
  const lam2 = b.longitude * DEG;

  const d =
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin((phi2 - phi1) / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin((lam2 - lam1) / 2) ** 2,
        ),
      ),
    );
  if (d === 0) return [a.longitude, a.latitude];

  // Spherical interpolation. Straight interpolation of the angles would bend
  // away from the great circle, which is the one thing this must not do.
  const p = Math.sin((1 - t) * d) / Math.sin(d);
  const q = Math.sin(t * d) / Math.sin(d);
  const x = p * Math.cos(phi1) * Math.cos(lam1) + q * Math.cos(phi2) * Math.cos(lam2);
  const y = p * Math.cos(phi1) * Math.sin(lam1) + q * Math.cos(phi2) * Math.sin(lam2);
  const z = p * Math.sin(phi1) + q * Math.sin(phi2);

  return [Math.atan2(y, x) / DEG, Math.atan2(z, Math.hypot(x, y)) / DEG];
}

/** The great circle from `a` to `b`, as points to draw through. */
export function greatCircle(a: Coordinates, b: Coordinates, steps = 96): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => along(a, b, i / steps));
}

/** A parallel of latitude, as points to draw through. */
export function parallel(lat: number, steps = 72): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => [-180 + (360 * i) / steps, lat] as Point);
}

/** A meridian of longitude, from pole to pole. */
export function meridian(lon: number, steps = 36): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => [lon, -90 + (180 * i) / steps] as Point);
}

/* ─── Drawing ────────────────────────────────────────────────────────────
   Screen coordinates put the globe's centre at (0, 0) with y downwards, as
   SVG has it, and the caller places it. */

interface Screen {
  sx: number;
  sy: number;
  z: number;
}

const toScreen = (p: Projected, radius: number): Screen => ({
  sx: p.x * radius,
  sy: -p.y * radius,
  z: p.z,
});

/**
 * Where a segment crosses the horizon, as a point of the rim.
 *
 * Between two neighbours either side of it, the crossing is found by
 * interpolating the two positions in space and pushing the result back out
 * to the sphere. A hundredth of a degree apart, the difference between that
 * and the true great-circle crossing is far below a pixel.
 */
function horizon(a: Projected, b: Projected, radius: number): Screen {
  const t = a.z / (a.z - b.z);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const length = Math.hypot(x, y) || 1;
  return { sx: (x / length) * radius, sy: (-y / length) * radius, z: 0 };
}

const angleOf = (p: Screen) => Math.atan2(p.sy, p.sx);
const TWO_PI = Math.PI * 2;
const wrap = (a: number) => ((a % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * An open path — a border, a graticule line, the qibla arc — as SVG, with
 * the parts behind the globe left out and each visible run started afresh.
 */
export function openPath(points: readonly Point[], centre: Coordinates, radius: number): string {
  const projected = points.map(([lon, lat]) => project(centre, lon, lat));
  let d = '';
  let drawing = false;

  for (let i = 0; i < projected.length; i += 1) {
    const here = projected[i]!;
    if (here.z >= 0) {
      const { sx, sy } = toScreen(here, radius);
      if (!drawing) {
        // Begin at the rim rather than in mid-air where the line comes
        // round from behind.
        const before = projected[i - 1];
        const entry = before ? horizon(here, before, radius) : null;
        d += entry
          ? `M${round(entry.sx)} ${round(entry.sy)}L${round(sx)} ${round(sy)}`
          : `M${round(sx)} ${round(sy)}`;
        drawing = true;
      } else {
        d += `L${round(sx)} ${round(sy)}`;
      }
    } else if (drawing) {
      const exit = horizon(projected[i - 1]!, here, radius);
      d += `L${round(exit.sx)} ${round(exit.sy)}`;
      drawing = false;
    }
  }
  return d;
}

/**
 * A closed ring — a coastline — as SVG, cut at the horizon and closed along
 * the rim.
 *
 * Closing a cut ring with a straight chord is the obvious thing and it is
 * wrong: a continent that reaches round the limb gets a straight line drawn
 * across the face of the globe. So each gap is closed with an arc of the rim
 * itself, taken in whichever direction the hidden part of the ring actually
 * goes — read off the projection of its middle, which still has a bearing
 * even from behind.
 */
export function ringPath(points: readonly Point[], centre: Coordinates, radius: number): string {
  const projected = points.map(([lon, lat]) => project(centre, lon, lat));
  const count = projected.length;
  if (count < 3) return '';

  const visible = projected.map((p) => p.z >= 0);
  if (visible.every((v) => !v)) return '';
  if (visible.every((v) => v)) {
    return (
      projected
        .map((p, i) => {
          const { sx, sy } = toScreen(p, radius);
          return `${i === 0 ? 'M' : 'L'}${round(sx)} ${round(sy)}`;
        })
        .join('') + 'Z'
    );
  }

  // Start at the first point that comes into view, so the runs come out in
  // order and the last gap closes back onto the first.
  let start = 0;
  while (!(visible[start] && !visible[(start - 1 + count) % count])) start += 1;

  const runs: { points: Screen[]; hiddenMid: Screen }[] = [];
  let i = 0;
  while (i < count) {
    const at = (start + i) % count;
    if (!visible[at]) {
      i += 1;
      continue;
    }
    const previous = projected[(at - 1 + count) % count]!;
    const run: Screen[] = [horizon(projected[at]!, previous, radius)];
    let j = i;
    while (j < count && visible[(start + j) % count]) {
      run.push(toScreen(projected[(start + j) % count]!, radius));
      j += 1;
    }
    const lastVisible = (start + j - 1) % count;
    const next = projected[(lastVisible + 1) % count]!;
    run.push(horizon(projected[lastVisible]!, next, radius));

    // The middle of the hidden stretch that follows, for its direction.
    let hidden = j;
    while (hidden < count && !visible[(start + hidden) % count]) hidden += 1;
    const mid = projected[(start + Math.floor((j + hidden) / 2)) % count]!;

    runs.push({ points: run, hiddenMid: toScreen(mid, radius) });
    i = hidden;
  }

  let d = '';
  for (let r = 0; r < runs.length; r += 1) {
    const run = runs[r]!;
    d += run.points.map((p, k) => `${k === 0 ? 'M' : 'L'}${round(p.sx)} ${round(p.sy)}`).join('');

    const exit = run.points[run.points.length - 1]!;
    const entry = runs[(r + 1) % runs.length]!.points[0]!;
    const from = angleOf(exit);
    const forward = wrap(angleOf(entry) - from);
    const toMid = wrap(angleOf(run.hiddenMid) - from);
    // SVG's positive sweep is the direction of increasing angle in a
    // y-downwards system, which is the way `forward` measures.
    const sweep = toMid <= forward ? 1 : 0;
    const travelled = sweep === 1 ? forward : TWO_PI - forward;
    const large = travelled > Math.PI ? 1 : 0;
    d += `A${round(radius)} ${round(radius)} 0 ${large} ${sweep} ${round(entry.sx)} ${round(entry.sy)}`;
  }
  return `${d}Z`;
}

/** Two decimals is a hundredth of a pixel, and keeps the markup small. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Where a point lands on screen, and whether it can be seen at all. */
export function placeOf(
  centre: Coordinates,
  place: Coordinates,
  radius: number,
): { sx: number; sy: number; visible: boolean } {
  const p = project(centre, place.longitude, place.latitude);
  const { sx, sy } = toScreen(p, radius);
  return { sx, sy, visible: p.z >= 0 };
}
