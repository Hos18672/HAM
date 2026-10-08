import { describe, it, expect } from 'vitest';
import { presentSize } from '@/components/site/rd/present';

/**
 * In a hall the verse has to fill the wall without running off it: three
 * words set at the size of forty waste the screen, forty set at the size of
 * three cannot be read from the back. The boundaries are what is worth
 * pinning down.
 */
describe('how big a verse or line is set in presentation', () => {
  it('takes the step its length falls in', () => {
    expect(presentSize(0)).toBe('l');
    expect(presentSize(89)).toBe('l');
    expect(presentSize(90)).toBe('m');
    expect(presentSize(219)).toBe('m');
    expect(presentSize(220)).toBe('s');
    expect(presentSize(479)).toBe('s');
    expect(presentSize(480)).toBe('xs');
    expect(presentSize(5000)).toBe('xs');
  });
});
