import { describe, it, expect } from 'vitest';
import { HOUSE, KAABA, qiblaFrom } from '@/lib/qibla';
import {
  EARTH_RADIUS_KM,
  MAX_SPAN_KM,
  niceDistance,
  offset,
  plan,
  planPath,
  polar,
  rings,
} from '@/lib/local-map';

/**
 * The map is only worth drawing if a straight line out of its middle is the
 * direction somebody should actually face. These check exactly that, and
 * the few places the arithmetic could quietly produce a NaN.
 */
describe('the map centred on the reader', () => {
  it('puts the reader in the middle', () => {
    const p = plan(HOUSE, HOUSE.longitude, HOUSE.latitude);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.distanceKm).toBeCloseTo(0, 6);
  });

  it('agrees with the qibla itself, which is the whole point', () => {
    for (const where of [
      HOUSE,
      { latitude: 35.6892, longitude: 51.389 }, // Tehran
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      { latitude: 64.1466, longitude: -21.9426 }, // Reykjavík
    ]) {
      const expected = qiblaFrom(where);
      const got = polar(where, KAABA.longitude, KAABA.latitude);
      expect(got.bearing).toBeCloseTo(expected.bearing, 4);
      // The reading on the page is measured on the WGS84 ellipsoid; a map
      // has to be drawn on a sphere, so the two differ by about a tenth of
      // a percent — a fifth of a pixel at the size this is drawn.
      expect(Math.abs(got.distanceKm - expected.distanceKm) / expected.distanceKm).toBeLessThan(
        0.002,
      );
    }
  });

  it('draws north up and east to the right', () => {
    const north = plan(HOUSE, HOUSE.longitude, HOUSE.latitude + 1);
    expect(north.y).toBeLessThan(0);
    expect(Math.abs(north.x)).toBeLessThan(1);

    const east = plan(HOUSE, HOUSE.longitude + 1, HOUSE.latitude);
    expect(east.x).toBeGreaterThan(0);
  });

  it('keeps distance to scale along every direction, as the projection claims', () => {
    for (const bearing of [0, 37, 90, 211, 359]) {
      const [lon, lat] = offset(HOUSE, 500, bearing);
      const back = polar(HOUSE, lon, lat);
      expect(back.distanceKm).toBeCloseTo(500, 3);
      expect(back.bearing).toBeCloseTo(bearing % 360, 3);
    }
  });

  it('survives the centre and the far side of the earth', () => {
    const antipode = offset(HOUSE, MAX_SPAN_KM, 0);
    const there = polar(HOUSE, antipode[0], antipode[1]);
    expect(Number.isFinite(there.distanceKm)).toBe(true);
    expect(there.distanceKm).toBeCloseTo(MAX_SPAN_KM, 2);
    expect(MAX_SPAN_KM).toBeCloseTo(Math.PI * EARTH_RADIUS_KM, 6);
  });

  it('breaks a line rather than drawing it across the map', () => {
    // Two points either side of the far edge: joined, the segment would run
    // straight through the reader's feet, which is not where it goes.
    const [aLon, aLat] = offset(HOUSE, MAX_SPAN_KM - 20, 10);
    const [bLon, bLat] = offset(HOUSE, MAX_SPAN_KM - 20, 190);
    const scale = 100 / MAX_SPAN_KM;
    const d = planPath(
      HOUSE,
      [
        [aLon, aLat],
        [bLon, bLat],
      ],
      scale,
    );
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d).not.toContain('L');
  });

  it('chooses ring distances a person would say out loud', () => {
    expect(niceDistance(1)).toBe(1);
    expect(niceDistance(9)).toBe(5);
    expect(niceDistance(23)).toBe(20);
    expect(niceDistance(0.4)).toBe(0.2);
    expect(niceDistance(0)).toBe(0);

    for (const span of [0.2, 1, 25, 1000, MAX_SPAN_KM]) {
      const drawn = rings(span);
      expect(drawn.length).toBeGreaterThan(0);
      for (const km of drawn) expect(km).toBeLessThanOrEqual(span);
      expect([...drawn].sort((a, b) => a - b)).toEqual(drawn);
    }
  });
});
