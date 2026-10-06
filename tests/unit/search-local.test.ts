import { describe, it, expect } from 'vitest';
import { normalise, searchLocal, type IndexEntry } from '@/lib/search-local';

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
