/**
 * Turning the Al Quran Cloud API's answers into the reader's shapes.
 *
 * Its own module rather than part of `lib/quran.ts`, which is server-only:
 * the build script that writes the whole book out as files
 * (`scripts/quran-data.ts`) runs outside Next and uses the same code, so a
 * page read from a file and one fetched from the API are the same page.
 */
import { SURAH_COUNT, PAGE_COUNT, JUZ_COUNT, BASMALA } from './quran-constants';
import { parseTajweed, type Segment } from './quran-tajweed';

export interface SurahInfo {
  number: number;
  /** The Arabic name, e.g. سُورَةُ ٱلْفَاتِحَةِ */
  name: string;
  /** Transliterated, e.g. Al-Faatiha */
  transliteration: string;
  revelation: 'meccan' | 'medinan';
  ayahCount: number;
}

export interface RawSurah {
  number: number;
  name: string;
  englishName: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs?: { numberInSurah: number; text: string; juz: number; sajda: unknown }[];
}

export interface RawAyah {
  numberInSurah: number;
  text: string;
  juz: number;
  hizbQuarter?: number;
  page?: number;
  sajda: unknown;
  surah: RawSurah;
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

export interface QuranIndex {
  /** Index 1–114: the page each surah starts on. */
  surahPage: number[];
  /** Index 1–30: the page each juz starts on. */
  juzPage: number[];
}

export interface RawMeta {
  pages: { references: { surah: number; ayah: number }[] };
  juzs: { references: { surah: number; ayah: number }[] };
}

export const info = (raw: RawSurah): SurahInfo => ({
  number: raw.number,
  name: raw.name,
  transliteration: raw.englishName,
  revelation: raw.revelationType === 'Medinan' ? 'medinan' : 'meccan',
  ayahCount: raw.numberOfAyahs,
});

/** The 114 surahs from `/surah`, or null if the list is not whole. */
export const surahList = (data: RawSurah[]): SurahInfo[] | null =>
  data.length === SURAH_COUNT ? data.map(info) : null;

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

const bare = (word: string) => word.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '').replace(/ٱ/g, 'ا');
const BASMALA_BARE = BASMALA.split(' ').map(bare).join(' ');

export function withoutBasmala(text: string): string {
  const words = text.replace(/^﻿/, '').trim().split(/\s+/);
  return words.slice(0, 4).map(bare).join(' ') === BASMALA_BARE
    ? words.slice(4).join(' ')
    : words.join(' ');
}

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

/** One page from its verses in the tajweed edition and in a translation. */
export function mushafPage(
  page: number,
  arabic: RawAyah[],
  translation: RawAyah[],
): MushafPage | null {
  if (arabic.length === 0 || arabic.length !== translation.length) return null;
  const surahs: Record<number, SurahInfo> = {};
  const ayahs = arabic.map((ayah, index) => {
    surahs[ayah.surah.number] ??= info(ayah.surah);
    const segments = parseTajweed(ayah.text);
    const first = ayah.numberInSurah === 1 && ayah.surah.number !== 1 && ayah.surah.number !== 9;
    return {
      surah: ayah.surah.number,
      number: ayah.numberInSurah,
      segments: first ? segmentsWithoutBasmala(segments) : segments,
      translation: translation[index]?.text ?? '',
      juz: ayah.juz,
      hizbQuarter: ayah.hizbQuarter,
      sajda: Boolean(ayah.sajda),
    };
  });
  return { number: page, ayahs, surahs };
}

/** A whole edition from `/quran/<edition>`, as one run of verses. */
export function editionAyahs(data: {
  surahs: (Omit<RawSurah, 'numberOfAyahs'> & { ayahs: Omit<RawAyah, 'surah'>[] })[];
}): RawAyah[] {
  return data.surahs.flatMap(({ ayahs, ...surah }) =>
    ayahs.map((ayah) => ({ ...ayah, surah: { ...surah, numberOfAyahs: ayahs.length } })),
  );
}

/** Where every surah and juz begins, from the API's page and juz tables. */
export function quranIndex(meta: RawMeta): QuranIndex | null {
  type Ref = { surah: number; ayah: number };
  const pages = meta.pages.references;
  const before = (a: Ref, b: Ref) => a.surah < b.surah || (a.surah === b.surah && a.ayah <= b.ayah);
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
}
