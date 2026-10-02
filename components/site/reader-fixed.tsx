'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * The furniture that hangs on the window rather than on the page: the
 * arrows either side, the bar along the foot, the presentation overlay.
 *
 * It is portalled to the body because a transformed ancestor is the
 * containing block for anything fixed inside it, and this site reveals its
 * sections with a transform that stays on the wrapper after the animation.
 * Left in place, the foot sat two thousand pixels below the window.
 *
 * The custom properties come along by hand: a portal escapes the reader's
 * element, and with it the cascade that was carrying them.
 */
export function Fixed({
  children,
  scale,
  arSize,
  silent,
}: {
  children: ReactNode;
  scale: number;
  /** The Arabic's size, where the reader sets one. */
  arSize?: string;
  silent: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="qr-fixed"
      data-silent={silent ? 'on' : 'off'}
      style={
        {
          ...(arSize ? { ['--qr-ar' as string]: arSize } : {}),
          ['--qr-scale' as string]: scale,
        } as React.CSSProperties
      }
    >
      {children}
    </div>,
    document.body,
  );
}
