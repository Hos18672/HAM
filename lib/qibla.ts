/**
 * Qibla direction — the great-circle initial bearing from a point on the earth
 * to the Kaaba, and the distance along that circle.
 *
 * "Initial bearing" is the right quantity: a great circle is the shortest path
 * on a sphere, and the direction you must face at the *start* of it is the
 * direction of prayer. A rhumb-line bearing would be constant but longer, and
 * is not what the fiqh means.
 */

export const KAABA = { latitude: 21.4225, longitude: 39.8262 } as const;

/** The association house: Sautergasse 34–38, 1170 Wien. */
export const HOUSE = { latitude: 48.2175, longitude: 16.326 } as const;

/** Mean earth radius, km (IUGG). Used by the spherical distance only. */
const EARTH_RADIUS_KM = 6371.0088;

/** WGS84 ellipsoid, metres. */
const WGS84 = { a: 6378137, b: 6356752.314245, f: 1 / 298.257223563 } as const;

const DEG = Math.PI / 180;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface QiblaResult {
  /** Initial great-circle bearing, degrees clockwise from true north, [0, 360). */
  bearing: number;
  /** Great-circle distance to the Kaaba, kilometres. */
  distanceKm: number;
  /** Nearest compass point, as a key into the localized label set. */
  cardinal: CardinalKey;
}

export const CARDINAL_KEYS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type CardinalKey = (typeof CARDINAL_KEYS)[number];

/** Initial bearing from `from` to `to`, degrees clockwise from true north. */
export function qiblaBearing(from: Coordinates, to: Coordinates = KAABA): number {
  const phi1 = from.latitude * DEG;
  const phi2 = to.latitude * DEG;
  const dLambda = (to.longitude - from.longitude) * DEG;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const bearing = (Math.atan2(y, x) / DEG + 360) % 360;
  return bearing;
}

/** Great-circle distance in km, via the haversine formula. */
export function greatCircleDistanceKm(from: Coordinates, to: Coordinates = KAABA): number {
  const phi1 = from.latitude * DEG;
  const phi2 = to.latitude * DEG;
  const dPhi = (to.latitude - from.latitude) * DEG;
  const dLambda = (to.longitude - from.longitude) * DEG;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The compass point a bearing falls in, to the nearest eighth. */
export function cardinalFor(bearing: number): CardinalKey {
  const index = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return CARDINAL_KEYS[index] ?? 'n';
}

/**
 * Geodesic distance on the WGS84 ellipsoid (Vincenty inverse).
 *
 * The earth is flattened by about 1/298, and over a 3 600 km path that is
 * worth ~3 km against the spherical figure. Since the page prints the distance
 * as a fact, it prints the accurate one. Falls back to the spherical value in
 * the rare non-convergent case (near-antipodal points, which the Kaaba never
 * is from Europe).
 */
export function geodesicDistanceKm(from: Coordinates, to: Coordinates = KAABA): number {
  const { a, b, f } = WGS84;
  const L = (to.longitude - from.longitude) * DEG;
  const U1 = Math.atan((1 - f) * Math.tan(from.latitude * DEG));
  const U2 = Math.atan((1 - f) * Math.tan(to.latitude * DEG));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L;
  let sinSigma = 0;
  let cosSigma = 0;
  let sigma = 0;
  let cosSqAlpha = 0;
  let cos2SigmaM = 0;
  let converged = false;

  for (let i = 0; i < 200; i += 1) {
    const sinL = Math.sin(lambda);
    const cosL = Math.cos(lambda);
    sinSigma = Math.hypot(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL);
    if (sinSigma === 0) return 0; // coincident points
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinL) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const previous = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    if (Math.abs(lambda - previous) < 1e-12) {
      converged = true;
      break;
    }
  }
  if (!converged) return greatCircleDistanceKm(from, to);

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  return (b * A * (sigma - deltaSigma)) / 1000;
}

export function qiblaFrom(from: Coordinates = HOUSE): QiblaResult {
  const bearing = qiblaBearing(from);
  return {
    bearing,
    distanceKm: geodesicDistanceKm(from),
    cardinal: cardinalFor(bearing),
  };
}
