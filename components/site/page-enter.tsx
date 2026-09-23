'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from '@/lib/i18n/navigation';

/**
 * The page's own arrival.
 *
 * The design animates every page in — `hamPageIn`, a rise of 34px out of a
 * slight shrink, 420ms after the navigation. That delay is the design's own,
 * and it is the whole of its page transition: there is no panel, no wipe, no
 * cross-fade. The prototype does not contain one.
 *
 * This used to be a class on `<main>`, which is in the layout. That works
 * exactly once: the App Router keeps the layout's own elements across a
 * navigation and swaps only the children, so the CSS animation ran on the
 * first load and never again. Every in-site navigation snapped. Keying this
 * wrapper on the path gives React a new element each time, and a new element
 * runs its animation.
 *
 * The delay applies to navigations only. On the very first page of a visit
 * the boot screen is already covering, and on a return visit — where the boot
 * does not run again — 420ms of blank before anything appears would be a
 * stall with nothing bought by it.
 */

/** Whether this browsing session has painted a page yet. Module scope on
 *  purpose: it is a fact about the app, not about any one element. */
let hasPainted = false;

function Enter({ children }: { children: ReactNode }) {
  // Read once, when this instance mounts. The parent keys us by path, so a
  // navigation makes a new instance and asks the question again.
  const [delayed] = useState(() => hasPainted);

  useEffect(() => {
    hasPainted = true;
  }, []);

  return (
    <div
      className="page-enter"
      style={delayed ? { animationDelay: 'var(--duration-page-in-delay)' } : undefined}
    >
      {children}
    </div>
  );
}

export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <Enter key={pathname}>{children}</Enter>;
}
