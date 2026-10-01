import { describe, it, expect } from 'vitest';
import { HOUSE } from '@/lib/qibla';
import { MAX_ZOOM, TILE, panned, project, tilesFor, unproject } from '@/lib/slippy';

/**
 * The street map's arithmetic. Getting this wrong does not throw — it draws
 * a map of the wrong place, or a grid with a seam in it, which is the kind
 * of thing that only a reader notices.
 */
describe('the street map', () => {
  it('places the known corners of Web Mercator', () => {
    // At zoom 0 the whole world is one tile, and the origin is its corner.
    expect(project({ latitude: 0, longitude: -180 }, 0)).toEqual({ x: 0, y: TILE / 2 });
    expect(project({ latitude: 0, longitude: 0 }, 0).x).toBeCloseTo(TILE / 2, 6);
    // The Mercator top edge is 85.051°, not the pole.
    expect(project({ latitude: 85.05112878, longitude: 0 }, 0).y).toBeCloseTo(0, 5);
  });

  it('comes back to where it started', () => {
    for (const place of [
      HOUSE,
      { latitude: 0, longitude: 0 },
      { latitude: -33.8688, longitude: 151.2093 },
      { latitude: 64.1466, longitude: -21.9426 },
    ]) {
      for (const zoom of [2, 10, 17, MAX_ZOOM]) {
        const back = unproject(project(place, zoom), zoom);
        expect(back.latitude, `lat @${zoom}`).toBeCloseTo(place.latitude, 6);
        expect(back.longitude, `lon @${zoom}`).toBeCloseTo(place.longitude, 6);
      }
    }
  });

  it('covers the whole viewport and no more, with no gaps', () => {
    const width = 640;
    const height = 480;
    const tiles = tilesFor(HOUSE, 17, width, height);
    expect(tiles.length).toBeGreaterThan(0);

    // Every pixel of the viewport is inside some tile.
    for (const [px, py] of [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
      [width / 2, height / 2],
    ]) {
      const covering = tiles.filter(
        (t) => px >= t.left && px < t.left + TILE && py >= t.top && py < t.top + TILE,
      );
      expect(covering.length, `pixel ${px},${py}`).toBe(1);
    }
    // …and no tile is wholly off-screen, which would be a wasted request.
    for (const t of tiles) {
      expect(t.left).toBeLessThan(width);
      expect(t.top).toBeLessThan(height);
      expect(t.left + TILE).toBeGreaterThan(0);
      expect(t.top + TILE).toBeGreaterThan(0);
    }
  });

  it('never asks for a tile that does not exist', () => {
    // Over the pole and across the date line: the one is nothing, the other
    // is the same tiles again, and neither may be asked for out of range.
    for (const centre of [
      { latitude: 84, longitude: 179.9 },
      { latitude: -84, longitude: -179.9 },
    ]) {
      for (const zoom of [2, 5, 12]) {
        const span = 2 ** zoom;
        for (const t of tilesFor(centre, zoom, 900, 900)) {
          expect(t.x, 'x in range').toBeGreaterThanOrEqual(0);
          expect(t.x, 'x in range').toBeLessThan(span);
          expect(t.y, 'y in range').toBeGreaterThanOrEqual(0);
          expect(t.y, 'y in range').toBeLessThan(span);
        }
      }
    }
  });

  it('moves the map with the hand', () => {
    // Dragging right moves the content right, so the centre goes west.
    const west = panned(HOUSE, 15, 120, 0);
    expect(west.longitude).toBeLessThan(HOUSE.longitude);
    // Dragging down moves the content down, so the centre goes north.
    const north = panned(HOUSE, 15, 0, 120);
    expect(north.latitude).toBeGreaterThan(HOUSE.latitude);
    // …and a drag of nothing changes nothing.
    const still = panned(HOUSE, 15, 0, 0);
    expect(still.latitude).toBeCloseTo(HOUSE.latitude, 9);
    expect(still.longitude).toBeCloseTo(HOUSE.longitude, 9);
  });
});
