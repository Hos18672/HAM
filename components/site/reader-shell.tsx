'use client';

import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import type { Reader } from './use-reader';

/**
 * The box a reader reads in, and — when they ask for the whole screen — the
 * screen.
 *
 * Filling the screen has to be a portal to the body, not a `position: fixed`
 * where the reader happens to sit. The sections of this site are revealed on
 * scroll with a transform, and an element with a transform is the containing
 * block for anything fixed inside it: the overlay came out the size of the
 * section it was in, with the site's header above it and the footer below.
 * React keeps the state of children it moves, so the book does not lose its
 * page on the way.
 */
export function ReaderShell({
  reader,
  style,
  children,
}: {
  reader: Reader;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const content = (
    <div
      ref={reader.shellRef}
      className="reader-shell"
      data-full={reader.full ? 'true' : undefined}
      data-present={reader.presenting ? 'true' : undefined}
      data-idle={reader.presenting && reader.idle ? 'true' : undefined}
      style={{ ...style, '--reader-scale': reader.scale } as CSSProperties}
    >
      {children}
    </div>
  );

  // `full` is false on the server and on the first client render, so there is
  // never a portal without a body to put it in.
  return reader.full && typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
}
