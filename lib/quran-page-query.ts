import { PAGE_COUNT } from './quran-constants';

/**
 * A page of the mushaf, asked for in a search: "50", "۵۰", "Seite 50",
 * "S. 50", "page 50", "صفحه ۵۰", "صفحهٔ ۵۰" or "ص ۵۰". `named` is whether the
 * query said "page" — then the page is all it asked for; a bare number may
 * as well be a surah's.
 */
export function pageFromQuery(query: string): { page: number; named: boolean } | null {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
  const match = /^(?:(seite|s\.|page|pg\.?|p\.|صفحه[ٔ]?|صفحۀ|ص\.?)\s*)?(\d{1,3})$/u.exec(q);
  if (!match) return null;
  const page = Number(match[2]);
  if (page < 1 || page > PAGE_COUNT) return null;
  return { page, named: Boolean(match[1]) };
}

/**
 * The surah a page is in: the last one to begin on it or before it.
 * `startPage` is indexed by surah number, 1–114.
 */
export function surahOnPage(page: number, startPage: readonly number[]): number {
  let surah = 1;
  for (let s = 1; s < startPage.length; s++) {
    if ((startPage[s] ?? Infinity) <= page) surah = s;
    else break;
  }
  return surah;
}
