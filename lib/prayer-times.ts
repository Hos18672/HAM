/**
 * Prayer times, computed from first principles. No third-party API: the
 * astronomy is a few dozen lines of trigonometry, and calling out to a service
 * would mean another dependency, another privacy disclosure and a page that
 * breaks when someone else's server does.
 *
 * Method: **Ja'fari (Shia)** as used by the Leva Institute, Qum —
 *   Fajr      16° below the horizon
 *   Isha      14° below the horizon
 *   Maghrib   4° after sunset (not at sunset, as in the Sunni schools)
 *   Asr       standard, shadow factor 1
 *   Midnight  the shar'i midpoint from sunset to the *next* Fajr
 *
 * All angles are in degrees at the boundary and converted internally.
 * Everything here is pure: the same inputs always produce the same output,
 * which is what makes it unit-testable against published tables.
 */

export const VIENNA = {
  latitude: 48.2175,
  longitude: 16.326,
  timeZone: 'Europe/Vienna',
} as const;

/** The seven times the page shows, in the order they occur. */
export const PRAYER_KEYS = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'midnight',
] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

/** Minutes after local midnight, or null when the event does not occur. */
export type PrayerTimes = Record<PrayerKey, number | null>;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const DEG = Math.PI / 180;
const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);
const tan = (d: number) => Math.tan(d * DEG);
const asin = (x: number) => Math.asin(x) / DEG;
const acos = (x: number) => Math.acos(x) / DEG;
const atan = (x: number) => Math.atan(x) / DEG;
const atan2 = (y: number, x: number) => Math.atan2(y, x) / DEG;

/** Normalise an angle into [0, 360). */
const fixAngle = (a: number) => {
  const r = a - 360 * Math.floor(a / 360);
  return r < 0 ? r + 360 : r;
};
/** Normalise an hour value into [0, 24). */
const fixHour = (h: number) => {
  const r = h - 24 * Math.floor(h / 24);
  return r < 0 ? r + 24 : r;
};

/**
 * Julian day number for a civil date at 00:00 UT.
 * Meeus, *Astronomical Algorithms*, ch. 7.
 */
export function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

export interface SunPosition {
  /** Solar declination δ, degrees. */
  declination: number;
  /** Equation of time, in hours. */
  equationOfTime: number;
}

/**
 * Low-precision solar position (good to well under a minute of time, which is
 * far tighter than the ±2 min tolerance prayer tables are quoted to).
 * Steps 1–2 of the documented algorithm.
 */
export function sunPosition(jd: number): SunPosition {
  const d = jd - 2451545.0; // days since J2000.0

  const g = fixAngle(357.529 + 0.98560028 * d); // mean anomaly
  const q = fixAngle(280.459 + 0.98564736 * d); // mean longitude
  const L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g)); // ecliptic longitude

  const e = 23.439 - 0.00000036 * d; // obliquity of the ecliptic

  const declination = asin(sin(e) * sin(L));

  // Right ascension, brought into the same revolution as the mean longitude so
  // the difference below never jumps by 24 h.
  let ra = atan2(cos(e) * sin(L), cos(L)) / 15;
  ra = fixHour(ra);
  const equationOfTime = q / 15 - ra;

  return { declination, equationOfTime };
}

/**
 * Hour angle T(α): how long before/after solar noon the sun sits α degrees
 * below the horizon, in hours. Step 4.
 *
 * Returns null at high latitude when the sun never reaches that depression —
 * the caller renders "—" rather than crashing.
 */
export function hourAngle(angle: number, latitude: number, declination: number): number | null {
  const numerator = -sin(angle) - sin(declination) * sin(latitude);
  const denominator = cos(declination) * cos(latitude);
  const x = numerator / denominator;
  if (x > 1 || x < -1) return null;
  return acos(x) / 15;
}

/**
 * Asr hour angle for a given shadow factor (1 = standard / Ja'fari, 2 = Hanafi).
 * Step 6: the sun's altitude when an object's shadow equals its own length plus
 * the noon shadow.
 */
export function asrHourAngle(
  shadowFactor: number,
  latitude: number,
  declination: number,
): number | null {
  const angle = -atan(1 / (shadowFactor + tan(Math.abs(latitude - declination))));
  return hourAngle(angle, latitude, declination);
}

/** The angles that define the Ja'fari method. */
export const JAFARI = {
  fajrAngle: 16,
  ishaAngle: 14,
  /** Maghrib is 4° *after* sunset in this method, not coincident with it. */
  maghribAngle: 4,
  asrShadowFactor: 1,
  /** Apparent sunrise/sunset, including refraction and the solar radius. */
  horizonAngle: 0.833,
} as const;

