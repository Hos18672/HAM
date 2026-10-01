import { describe, it, expect } from 'vitest';
import { verseSize } from '@/components/site/quran-present';

/**
 * In a hall the verse has to fill the wall without running off it, and the
 * verses are not the same length: three words set at the size of forty
 * wastes the screen, forty set at the size of three cannot be read from the
 * back. These are the four steps of the reference, and the boundaries
 * between them are the part worth pinning down.
 */
describe('how big a verse is set in presentation', () => {
  it('takes the step its length falls in', () => {
    expect(verseSize(0)).toBe('clamp(40px, 6.6vw, 108px)');
    expect(verseSize(89)).toBe('clamp(40px, 6.6vw, 108px)');
    expect(verseSize(90)).toBe('clamp(32px, 5vw, 80px)');
    expect(verseSize(219)).toBe('clamp(32px, 5vw, 80px)');
    expect(verseSize(220)).toBe('clamp(26px, 3.6vw, 58px)');
    expect(verseSize(449)).toBe('clamp(26px, 3.6vw, 58px)');
    expect(verseSize(450)).toBe('clamp(22px, 2.7vw, 44px)');
    expect(verseSize(5000)).toBe('clamp(22px, 2.7vw, 44px)');
  });

  it('never grows as the verse gets longer', () => {
    const smallest = (step: string) => Number(/clamp\((\d+)px/.exec(step)![1]);
    let previous = Infinity;
    for (const length of [0, 50, 89, 90, 150, 219, 220, 300, 449, 450, 900]) {
      const size = smallest(verseSize(length));
      expect(size, `at ${length} characters`).toBeLessThanOrEqual(previous);
      previous = size;
    }
  });
});
