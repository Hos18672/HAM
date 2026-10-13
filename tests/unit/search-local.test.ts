import { describe, it, expect } from 'vitest';
import { normalise, searchLocal, type IndexEntry } from '@/lib/search-local';
import { staticEntries } from '@/lib/search-static';
import { SURAHS } from '@/lib/surah-names';

const INDEX: IndexEntry[] = [
  {
    id: 'course-1',
    kind: 'course',
    title: 'Deutschkurs A1',
    excerpt: 'Für Anfängerinnen und Anfänger.',
    href: '/de/courses#course-deutsch-a1',
  },
  {
    id: 'event-1',
    kind: 'event',
    title: 'Infoabend zu den Kursen',
    excerpt: 'Saal im Erdgeschoß',
    href: '/de/events#event-infoabend',
  },
  {
    id: 'dua-1',
    kind: 'dua',
    title: 'دعای کمیل',
    excerpt: 'شب‌های جمعه',
    href: '/fa/duas#dua-kumail',
  },
];

describe('local search', () => {
  it('folds case, German accents and ß', () => {
    expect(normalise('FÜR Erdgeschoß')).toBe('fur erdgeschoss');
  });

  it('folds Arabic letter forms to the Persian ones', () => {
    expect(normalise('دعاي كميل')).toBe(normalise('دعای کمیل'));
  });

  it('finds a word inside a longer one, best title first', () => {
    const hits = searchLocal(INDEX, 'kurs');
    expect(hits.map((h) => h.id)).toEqual(['course-1', 'event-1']);
  });

  it('needs every word, in the title or the excerpt', () => {
    expect(searchLocal(INDEX, 'kurs saal').map((h) => h.id)).toEqual(['event-1']);
    expect(searchLocal(INDEX, 'kurs volleyball')).toEqual([]);
  });

  it('matches Persian typed with Arabic letters', () => {
    expect(searchLocal(INDEX, 'كميل').map((h) => h.id)).toEqual(['dua-1']);
  });

  it('ignores a query shorter than two letters', () => {
    expect(searchLocal(INDEX, 'k')).toEqual([]);
  });
});

describe('built-in search entries', () => {
  const top = (locale: 'de' | 'fa', query: string) =>
    searchLocal(staticEntries(locale), query, 1)[0]?.href;

  it('knows all 114 surahs', () => {
    expect(SURAHS).toHaveLength(114);
  });

  it('finds a surah by any of its names or its number', () => {
    expect(top('fa', 'بقره')).toBe('/fa/quran/page/2#surah-2');
    expect(top('fa', 'یاسین')).toBe('/fa/quran/page/440#surah-36');
    expect(top('fa', 'سوره ۲')).toBe('/fa/quran/page/2#surah-2');
    expect(top('de', 'Baqarah')).toBe('/de/quran/page/2#surah-2');
    expect(top('de', 'Die Höhle')).toBe('/de/quran/page/293#surah-18');
    expect(top('de', 'Sure 2')).toBe('/de/quran/page/2#surah-2');
  });

  it('finds a juz', () => {
    expect(top('de', 'Juz 5')).toBe('/de/quran/page/82');
    expect(top('fa', 'جزء ۳۰')).toBe('/fa/quran/page/582');
  });

  it('finds the pages and tools by what people call them', () => {
    expect(top('de', 'Kompass')).toBe('/de/qibla');
    expect(top('de', 'Maghrib')).toBe('/de/prayer');
    expect(top('de', 'Öffnungszeiten')).toBe('/de/contact');
    expect(top('fa', 'قبله نما')).toBe('/fa/qibla');
    expect(top('fa', 'تقویم')).toBe('/fa/calendar');
    expect(top('fa', 'تنظیمات')).toBe('/fa/settings');
  });
});
