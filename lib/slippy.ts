import type { Coordinates } from './qibla';

/**
 * Web Mercator, as every tiled street map uses it.
 *
 * The qibla is the initial bearing of a great circle, and a great circle is
 * not straight on Mercator — but the *initial* bearing is, because Mercator
 * is conformal: it preserves angles at a point. So a ray leaving the reader's
 * own position at the qibla bearing is drawn correctly as a straight line at
 * that same angle on the screen. That is the one property that makes a qibla
 * arrow on a street map honest, and it is why the line may be drawn straight
 * here while `lib/local-map` goes to the trouble of a different projection to
 * draw the whole way to Mecca.
 */

const DEG = Math.PI / 180;
/** The side of one tile, in pixels, as the tile servers cut them. */
export const TILE = 256;
/** Below this the whole world does not fill a phone; above it, no tiles. */
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 19;

/** A point in the world pixel plane at a given zoom. */
export interface WorldPoint {
  x: number;
  y: number;
}

export function project({ latitude, longitude }: Coordinates, zoom: number): WorldPoint {
  const scale = TILE * 2 ** zoom;
  const phi = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * DEG;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * scale,
  };
}

export function unproject({ x, y }: WorldPoint, zoom: number): Coordinates {
  const scale = TILE * 2 ** zoom;
  const n = Math.PI - 2 * Math.PI * (y / scale);
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: (Math.atan(Math.sinh(n)) / Math.PI) * 180,
  };
}

/** The tiles that cover a viewport, with where each one goes on the screen. */
export interface Tile {
  x: number;
  y: number;
  z: number;
  /** Left and top of the tile relative to the viewport's own origin. */
  left: number;
  top: number;
  key: string;
}

export function tilesFor(centre: Coordinates, zoom: number, width: number, height: number): Tile[] {
  const z = Math.round(zoom);
  const middle = project(centre, z);
  // The world pixel at the viewport's top-left corner.
  const originX = middle.x - width / 2;
  const originY = middle.y - height / 2;
  const span = 2 ** z;

  const first = Math.floor(originX / TILE);
  const last = Math.floor((originX + width) / TILE);
  const top = Math.floor(originY / TILE);
  const bottom = Math.floor((originY + height) / TILE);

  const tiles: Tile[] = [];
  for (let ty = top; ty <= bottom; ty += 1) {
    // Above the pole and below it there is no map, and asking for one is a
    // request the tile server answers with a 404 for no reason.
    if (ty < 0 || ty >= span) continue;
    for (let tx = first; tx <= last; tx += 1) {
      // Longitude wraps; the same tile is simply shown again further along.
      const wrapped = ((tx % span) + span) % span;
      tiles.push({
        x: wrapped,
        y: ty,
        z,
        left: tx * TILE - originX,
        top: ty * TILE - originY,
        key: `${z}/${tx}/${ty}`,
      });
    }
  }
  return tiles;
}

/** Move a centre by a drag of `dx`, `dy` screen pixels (content follows the hand). */
export function panned(centre: Coordinates, zoom: number, dx: number, dy: number): Coordinates {
  const z = Math.round(zoom);
  const from = project(centre, z);
  return unproject({ x: from.x - dx, y: from.y - dy }, z);
}
