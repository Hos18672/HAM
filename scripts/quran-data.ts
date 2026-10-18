/**
 * Writes the whole mushaf out as files before the build: one JSON file per
 * page and language in `public/quran-data/<locale>/<n>.json`, plus the surah
 * list and the index of where each surah and juz begins.
 *
 * Without them a page nobody had opened yet was put together on request
 * from two calls to alquran.cloud, a few seconds each on a bad day, and
 * picking a page far into the book sat waiting on them. Now the reader
 * fetches the file straight from the CDN and the server reads the same
 * file from disk (`lib/quran.ts`).
 *
 * Five requests in all: three whole editions, the surah list and the meta
 * table. If any of them fails nothing is written, the build goes on, and
 * the site asks the API page by page as before.
 *
 *   pnpm tsx scripts/quran-data.ts
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  editionAyahs,
  mushafPage,
  quranIndex,
  surahList,
  type RawAyah,
  type RawMeta,
  type RawSurah,
} from '../lib/quran-build';
import { PAGE_COUNT } from '../lib/quran-constants';

const BASE = 'https://api.alquran.cloud/v1';
const OUT = join(process.cwd(), 'public', 'quran-data');
/** Kept in step with `TRANSLATION` in lib/quran.ts. */
const TRANSLATIONS = { fa: 'fa.makarem', de: 'de.bubenheim' } as const;

async function get<T>(path: string): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      const body = (await response.json()) as { code?: number; data?: T };
      if (body.code !== 200 || body.data === undefined) throw new Error(`${path}: bad body`);
      return body.data;
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw last;
}

const edition = async (name: string) =>
  editionAyahs(await get<Parameters<typeof editionAyahs>[0]>(`/quran/${name}`));

/** The verses of each page, 1–604. */
function byPage(ayahs: RawAyah[]): RawAyah[][] {
  const pages: RawAyah[][] = Array.from({ length: PAGE_COUNT + 1 }, () => []);
  for (const ayah of ayahs) if (ayah.page) pages[ayah.page]?.push(ayah);
  return pages;
}

async function main() {
  const started = Date.now();
  const [arabic, fa, de, surahs, meta] = await Promise.all([
    edition('quran-tajweed'),
    edition(TRANSLATIONS.fa),
    edition(TRANSLATIONS.de),
    get<RawSurah[]>('/surah'),
    get<RawMeta>('/meta'),
  ]);
  const list = surahList(surahs);
  const index = quranIndex(meta);
  if (!list || !index) throw new Error('the surah list or the index is not whole');

  const arabicPages = byPage(arabic);
  const files: [string, unknown][] = [
    ['surahs.json', list],
    ['index.json', index],
  ];
  for (const [locale, ayahs] of [
    ['fa', fa],
    ['de', de],
  ] as const) {
    const translated = byPage(ayahs);
    for (let n = 1; n <= PAGE_COUNT; n += 1) {
      const page = mushafPage(n, arabicPages[n] ?? [], translated[n] ?? []);
      if (!page) throw new Error(`page ${n} (${locale}) does not line up`);
      files.push([join(locale, `${n}.json`), page]);
    }
  }

  // Everything was built before anything is written, so a failure above
  // never leaves half a book behind.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'fa'), { recursive: true });
  await mkdir(join(OUT, 'de'), { recursive: true });
  await Promise.all(files.map(([name, data]) => writeFile(join(OUT, name), JSON.stringify(data))));
  console.log(
    `[quran-data] wrote ${files.length} files in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
}

main().catch(async (error) => {
  await rm(OUT, { recursive: true, force: true }).catch(() => {});
  console.warn('[quran-data] not written; the site will ask the API instead:', error);
});
