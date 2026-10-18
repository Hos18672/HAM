import { describe, expect, it } from 'vitest';
import { pageFromQuery, surahOnPage } from '@/lib/quran-page-query';
import { withQuranPage } from '@/lib/search-static';
import type { SearchHit } from '@/lib/search';

describe('a Quran page in a search', () => {
  it('reads a page number, with or without the word for page', () => {
    expect(pageFromQuery('50')).toEqual({ page: 50, named: false });
    expect(pageFromQuery('۵۰')).toEqual({ page: 50, named: false });
    expect(pageFromQuery('Seite 50')).toEqual({ page: 50, named: true });
    expect(pageFromQuery('page 604')).toEqual({ page: 604, named: true });
    expect(pageFromQuery('S. 3')).toEqual({ page: 3, named: true });
    expect(pageFromQuery('صفحه ۱۲۰')).toEqual({ page: 120, named: true });
    expect(pageFromQuery('صفحهٔ ۱۲۰')).toEqual({ page: 120, named: true });
    expect(pageFromQuery('ص ۱۲۰')).toEqual({ page: 120, named: true });
  });

  it('leaves alone what is not a page of the book', () => {
    expect(pageFromQuery('0')).toBeNull();
    expect(pageFromQuery('605')).toBeNull();
    expect(pageFromQuery('Seite')).toBeNull();
    expect(pageFromQuery('Yasin')).toBeNull();
    expect(pageFromQuery('Sure 36')).toBeNull();
  });

  it('knows the surah a page is in', () => {
    const start = [0, 1, 2, 50, 77];
    expect(surahOnPage(1, start)).toBe(1);
    expect(surahOnPage(2, start)).toBe(2);
    expect(surahOnPage(49, start)).toBe(2);
    expect(surahOnPage(50, start)).toBe(3);
    expect(surahOnPage(600, start)).toBe(4);
  });

  it('puts the page among the site search hits', () => {
    const surah: SearchHit = {
      id: 'surah-50',
      kind: 'surah',
      title: '50. Qaf',
      excerpt: '',
      href: '/de/quran/page/518#surah-50',
      rank: 3,
    };
    const named = withQuranPage([surah], 'Seite 40', 'de');
    expect(named[0]).toMatchObject({
      kind: 'quranPage',
      href: '/de/quran/page/40',
      title: 'Seite 40',
    });
    expect(named[0].excerpt).toContain('Al-Baqara');
    expect(withQuranPage([], 'Seite 50', 'de')[0].excerpt).toContain('3. ');

    const bare = withQuranPage([surah], '50', 'de');
    expect(bare.map((hit) => hit.kind)).toEqual(['surah', 'quranPage']);

    expect(withQuranPage([surah], 'Qaf', 'de')).toEqual([surah]);
    expect(withQuranPage([], 'صفحه ۱', 'fa')[0]).toMatchObject({ title: 'صفحهٔ ۱' });
  });
});
