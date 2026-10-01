import { describe, it, expect } from 'vitest';
import { DUA_TEXT_SLUGS, duaText, isRubric } from '@/lib/dua-texts';

/**
 * The texts are data, and the one thing data of this size gets wrong is a
 * line that quietly lost its translation when a file was regenerated. These
 * are the checks a reader would otherwise make for us, by finding a gap.
 */
describe('The du’a texts', () => {
  it('covers every du’a the page links to', () => {
    expect(DUA_TEXT_SLUGS.length).toBeGreaterThanOrEqual(13);
    for (const slug of DUA_TEXT_SLUGS) {
      expect(duaText(slug)!.lines.length, slug).toBeGreaterThan(0);
    }
  });

  it.each(DUA_TEXT_SLUGS)('%s is translated into both languages, line by line', (slug) => {
    const { lines } = duaText(slug)!;
    lines.forEach((line, index) => {
      const [arabic, persian, german] = line;
      const where = `${slug} line ${index + 1}`;
      // A rubric has no Arabic: it is an instruction, not words to recite.
      if (arabic !== null) expect(arabic.trim(), where).not.toBe('');
      expect(persian.trim(), `${where} (fa)`).not.toBe('');
      expect(german.trim(), `${where} (de)`).not.toBe('');
    });
  });

  it('writes the Arabic in Arabic script and the German in Latin', () => {
    const arabicScript = /[؀-ۿ]/;
    const latin = /[A-Za-zÄÖÜäöüß]/;
    for (const slug of DUA_TEXT_SLUGS) {
      for (const line of duaText(slug)!.lines) {
        if (isRubric(line)) continue;
        expect(arabicScript.test(line[0]!), `${slug}: ${line[0]}`).toBe(true);
        expect(latin.test(line[2]), `${slug}: ${line[2]}`).toBe(true);
        expect(arabicScript.test(line[1]), `${slug}: ${line[1]}`).toBe(true);
      }
    }
  });

  it('keeps the thousand names of the Dschauschan together', () => {
    // One line per section, each closing with the refrain — the one text
    // where a dropped line would be hard to notice by eye.
    const lines = duaText('jawshan-kabir')!.lines;
    const sections = lines.filter((line) => /^\(\d+\)/.test(line[2]));
    expect(sections).toHaveLength(100);
    for (const line of sections) {
      expect(line[2], line[2].slice(0, 40)).toContain('Rette uns vor dem Feuer');
    }
  });
});
