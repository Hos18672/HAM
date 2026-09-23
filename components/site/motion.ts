import type { CSSProperties } from 'react';

/**
 * A reveal delay, in the design's own terms.
 *
 * The prototype writes `--d` straight onto an element to place it in a
 * sequence — a lead, then its facts, then its button — and the stylesheet adds
 * that to whatever stagger the scroll observer works out for the batch. This
 * only exists because a bare custom property in a `style` object does not
 * type-check; the value it returns is the same `--d`.
 */
export function delay(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties;
}
