import { describe, expect, it } from 'vitest';
import { editionAyahs, mushafPage, quranIndex } from '@/lib/quran-build';
import { BASMALA, PAGE_COUNT } from '@/lib/quran-constants';

const surah = (number: number) => ({
  number,
  name: `س${number}`,
  englishName: `S-${number}`,
  revelationType: number === 2 ? 'Medinan' : 'Meccan',
});

describe('building the mushaf from whole editions', () => {
  const arabic = editionAyahs({
    surahs: [
      {
        ...surah(1),
        ayahs: [{ numberInSurah: 1, text: 'الحمد', juz: 1, page: 1, sajda: false }],
      },
      {
        ...surah(2),
        ayahs: [
          { numberInSurah: 1, text: `${BASMALA} الم`, juz: 1, page: 2, sajda: false },
          { numberInSurah: 2, text: 'ذلك', juz: 1, page: 2, sajda: { id: 1 } },
        ],
      },
    ],
  });
  const translation = editionAyahs({
    surahs: [
      { ...surah(1), ayahs: [{ numberInSurah: 1, text: 'Lob', juz: 1, page: 1, sajda: false }] },
      {
        ...surah(2),
        ayahs: [
          { numberInSurah: 1, text: 'Alif', juz: 1, page: 2, sajda: false },
          { numberInSurah: 2, text: 'Das', juz: 1, page: 2, sajda: false },
        ],
      },
    ],
  });

  it('gives each verse its surah, with the surah’s length', () => {
    expect(arabic).toHaveLength(3);
    expect(arabic[1]!.surah).toMatchObject({ number: 2, numberOfAyahs: 2 });
  });

  it('makes a page as the API’s page endpoint would', () => {
    const on = (n: number) => (a: { page?: number }) => a.page === n;
    const page = mushafPage(2, arabic.filter(on(2)), translation.filter(on(2)))!;
    expect(page.number).toBe(2);
    expect(page.surahs[2]).toMatchObject({ transliteration: 'S-2', revelation: 'medinan' });
    // The Basmala folded into verse one is set apart, as the reader expects.
    expect(page.ayahs[0]!.segments.map((s) => s.text).join('')).toBe('الم');
    expect(page.ayahs[0]!.translation).toBe('Alif');
    expect(page.ayahs[1]!.sajda).toBe(true);
  });

  it('refuses a page whose translation does not line up', () => {
    expect(mushafPage(2, arabic.slice(1), translation.slice(2))).toBeNull();
    expect(mushafPage(3, [], [])).toBeNull();
  });
});

describe('the index of surahs and juz', () => {
  it('finds the page each begins on', () => {
    // Surah s begins on page s; every later page continues the last surah.
    const pages = Array.from({ length: PAGE_COUNT }, (_, i) => ({
      surah: Math.min(i + 1, 114),
      ayah: i < 114 ? 1 : i,
    }));
    const juzs = Array.from({ length: 30 }, (_, i) => pages[i * 20]!);
    const index = quranIndex({ pages: { references: pages }, juzs: { references: juzs } })!;
    expect(index.surahPage[1]).toBe(1);
    expect(index.surahPage[114]).toBe(114);
    expect(index.juzPage[2]).toBe(21);
    expect(index.juzPage).toHaveLength(31);
  });
});
