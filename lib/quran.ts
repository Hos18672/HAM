import 'server-only';
import type { Locale } from './i18n/config';

/**
 * The Quran, from the Al Quran Cloud API (https://alquran.cloud/api).
 *
 * Fetched on the server only, so a reader's browser never talks to the API,
 * and cached for a month: the text does not change. The Arabic is the Uthmani
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

import { SURAH_COUNT, PAGE_COUNT, JUZ_COUNT, BASMALA } from './quran-constants';
import { parseTajweed, type Segment } from './quran-tajweed';

export { SURAH_COUNT, PAGE_COUNT, JUZ_COUNT, BASMALA };

export interface SurahInfo {
  number: number;
  /** The Arabic name, e.g. سُورَةُ ٱلْفَاتِحَةِ */
  name: string;
  /** Transliterated, e.g. Al-Faatiha */
  transliteration: string;
  revelation: 'meccan' | 'medinan';
  ayahCount: number;
}

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

interface RawSurah {
  number: number;
  name: string;
  englishName: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs?: { numberInSurah: number; text: string; juz: number; sajda: unknown }[];
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

const info = (raw: RawSurah): SurahInfo => ({
  number: raw.number,
  name: raw.name,
  transliteration: raw.englishName,
  revelation: raw.revelationType === 'Medinan' ? 'medinan' : 'meccan',
  ayahCount: raw.numberOfAyahs,
});

/** The 114 surahs, or null if the API could not be reached. */
export async function getSurahList(): Promise<SurahInfo[] | null> {
  try {
    const data = await get<RawSurah[]>('/surah');
    return data.length === SURAH_COUNT ? data.map(info) : null;
  } catch (error) {
    console.warn('[quran] surah list unavailable', error);
    return null;
  }
}

/**
 * The Uthmani edition folds the Basmala into the first verse of every surah
 * but al-Fatiha (where it *is* the first verse) and at-Tawba (which has
 * none). The reader sets it apart instead, as a printed mushaf does, so it is
 * taken off the front of verse one here.
 *
 * Its spelling varies between surahs in the marks alone (a shadda on the
 * first letter in some, a different alif in others), so the first four words
 * are compared with the marks stripped rather than character for character.
 */

const bare = (word: string) =>
  word.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/\u0671/g, '\u0627');
const BASMALA_BARE = BASMALA.split(' ').map(bare).join(' ');

function withoutBasmala(text: string): string {
  const words = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\s+/);
  return words.slice(0, 4).map(bare).join(' ') === BASMALA_BARE
    ? words.slice(4).join(' ')
    : words.join(' ');
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

/** Take the first `count` characters off a run of segments. */
function dropChars(segments: Segment[], count: number): Segment[] {
  const out: Segment[] = [];
  let left = count;
  for (const segment of segments) {
    if (left >= segment.text.length) {
      left -= segment.text.length;
      continue;
    }
    out.push({ ...segment, text: segment.text.slice(left) });
    left = 0;
  }
  return out;
}

/** The segments of a first verse with its folded-in Basmala taken off. */
function segmentsWithoutBasmala(segments: Segment[]): Segment[] {
  const plain = segments.map((s) => s.text).join('');
  const match = /^\s*(\S+\s+){3}\S+\s*/.exec(plain);
  if (!match) return segments;
  const words = match[0].trim().split(/\s+/);
  return words.map(bare).join(' ') === BASMALA_BARE
    ? dropChars(segments, match[0].length)
    : segments;
}

export interface PageAyah {
  surah: number;
  number: number;
  segments: Segment[];
  translation: string;
  juz: number;
  /** Which of the 240 quarter-hizbs the verse falls in; missing from pages
   *  cached before it was added. */
  hizbQuarter?: number;
  sajda: boolean;
}

export interface MushafPage {
  number: number;
  ayahs: PageAyah[];
  /** The surahs on this page, by number. */
  surahs: Record<number, SurahInfo>;
}

