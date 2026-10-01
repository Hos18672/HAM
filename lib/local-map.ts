import type { Coordinates } from './qibla';
import type { Point } from './world-outline';

/**
 * The map a person standing somewhere actually needs: their own place in the
 * middle, and the qibla a straight line out of it.
 *
 * The projection is azimuthal equidistant about the viewer. It is the one
 * projection on which, from the centre, every direction is the true initial
 * bearing of the great circle and every distance along that line is to
 * scale — which is to say it is the projection a qibla map is *for*. The
 * line to Mecca is therefore straight because it is straight, not because
 * the drawing has been tidied: on a Mercator map that same line bends well
 * south of where you must face, which is the misunderstanding this page
 * exists to prevent.
 *
 * Zoomed in it is a plan of where you are standing; zoomed out the whole
 * earth fits inside the disc, the rim being the point on the far side of the
 * world. Pure arithmetic, so it runs on the server, in the browser and in a
 * test.
 */

const DEG = Math.PI / 180;
/** Mean earth radius, km (IUGG) — as `lib/qibla` has it. */
export const EARTH_RADIUS_KM = 6371.0088;
/** Half the way round: the far side of the earth, and the rim of the map. */
export const MAX_SPAN_KM = Math.PI * EARTH_RADIUS_KM;

/** Where a point falls, seen from the centre. */
export interface Polar {
  /** Great-circle distance from the centre, kilometres. */
  distanceKm: number;
  /** Initial bearing from the centre, degrees clockwise from true north. */
  bearing: number;
}

/** A point on the drawing, in kilometres east and north of the centre. */
export interface Plan {
  /** Rightwards on a north-up map, kilometres. */
  x: number;
  /** Downwards on a north-up map (south is down), kilometres. */
  y: number;
  distanceKm: number;
}

/** The distance and true bearing from the centre to a point. */
export function polar(centre: Coordinates, lon: number, lat: number): Polar {
  const phi0 = centre.latitude * DEG;
  const phi = lat * DEG;
  const dLambda = (lon - centre.longitude) * DEG;
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosD = Math.cos(dLambda);

  // Clamped: a point exactly at the centre or the antipode otherwise leaves
  // `acos` a rounding error outside its domain and the answer is NaN.
  const cosC = Math.min(1, Math.max(-1, sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosD));
  const c = Math.acos(cosC);
  const y = Math.sin(dLambda) * cosPhi;
  const x = cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosD;
  const bearing = (Math.atan2(y, x) / DEG + 360) % 360;

  return { distanceKm: c * EARTH_RADIUS_KM, bearing };
}

/** Where to draw a point, north up, in kilometres from the centre. */
export function plan(centre: Coordinates, lon: number, lat: number): Plan {
  const { distanceKm, bearing } = polar(centre, lon, lat);
  const theta = bearing * DEG;
  return {
    x: distanceKm * Math.sin(theta),
    y: -distanceKm * Math.cos(theta),
    distanceKm,
  };
}

/** A point a given distance and bearing away, as longitude and latitude. */
export function offset(centre: Coordinates, distanceKm: number, bearing: number): Point {
  const c = distanceKm / EARTH_RADIUS_KM;
  const phi0 = centre.latitude * DEG;
  const theta = bearing * DEG;
  const phi = Math.asin(
    Math.sin(phi0) * Math.cos(c) + Math.cos(phi0) * Math.sin(c) * Math.cos(theta),
  );
  const lambda =
    centre.longitude * DEG +
    Math.atan2(
      Math.sin(theta) * Math.sin(c) * Math.cos(phi0),
      Math.cos(c) - Math.sin(phi0) * Math.sin(phi),
    );
  return [((lambda / DEG + 540) % 360) - 180, phi / DEG];
}

/**
 * A line of longitude and latitude pairs, as SVG path data.
 *
 * `scale` turns kilometres into drawing units. The line is broken wherever
 * two neighbours land far apart on the page, which happens near the rim:
 * there the two sides of the disc are both the far side of the earth, and a
 * segment joining them would be drawn straight across the middle.
 */
export function planPath(centre: Coordinates, points: readonly Point[], scale: number): string {
  const breakAt = (MAX_SPAN_KM * scale) / 2;
  let data = '';
  let previous: { sx: number; sy: number } | null = null;

  for (const [lon, lat] of points) {
    const p = plan(centre, lon, lat);
    const sx = p.x * scale;
    const sy = p.y * scale;
    const jumped = previous !== null && Math.hypot(sx - previous.sx, sy - previous.sy) > breakAt;
    data += `${previous === null || jumped ? 'M' : 'L'}${sx.toFixed(1)} ${sy.toFixed(1)}`;
    previous = { sx, sy };
  }
  return data;
}

/**
 * A round number of kilometres for a ring, at most `limit`.
 *
 * 1, 2 or 5 times a power of ten: the readings people keep in their heads,
 * and the ones that make a legend of two rings legible at a glance.
 */
export function niceDistance(limit: number): number {
  if (!(limit > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(limit));
  for (const step of [5, 2, 1]) {
    if (magnitude * step <= limit) return magnitude * step;
  }
  return magnitude / 2;
}

/**
 * The rings to draw for a view of a given radius: two of them, so the scale
 * can be read off the map without counting.
 */
export function rings(spanKm: number): number[] {
  const outer = niceDistance(spanKm * 0.92);
  const inner = niceDistance(outer / 2.5);
  return inner > 0 && inner < outer ? [inner, outer] : outer > 0 ? [outer] : [];
}
