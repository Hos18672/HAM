import 'server-only';
import {
  getDayTimes,
  EXTRA_KEYS,
  PRAYER_KEYS,
  VIENNA,
  type Coordinates,
  type ExtraTimes,
  type PrayerTimes,
} from './prayer-times';

/**
 * Prayer times from the Aladhan API (https://aladhan.com/prayer-times-api),
 * with the site's own calculation standing behind it.
 *
 * The request is always made from the server — never from the visitor's
 * browser — so the only party Aladhan ever sees is this site, and every answer
 * is cached: Vienna's day and month once a day, a visitor's own position (to
 * two decimals, about a kilometre) likewise. If the API is slow, down or says
 * something unexpected, the day is computed locally instead; the page never
 * waits on, or breaks with, someone else's server.
 *
 * The parameters pin the API to the method this site has always used:
 *   method=0                    Shia Ithna-Ashari, Leva Institute, Qum
 *                               (Fajr 16°, Isha 14°, Maghrib 4°)
 *   midnightMode=1              shar'i midnight from sunset to Fajr, not sunrise
 *   latitudeAdjustmentMethod=0  no high-latitude adjustment: in a Viennese
 *                               summer the API would otherwise move Fajr and
 *                               Isha by up to half an hour
 *   school=0                    Asr at a shadow factor of one
 * With these the API and `lib/prayer-times` agree to the minute or two.
 */

const BASE = 'https://api.aladhan.com/v1';
const PARAMS = { method: '0', midnightMode: '1', latitudeAdjustmentMethod: '0', school: '0' };
const TIMEOUT_MS = 4000;
const ONE_DAY = 86_400;

export interface ApiDay {
  /** `YYYY-MM-DD` */
  iso: string;
  times: PrayerTimes;
  extras: ExtraTimes;
}

export interface Place extends Coordinates {
  timeZone: string;
}

export const VIENNA_PLACE: Place = {
  latitude: VIENNA.latitude,
  longitude: VIENNA.longitude,
  timeZone: VIENNA.timeZone,
};

/* ─── Parsing ────────────────────────────────────────────────────────────── */

const API_NAMES: Record<keyof PrayerTimes | keyof ExtraTimes, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  midnight: 'Midnight',
  imsak: 'Imsak',
  sunset: 'Sunset',
  firstThird: 'Firstthird',
  lastThird: 'Lastthird',
};

/** These fall in the night and may be after the clock has passed 00:00. */
const NIGHT_KEYS = new Set(['midnight', 'firstThird', 'lastThird']);

/**
 * "05:16" or "05:16 (CEST)" → minutes after midnight. The night's points come
 * back as clock readings, so one read as early morning belongs to the next
 * calendar day and is carried past 24 h, which is how the rest of the site
 * keeps them (monotonic for the countdown, wrapped when printed).
 */
function parseClock(value: unknown, key: string): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(minutes) || minutes >= 1440) return null;
  return NIGHT_KEYS.has(key) && minutes < 12 * 60 ? minutes + 1440 : minutes;
}

interface RawDay {
  timings?: Record<string, unknown>;
  date?: { gregorian?: { date?: string } };
}

function parseDay(raw: RawDay): ApiDay | null {
  const timings = raw.timings;
  const gregorian = raw.date?.gregorian?.date; // DD-MM-YYYY
  const dateMatch = gregorian ? /^(\d{2})-(\d{2})-(\d{4})$/.exec(gregorian) : null;
  if (!timings || !dateMatch) return null;

  const times = {} as PrayerTimes;
  for (const key of PRAYER_KEYS) times[key] = parseClock(timings[API_NAMES[key]], key);
  const extras = {} as ExtraTimes;
  for (const key of EXTRA_KEYS) extras[key] = parseClock(timings[API_NAMES[key]], key);

  // Dhuhr always exists; if the API did not send it, nothing else is trusted.
  if (times.dhuhr === null) return null;

  // The API also lists holidays for the day. They are not read: its list is
  // not a Shia calendar and its dates are the Saudi reckoning, so the days
  // this site marks are Hijri dates of its own (`lib/holidays`).
  return { iso: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`, times, extras };
}

/* ─── Requests ───────────────────────────────────────────────────────────── */

async function request(path: string, place: Place, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({
    ...PARAMS,
    ...extra,
    latitude: place.latitude.toFixed(4),
    longitude: place.longitude.toFixed(4),
    timezonestring: place.timeZone,
  });
  const response = await fetch(`${BASE}${path}?${query}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: ONE_DAY },
  });
  if (!response.ok) throw new Error(`aladhan ${response.status}`);
  const body = (await response.json()) as { code?: number; data?: unknown };
  if (body.code !== 200) throw new Error(`aladhan code ${body.code}`);
  return body.data;
}

/** One day from the API, or null if it could not be had. */
export async function fetchDay(iso: string, place: Place): Promise<ApiDay | null> {
  const [y, m, d] = iso.split('-');
  try {
    const data = (await request(`/timings/${d}-${m}-${y}`, place)) as RawDay;
    const day = parseDay(data);
    return day && day.iso === iso ? day : null;
  } catch (error) {
    console.warn('[aladhan] day unavailable, computing locally', error);
    return null;
  }
}

/** One Gregorian month from the API, or null if it could not be had whole. */
export async function fetchMonth(
  year: number,
  month: number,
  place: Place,
): Promise<ApiDay[] | null> {
  try {
    const data = await request(`/calendar/${year}/${month}`, place);
    if (!Array.isArray(data)) return null;
    const days = (data as RawDay[]).map(parseDay);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (days.length !== daysInMonth || days.some((day) => day === null)) return null;
    return days as ApiDay[];
  } catch (error) {
    console.warn('[aladhan] month unavailable, computing locally', error);
    return null;
  }
}

/* ─── With the fallback ──────────────────────────────────────────────────── */

export type Source = 'aladhan' | 'local';

/** A day's times from the API, or from the local calculation if need be. */
export async function dayTimes(
  iso: string,
  place: Place = VIENNA_PLACE,
): Promise<ApiDay & { source: Source }> {
  const fromApi = await fetchDay(iso, place);
  if (fromApi) return { ...fromApi, source: 'aladhan' };
  return { ...localDay(iso, place), source: 'local' };
}

/** A month's times from the API, or from the local calculation if need be. */
export async function monthTimes(
  year: number,
  month: number,
  place: Place = VIENNA_PLACE,
): Promise<{ days: ApiDay[]; source: Source }> {
  const fromApi = await fetchMonth(year, month, place);
  if (fromApi) return { days: fromApi, source: 'aladhan' };
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    localDay(
      `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
      place,
    ),
  );
  return { days, source: 'local' };
}

function localDay(iso: string, place: Place): ApiDay {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const { times, extras } = getDayTimes(new Date(Date.UTC(y, m - 1, d, 12)), {
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    timeZone: place.timeZone,
  });
  return { iso, times, extras };
}
