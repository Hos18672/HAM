import { describe, it, expect } from 'vitest';
import {
  along,
  greatCircle,
  meridian,
  openPath,
  parallel,
  placeOf,
  project,
  ringPath,
} from '@/lib/globe';
import { KAABA, HOUSE, qiblaBearing } from '@/lib/qibla';
import { worldOutline } from '@/lib/world-outline';

describe('The orthographic projection', () => {
  it('puts the centre of the map in the middle, facing the viewer', () => {
    const p = project(HOUSE, HOUSE.longitude, HOUSE.latitude);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(0, 10);
    expect(p.z).toBeCloseTo(1, 10);
  });

  it('puts the far side of the earth behind the globe', () => {
    const antipode = { latitude: -HOUSE.latitude, longitude: HOUSE.longitude + 180 };
    expect(project(HOUSE, antipode.longitude, antipode.latitude).z).toBeCloseTo(-1, 10);
  });

  it('puts north above the centre and east to its right', () => {
    const centre = { latitude: 0, longitude: 0 };
    expect(project(centre, 0, 10).y).toBeGreaterThan(0);
    expect(project(centre, 10, 0).x).toBeGreaterThan(0);
  });

  it('keeps every point on the unit sphere', () => {
    for (let lon = -180; lon < 180; lon += 37) {
      for (let lat = -80; lat <= 80; lat += 23) {
        const p = project(HOUSE, lon, lat);
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 10);
      }
    }
  });
});

describe('The great circle', () => {
  it('starts where it is told and ends where it is sent', () => {
    const [lon0, lat0] = along(HOUSE, KAABA, 0);
    const [lon1, lat1] = along(HOUSE, KAABA, 1);
    expect(lon0).toBeCloseTo(HOUSE.longitude, 6);
    expect(lat0).toBeCloseTo(HOUSE.latitude, 6);
    expect(lon1).toBeCloseTo(KAABA.longitude, 6);
    expect(lat1).toBeCloseTo(KAABA.latitude, 6);
  });

  it('leaves in the direction of the qibla, not along the rhumb line', () => {
    // The whole reason the map is a globe: the first step of the drawn path
    // must be the bearing the page prints. A straight line on a flat map
    // would leave several degrees to the south of it.
    const [lon, lat] = along(HOUSE, KAABA, 0.001);
    const firstStep = qiblaBearing(HOUSE, { latitude: lat, longitude: lon });
    expect(firstStep).toBeCloseTo(qiblaBearing(HOUSE), 1);
  });

  it('bulges north of the midpoint of the two latitudes', () => {
    // Vienna to Mecca runs southeast; the shortest way over a sphere leans
    // towards the pole, which is exactly what a flat map hides.
    const [, midLat] = along(HOUSE, KAABA, 0.5);
    expect(midLat).toBeGreaterThan((HOUSE.latitude + KAABA.latitude) / 2);
  });
});

describe('Drawing the sphere', () => {
  const centre = { latitude: 35, longitude: 28 };

  it('draws nothing for a ring that is wholly behind the globe', () => {
    const behind = parallel(-80, 24);
    expect(ringPath(behind, { latitude: 80, longitude: 0 }, 100)).toBe('');
  });

  it('closes a ring that is wholly in view', () => {
    const near = [
      [26, 33],
      [30, 33],
      [30, 37],
      [26, 37],
    ] as const;
    const d = ringPath(near, centre, 100);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).not.toContain('A');
  });

  it('closes a ring cut by the horizon along the rim, not across the globe', () => {
    // A ring big enough to run off the edge. Closed with a straight chord it
    // would draw a line across the face of the earth; it must follow the rim.
    const big = parallel(10, 72);
    const d = ringPath(big, centre, 100);
    expect(d).toContain('A100 100');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('keeps every drawn point inside the globe', () => {
    for (const ring of worldOutline().land) {
      const d = ringPath(ring, centre, 100);
      for (const [, x, y] of d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
        expect(Math.hypot(Number(x), Number(y))).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it('breaks an open line where it goes round the back', () => {
    // A whole meridian is half in view and half behind, so it is drawn in
    // one run — and never joins its two ends across the globe.
    const d = openPath(meridian(centre.longitude + 90), centre, 100);
    expect(d).not.toBe('');
    expect(d).not.toContain('Z');
  });

  it('places the ends of the qibla arc on the two cities', () => {
    const arc = greatCircle(HOUSE, KAABA, 8);
    const first = placeOf(centre, { longitude: arc[0]![0], latitude: arc[0]![1] }, 100);
    const house = placeOf(centre, HOUSE, 100);
    expect(first.sx).toBeCloseTo(house.sx, 6);
    expect(first.sy).toBeCloseTo(house.sy, 6);
    expect(house.visible).toBe(true);
    expect(placeOf(centre, KAABA, 100).visible).toBe(true);
  });
});

describe('The carried outline', () => {
  it('decodes to plausible coordinates', () => {
    const { land, borders } = worldOutline();
    expect(land.length).toBeGreaterThan(50);
    expect(borders.length).toBeGreaterThan(100);
    for (const ring of [...land, ...borders]) {
      for (const [lon, lat] of ring) {
        expect(lon).toBeGreaterThanOrEqual(-180.01);
        expect(lon).toBeLessThanOrEqual(180.01);
        expect(lat).toBeGreaterThanOrEqual(-90.01);
        expect(lat).toBeLessThanOrEqual(90.01);
      }
    }
  });

  it('contains the continents it should', () => {
    const { land } = worldOutline();
    const inside = (lon: number, lat: number) =>
      land.some((ring) => {
        let hit = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i]!;
          const [xj, yj] = ring[j]!;
          if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
        }
        return hit;
      });

    expect(inside(16.37, 48.21), 'Vienna').toBe(true);
    expect(inside(39.83, 21.42), 'Mecca').toBe(true);
    expect(inside(51.39, 35.69), 'Tehran').toBe(true);
    expect(inside(-30, 35), 'the middle of the Atlantic').toBe(false);
  });
});