/** Read the Y/M/D a UTC instant falls on *in a given IANA timezone*. */
function civilDateIn(timeZone: string, date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * The timezone's UTC offset in hours on a given civil date, read from the
 * runtime's own IANA database. This is what makes the result DST-correct
 * without hard-coding Austria's changeover dates.
 */
export function utcOffsetHours(timeZone: string, year: number, month: number, day: number): number {
  // Probe at 12:00 UTC: far enough from either DST boundary that the offset we
  // read is the one in force for the working part of that local day.
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(probe);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return (asUtc - probe.getTime()) / 3_600_000;
}

export interface ComputeOptions {
  coordinates?: Coordinates;
  timeZone?: string;
}

/**
 * The raw day computation, without the midnight roll-over that needs
 * tomorrow's Fajr. Steps 3–6. Values are local-clock hours.
 */
function computeDayHours(
  year: number,
  month: number,
  day: number,
  coords: Coordinates,
  offset: number,
): {
  fajr: number | null;
  sunrise: number | null;
  dhuhr: number;
  asr: number | null;
  sunset: number | null;
  maghrib: number | null;
  isha: number | null;
} {
  // Evaluate the sun at local noon rather than 00:00 UT: the declination moves
  // over a day, and noon is the centre of the interval we are solving in.
  const jd = julianDay(year, month, day) + (12 - coords.longitude / 15 - offset) / 24;
  const { declination, equationOfTime } = sunPosition(jd);

  // Step 3: solar noon in local clock time.
  const dhuhr = fixHour(12 - coords.longitude / 15 - equationOfTime + offset);

  const T = (angle: number) => hourAngle(angle, coords.latitude, declination);

  const tFajr = T(JAFARI.fajrAngle);
  const tHorizon = T(JAFARI.horizonAngle);
  const tMaghrib = T(JAFARI.maghribAngle);
  const tIsha = T(JAFARI.ishaAngle);
  const tAsr = asrHourAngle(JAFARI.asrShadowFactor, coords.latitude, declination);

  return {
    fajr: tFajr === null ? null : dhuhr - tFajr,
    sunrise: tHorizon === null ? null : dhuhr - tHorizon,
    dhuhr,
    asr: tAsr === null ? null : dhuhr + tAsr,
    sunset: tHorizon === null ? null : dhuhr + tHorizon,
    maghrib: tMaghrib === null ? null : dhuhr + tMaghrib,
    isha: tIsha === null ? null : dhuhr + tIsha,
  };
}

const toMinutes = (h: number | null): number | null =>
  h === null || !Number.isFinite(h) ? null : Math.round(h * 60);

/**
 * Compute the seven times for the civil day that `date` falls on, in the given
 * timezone. Results are minutes after local midnight; `null` means the event
 * does not occur that day at that latitude.
 */
export function getPrayerTimes(date: Date, options: ComputeOptions = {}): PrayerTimes {
  const timeZone = options.timeZone ?? VIENNA.timeZone;
  const coords = options.coordinates ?? { latitude: VIENNA.latitude, longitude: VIENNA.longitude };

  const { year, month, day } = civilDateIn(timeZone, date);
  const offset = utcOffsetHours(timeZone, year, month, day);
  const today = computeDayHours(year, month, day, coords, offset);

  // Step 7: shar'i midnight is the midpoint between sunset and the *next*
  // day's Fajr, so tomorrow has to be computed too. Expressed as minutes after
  // *today's* midnight it can exceed 24 h, which the renderer handles by
  // wrapping — the value stays monotonic for the countdown.
  const tomorrowUtc = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const t = civilDateIn(timeZone, tomorrowUtc);
  const tomorrowOffset = utcOffsetHours(timeZone, t.year, t.month, t.day);
  const tomorrow = computeDayHours(t.year, t.month, t.day, coords, tomorrowOffset);

  let midnight: number | null = null;
  if (today.sunset !== null && tomorrow.fajr !== null) {
    // Add a day to tomorrow's Fajr so the midpoint lands in the night, and
    // correct for a DST shift across the night.
    const nextFajr = tomorrow.fajr + 24 + (tomorrowOffset - offset);
    midnight = today.sunset + (nextFajr - today.sunset) / 2;
  }

  return {
    fajr: toMinutes(today.fajr),
    sunrise: toMinutes(today.sunrise),
    dhuhr: toMinutes(today.dhuhr),
    asr: toMinutes(today.asr),
    maghrib: toMinutes(today.maghrib),
    isha: toMinutes(today.isha),
    midnight: toMinutes(midnight),
  };
}

/** Format minutes-after-midnight as HH:MM in Latin digits. Wraps past 24 h. */
export function formatMinutes(minutes: number | null): string | null {
  if (minutes === null) return null;
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface NextPrayer {
  key: PrayerKey;
  /** Minutes after today's midnight. May exceed 1440 when it is tomorrow's. */
  minutes: number;
  /** True when this is tomorrow's Fajr, i.e. Isha has already passed. */
  tomorrow: boolean;
}

/**
 * Which prayer comes next, given the current local time in minutes.
 * Sunrise and shar'i midnight are shown on the page but are not prayers, so
 * they are skipped when picking the next one. After Isha the answer rolls over
 * to tomorrow's Fajr.
 */
export function getNextPrayer(
  times: PrayerTimes,
  nowMinutes: number,
  tomorrowFajr: number | null,
): NextPrayer | null {
  const order: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const key of order) {
    const value = times[key];
    if (value !== null && value > nowMinutes) return { key, minutes: value, tomorrow: false };
  }
  if (tomorrowFajr !== null) {
    return { key: 'fajr', minutes: tomorrowFajr + 1440, tomorrow: true };
  }
  return null;
}

/** Minutes after local midnight for `date` as read in `timeZone`. */
export function localMinutes(date: Date, timeZone: string = VIENNA.timeZone): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return (get('hour') % 24) * 60 + get('minute') + get('second') / 60;
}
