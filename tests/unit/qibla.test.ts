import { describe, it, expect } from 'vitest';
import {
  qiblaBearing,
  greatCircleDistanceKm,
  geodesicDistanceKm,
  cardinalFor,
  qiblaFrom,
  KAABA,
  HOUSE,
} from '@/lib/qibla';

describe('qibla bearing', () => {
  it('points south-east from the association house in Vienna', () => {
    const result = qiblaFrom(HOUSE);
    // The figure the Qibla page prints: ≈136.6° from Sautergasse.
    expect(result.bearing).toBeCloseTo(136.6, 0);
    expect(result.cardinal).toBe('se');
  });

  it('measures about 3 637 km from Vienna to the Kaaba', () => {
    // The ellipsoidal (WGS84) distance. The spherical one is ~3 km longer;
    // over this path the earth's flattening is worth measuring.
    expect(qiblaFrom(HOUSE).distanceKm).toBeCloseTo(3637, -1);
    expect(greatCircleDistanceKm(HOUSE)).toBeCloseTo(3640, -1);
  });

  it('is zero distance and stable at the Kaaba itself', () => {
    expect(geodesicDistanceKm(KAABA)).toBe(0);
    expect(greatCircleDistanceKm(KAABA)).toBeCloseTo(0, 6);
  });

  it('points due north from a point due south on the same meridian', () => {
    const south = { latitude: 0, longitude: KAABA.longitude };
    expect(qiblaBearing(south)).toBeCloseTo(0, 6);
  });

  it('points due south from a point due north on the same meridian', () => {
    const north = { latitude: 60, longitude: KAABA.longitude };
    expect(qiblaBearing(north)).toBeCloseTo(180, 6);
  });

  it('agrees with known qibla directions for other cities', () => {
    // These are the directions those communities actually pray in.
    const cases: { city: string; at: { latitude: number; longitude: number }; bearing: number }[] =
      [
        { city: 'London', at: { latitude: 51.5074, longitude: -0.1278 }, bearing: 119.0 },
        { city: 'Istanbul', at: { latitude: 41.0082, longitude: 28.9784 }, bearing: 151.6 },
        { city: 'Berlin', at: { latitude: 52.52, longitude: 13.405 }, bearing: 136.7 },
        { city: 'New York', at: { latitude: 40.7128, longitude: -74.006 }, bearing: 58.5 },
        { city: 'Jakarta', at: { latitude: -6.2088, longitude: 106.8456 }, bearing: 295.2 },
        { city: 'Cape Town', at: { latitude: -33.9249, longitude: 18.4241 }, bearing: 23.4 },
      ];

    for (const testCase of cases) {
      expect(qiblaBearing(testCase.at), testCase.city).toBeCloseTo(testCase.bearing, 0);
    }
  });

  it('always returns a bearing in [0, 360)', () => {
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -180; lon < 180; lon += 30) {
        const bearing = qiblaBearing({ latitude: lat, longitude: lon });
        expect(bearing).toBeGreaterThanOrEqual(0);
        expect(bearing).toBeLessThan(360);
      }
    }
  });

  it("agrees with the spherical distance to within the earth's flattening", () => {
    for (const point of [
      { latitude: 48.2175, longitude: 16.326 },
      { latitude: 51.5, longitude: -0.13 },
      { latitude: -33.87, longitude: 151.21 },
    ]) {
      const spherical = greatCircleDistanceKm(point);
      const ellipsoidal = geodesicDistanceKm(point);
      // Under 0.5% apart everywhere — same path, different earth model.
      expect(Math.abs(spherical - ellipsoidal) / spherical).toBeLessThan(0.005);
    }
  });
});

describe('cardinal points', () => {
  it('snaps a bearing to the nearest eighth', () => {
    expect(cardinalFor(0)).toBe('n');
    expect(cardinalFor(44)).toBe('ne');
    expect(cardinalFor(90)).toBe('e');
    expect(cardinalFor(136.6)).toBe('se');
    expect(cardinalFor(180)).toBe('s');
    expect(cardinalFor(225)).toBe('sw');
    expect(cardinalFor(270)).toBe('w');
    expect(cardinalFor(315)).toBe('nw');
  });

  it('wraps around north rather than falling off the end', () => {
    expect(cardinalFor(359)).toBe('n');
    expect(cardinalFor(360)).toBe('n');
    expect(cardinalFor(-10)).toBe('n');
  });
});