interface RawPage {
  ayahs: {
    numberInSurah: number;
    text: string;
    juz: number;
    hizbQuarter?: number;
    sajda: unknown;
    surah: RawSurah;
  }[];
}

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
const editions = new Map<string, Promise<RawPage['ayahs']>>();

function wholeEdition(edition: string): Promise<RawPage['ayahs']> {
  let entry = editions.get(edition);
  if (!entry) {
    entry = fetch(`${BASE}/quran/${edition}`, {
      signal: AbortSignal.timeout(60_000),
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) throw new Error(`alquran.cloud ${response.status}`);
        return response.json() as Promise<{
          data: { surahs: (Omit<RawSurah, 'numberOfAyahs'> & { ayahs: RawPage['ayahs'] })[] };
        }>;
      })
      .then(({ data }) =>
        data.surahs.flatMap(({ ayahs, ...surah }) =>
          ayahs.map((ayah) => ({
            ...ayah,
            surah: { ...surah, numberOfAyahs: ayahs.length } as RawSurah,
          })),
        ),
      );
    entry.catch(() => editions.delete(edition));
    editions.set(edition, entry);
  }
  return entry;
}

async function pageOf(page: number, edition: string): Promise<RawPage> {
  if (!WHOLE_EDITIONS) return get<RawPage>(`/page/${page}/${edition}`);
  const all = await wholeEdition(edition);
  return { ayahs: all.filter((ayah) => (ayah as { page?: number }).page === page) };
}

/** One page of the Medina mushaf with its translation, or null. */
export async function getMushafPage(page: number, locale: Locale): Promise<MushafPage | null> {
  try {
    const [arabic, translation] = await Promise.all([
      pageOf(page, 'quran-tajweed'),
      pageOf(page, TRANSLATION[locale].edition),
    ]);
    if (arabic.ayahs.length === 0 || arabic.ayahs.length !== translation.ayahs.length) return null;

    const surahs: Record<number, SurahInfo> = {};
    const ayahs = arabic.ayahs.map((ayah, index) => {
      surahs[ayah.surah.number] ??= info(ayah.surah);
      const segments = parseTajweed(ayah.text);
      const first = ayah.numberInSurah === 1 && ayah.surah.number !== 1 && ayah.surah.number !== 9;
      return {
        surah: ayah.surah.number,
        number: ayah.numberInSurah,
        segments: first ? segmentsWithoutBasmala(segments) : segments,
        translation: translation.ayahs[index]?.text ?? '',
        juz: ayah.juz,
        hizbQuarter: ayah.hizbQuarter,
        sajda: Boolean(ayah.sajda),
      };
    });
    return { number: page, ayahs, surahs };
  } catch (error) {
    console.warn(`[quran] page ${page} unavailable`, error);
    return null;
  }
}

export interface QuranIndex {
  /** Index 1–114: the page each surah starts on. */
  surahPage: number[];
  /** Index 1–30: the page each juz starts on. */
  juzPage: number[];
}

/** Where every surah and juz begins, from the API's page and juz tables. */
export async function getQuranIndex(): Promise<QuranIndex | null> {
  try {
    type Ref = { surah: number; ayah: number };
    const meta = await get<{ pages: { references: Ref[] }; juzs: { references: Ref[] } }>('/meta');
    const pages = meta.pages.references;
    const before = (a: Ref, b: Ref) =>
      a.surah < b.surah || (a.surah === b.surah && a.ayah <= b.ayah);
    // The page a verse is on: the last page that starts at or before it.
    const pageOf = (ref: Ref) => {
      let found = 1;
      pages.forEach((start, index) => {
        if (before(start, ref)) found = index + 1;
      });
      return found;
    };
    const surahPage = [0];
    for (let s = 1; s <= SURAH_COUNT; s += 1) surahPage.push(pageOf({ surah: s, ayah: 1 }));
    const juzPage = [0, ...meta.juzs.references.map(pageOf)];
    return pages.length === PAGE_COUNT && juzPage.length === JUZ_COUNT + 1
      ? { surahPage, juzPage }
      : null;
  } catch (error) {
    console.warn('[quran] index unavailable', error);
    return null;
  }
}
