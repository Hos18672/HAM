import 'server-only';
import type { Locale } from './i18n/config';

/**
 * The Quran, from the Al Quran Cloud API (https://alquran.cloud/api).
 *
 * Fetched on the server only, so a reader's browser never talks to the API,
 * and cached for a month: the text does not change. The mushaf's pages, the
 * surah list and the index are read from the files the build writes first
 * (see `fromFile`); the API is only asked when those are missing. The Arabic is the Uthmani
 * script; the translation follows the page's language —
 *   fa  Naser Makarem Shirazi
 *   de  A. S. F. Bubenheim & N. Elyas
 */

const BASE = 'https://api.alquran.cloud/v1';
const ONE_MONTH = 60 * 60 * 24 * 30;
const ARABIC = 'quran-uthmani';

export const TRANSLATION: Record<Locale, { edition: string; translator: string }> = {
  fa: { edition: 'fa.makarem', translator: 'ناصر مکارم شیرازی' },
  de: { edition: 'de.bubenheim', translator: 'A. S. F. Bubenheim & N. Elyas' },
};

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SURAH_COUNT, PAGE_COUNT, JUZ_COUNT, BASMALA } from './quran-constants';
import {
  editionAyahs,
  info,
  mushafPage,
  quranIndex,
  surahList,
  withoutBasmala,
  type MushafPage,
  type QuranIndex,
  type RawAyah,
  type RawMeta,
  type RawSurah,
  type SurahInfo,
} from './quran-build';

export { SURAH_COUNT, PAGE_COUNT, JUZ_COUNT, BASMALA };
export type { SurahInfo, PageAyah, MushafPage, QuranIndex } from './quran-build';

export interface Ayah {
  /** Position in the surah. */
  number: number;
  arabic: string;
  translation: string;
  juz: number;
  sajda: boolean;
}

export interface Surah extends SurahInfo {
  /** Whether the reader shows the Basmala above the first verse. */
  basmala: boolean;
  ayahs: Ayah[];
}

/**
 * The book as files, written by the build (`scripts/quran-data.ts`) into
 * `public/quran-data/` and served from there. Read first, so a page nobody
 * has opened yet does not wait on the API; null when the build could not
 * write them, and the API is asked instead.
 */
async function fromFile<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(
      await readFile(join(process.cwd(), 'public', 'quran-data', name), 'utf8'),
    ) as T;
  } catch {
    return null;
  }
}

/** Whether the build wrote the book out as files, which the reader then
 *  fetches straight from the CDN. */
export async function hasQuranFiles(): Promise<boolean> {
  return (await fromFile<QuranIndex>('index.json')) !== null;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: ONE_MONTH },
  });
  if (!response.ok) throw new Error(`alquran.cloud ${response.status}`);
  const body = (await response.json()) as { code?: number; data?: T };
  if (body.code !== 200 || body.data === undefined) throw new Error('alquran.cloud bad body');
  return body.data;
}

/** The 114 surahs, or null if the API could not be reached. */
export async function getSurahList(): Promise<SurahInfo[] | null> {
  const stored = await fromFile<SurahInfo[]>('surahs.json');
  if (stored?.length === SURAH_COUNT) return stored;
  try {
    return surahList(await get<RawSurah[]>('/surah'));
  } catch (error) {
    console.warn('[quran] surah list unavailable', error);
    return null;
  }
}

/** One surah with its translation, or null if the API could not be reached. */
export async function getSurah(number: number, locale: Locale): Promise<Surah | null> {
  try {
    const [arabic, translation] = await get<[RawSurah, RawSurah]>(
      `/surah/${number}/editions/${ARABIC},${TRANSLATION[locale].edition}`,
    );
    const verses = arabic.ayahs ?? [];
    const translated = translation.ayahs ?? [];
    if (verses.length === 0 || verses.length !== translated.length) return null;

    const basmala = number !== 1 && number !== 9;
    return {
      ...info(arabic),
      basmala,
      ayahs: verses.map((verse, index) => ({
        number: verse.numberInSurah,
        arabic:
          basmala && index === 0 ? withoutBasmala(verse.text) : verse.text.replace(/^\uFEFF/, ''),
        translation: translated[index]?.text ?? '',
        juz: verse.juz,
        // `sajda` is `false`, or an object describing the prostration.
        sajda: Boolean(verse.sajda),
      })),
    };
  } catch (error) {
    console.warn(`[quran] surah ${number} unavailable`, error);
    return null;
  }
}

/* ─── The mushaf, page by page ─────────────────────────────────────────── */

export { parseTajweed, type Segment, type SilentKind } from './quran-tajweed';

/**
 * Whole editions, for building the GitHub Pages preview.
 *
 * The preview renders all 604 pages in both languages in one go; asking the
 * API for them a page at a time is 2 416 requests and runs past the workflow's
 * time limit. With `QURAN_WHOLE_EDITIONS=1` each edition is fetched once
 * instead and the pages are cut from it here. Kept in memory rather than in
 * Next's fetch cache, which refuses entries over 2 MB — an edition is about
 * 2.5 MB. The live site leaves this off and asks for single pages, which cache
 * well and keep a cold start small.
 */
const WHOLE_EDITIONS = process.env.QURAN_WHOLE_EDITIONS === '1';
const editions = new Map<string, Promise<RawAyah[]>>();

function wholeEdition(edition: string): Promise<RawAyah[]> {
  let entry = editions.get(edition);
  if (!entry) {
    entry = fetch(`${BASE}/quran/${edition}`, {
      signal: AbortSignal.timeout(60_000),
      // Not 'no-store': inside a page that is built ahead, a no-store fetch
      // stops the render ("dynamic server usage") and every Quran page of
      // the preview came out as the error page. Next will decline to keep
      // something this large in its cache and say so in the log; the map
      // above keeps it instead.
      cache: 'force-cache',
    })
      .then((response) => {
        if (!response.ok) throw new Error(`alquran.cloud ${response.status}`);
        return response.json() as Promise<{ data: Parameters<typeof editionAyahs>[0] }>;
      })
      .then(({ data }) => editionAyahs(data));
    entry.catch(() => editions.delete(edition));
    editions.set(edition, entry);
  }
  return entry;
}

async function pageOf(page: number, edition: string): Promise<RawAyah[]> {
  if (!WHOLE_EDITIONS) return (await get<{ ayahs: RawAyah[] }>(`/page/${page}/${edition}`)).ayahs;
  const all = await wholeEdition(edition);
  return all.filter((ayah) => ayah.page === page);
}

/** One page of the Medina mushaf with its translation, or null. */
export async function getMushafPage(page: number, locale: Locale): Promise<MushafPage | null> {
  const stored = await fromFile<MushafPage>(`${locale}/${page}.json`);
  if (stored?.ayahs?.length) return stored;
  try {
    const [arabic, translation] = await Promise.all([
      pageOf(page, 'quran-tajweed'),
      pageOf(page, TRANSLATION[locale].edition),
    ]);
    return mushafPage(page, arabic, translation);
  } catch (error) {
    console.warn(`[quran] page ${page} unavailable`, error);
    return null;
  }
}

/** Where every surah and juz begins. */
export async function getQuranIndex(): Promise<QuranIndex | null> {
  const stored = await fromFile<QuranIndex>('index.json');
  if (stored?.surahPage?.length === SURAH_COUNT + 1) return stored;
  try {
    return quranIndex(await get<RawMeta>('/meta'));
  } catch (error) {
    console.warn('[quran] index unavailable', error);
    return null;
  }
}
