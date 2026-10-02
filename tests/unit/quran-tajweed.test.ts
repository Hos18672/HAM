import { describe, expect, it } from 'vitest';
import { parseTajweed } from '@/lib/quran-tajweed';

/** The text of a run of segments, as a reader would see it. */
const shown = (source: string) =>
  parseTajweed(source)
    .map((segment) => segment.text)
    .join('');

describe('parseTajweed', () => {
  it('marks the three silent rules and leaves the rest of the text alone', () => {
    expect(parseTajweed('بِ[h:1[ٱ]سْمِ')).toEqual([
      { text: 'بِ' },
      { text: 'ٱ', silent: 'wasl' },
      { text: 'سْمِ' },
    ]);
    expect(parseTajweed('ٱ[l[ل]شَّمْسِ')).toEqual([
      { text: 'ٱ' },
      { text: 'ل', silent: 'lam' },
      { text: 'شَّمْسِ' },
    ]);
    expect(parseTajweed('أَنَا۠[s[ا]')).toEqual([
      { text: 'أَنَا۠' },
      { text: 'ا', silent: 'silent' },
    ]);
  });

  it('keeps the text of a rule it does not mark', () => {
    // Ghunnah, the lengthenings, the assimilations: the letters are spoken,
    // so they are set in the ordinary ink.
    expect(parseTajweed('مِن[g[ نَ]عْمَةٍ')).toEqual([{ text: 'مِن نَعْمَةٍ' }]);
  });

  /* The shapes that used to put Latin letters on the page. */

  it('swallows a rule that carries no text of its own', () => {
    // `[g]` was printed mid-verse, in the middle of صُمٌّ وَبُكْمٌ.
    expect(shown('صُمٌّ [g]وَبُكْمٌ')).toBe('صُمٌّ وَبُكْمٌ');
    expect(shown('[g]')).toBe('');
  });

  it('swallows a second closing bracket', () => {
    expect(parseTajweed('بِ[h:1[ٱ]]سْمِ')).toEqual([
      { text: 'بِ' },
      { text: 'ٱ', silent: 'wasl' },
      { text: 'سْمِ' },
    ]);
  });

  it('reads a rule inside another, innermost first', () => {
    expect(parseTajweed('[n[مِن[h:1[ٱ]لْ]كِتَٰبِ')).toEqual([
      { text: 'مِن' },
      { text: 'ٱ', silent: 'wasl' },
      { text: 'لْكِتَٰبِ' },
    ]);
  });

  it('shows no Latin letter, figure or bracket whatever the markup', () => {
    for (const source of [
      'ٱلْحَمْدُ [zz[لِلَّهِ]',
      'ٱلْحَمْدُ [q:17[لِلَّهِ]]',
      'ٱلْحَمْدُ [c]لِلَّهِ',
      'ٱلْحَمْدُ ]لِلَّهِ',
      'ٱلْحَمْدُ [لِلَّهِ',
    ])
      expect(shown(source)).toMatch(/^[^A-Za-z0-9[\]:]+$/);
  });

  it('keeps the spaces between the words', () => {
    expect(shown('[h:1[ٱ]لْحَمْدُ لِلَّهِ رَبِّ [g[ٱلْ]عَٰلَمِينَ')).toBe(
      'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    );
  });

  it('strips a byte-order mark and runs neighbouring plain text together', () => {
    expect(parseTajweed('﻿قُلْ هُوَ')).toEqual([{ text: 'قُلْ هُوَ' }]);
  });
});
