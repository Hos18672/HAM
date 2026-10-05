import { cn } from './cn';

/** A small green dot with a ring that swells and fades: something is live. */
export function PulseDot({ size = 8, className }: { size?: 8 | 10; className?: string }) {
  return (
    <span
      className={cn('pulse-dot', className)}
      style={{ inlineSize: size, blockSize: size }}
      aria-hidden="true"
    />
  );
}
