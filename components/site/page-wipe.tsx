'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from '@/lib/i18n/navigation';

/**
 * The crescent panel that sweeps across on navigation.
 *
 * The design's own page transition: a band-coloured panel with a curved
 * leading edge and a gold hairline, entering from the start edge, holding for
 * a beat, and leaving by the end edge — mirrored in RTL, where it travels the
 * other way and the curve flips with it.
 *
 * It never takes a click: the layer is `pointer-events: none` and aria-hidden,
 * and it unmounts the moment its animation ends. It is skipped entirely on the
 * first paint — a wipe on arrival would be covering nothing — and under
 * reduced motion.
 *
 * One departure from the prototype, on purpose. There the page content waits
 * 420ms so the wipe is at full cover before anything appears; that works when
 * the pages are sections of one document. Here a navigation is a real one, and
 * holding the content back by 420ms on a community site — where the same
 * people return to check a prayer time — costs more than the effect is worth.
 * The content arrives at once and the panel sweeps over it.
 */
export function PageWipe() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const [run, setRun] = useState(0);

  // A client-side route change: the ordinary case on a server.
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setRun((n) => n + 1);
  }, [pathname]);

  // A real page load that came from elsewhere on this site.
  //
  // Not every navigation is client-side. A static host cannot serve the
  // router's payloads, so it falls back to loading the page outright — and
  // the whole transition was silently absent there, which is most of a
  // preview's navigation. The same is true of a middle-click, an opened
  // bookmark within the site, or a browser that has dropped the router.
  // Arriving from our own origin is the signal; a first visit or a reload is
  // not, and neither gets a wipe over content that was already there.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (entry && entry.type !== 'navigate') return;
    if (!document.referrer) return;
    try {
      if (new URL(document.referrer).origin !== window.location.origin) return;
    } catch {
      return;
    }
    setRun((n) => n + 1);
    // Once, on arrival.
  }, []);

  if (run === 0) return null;

  return (
    <div className="wipe" aria-hidden="true">
      <div key={run} className="wipe-panel" onAnimationEnd={() => setRun(0)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0Q9 50 0 100H88Q100 50 88 0Z" fill="var(--band)" />
          <path
            d="M88 0Q100 50 88 100"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1"
            strokeOpacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
