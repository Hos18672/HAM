import type { SearchHit } from './search';

/**
 * The header search, done in the browser over a saved index — for the static
 * preview, which has no server for the search action to run on.
 *
 * Plain substring matching on normalised text: every word typed must appear
 * in the title or the excerpt. Normalising folds case and German accents
 * ("fur" finds "für") and the Arabic-script letters that look the same but
 * are encoded differently (Arabic yeh and kaf against the Persian ones, the
 * zero-width non-joiner, tatweel), so a Persian query matches however the
 * content happened to be typed.
 */

export type IndexEntry = Omit<SearchHit, 'rank'>;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[‌‍]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchLocal(index: IndexEntry[], query: string, limit = 12): SearchHit[] {
  const q = normalise(query);
  const words = q.split(' ').filter((w) => w.length > 0);
  if (q.length < 2 || words.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const entry of index) {
    const title = normalise(entry.title);
    const body = normalise(entry.excerpt);
    if (!words.every((w) => title.includes(w) || body.includes(w))) continue;
    let rank = 0;
    if (title.includes(q)) rank += 3;
    if (title.startsWith(q)) rank += 1;
    for (const w of words) rank += title.includes(w) ? 2 : 1;
    hits.push({ ...entry, rank });
  }
  return hits.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title)).slice(0, limit);
}
