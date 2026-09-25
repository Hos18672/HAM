'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { HomecomingControl } from '@/lib/homecoming/src/mount.js';
import { Mark, PatternPlate, Ring } from './ornaments';
import type { ThemeValue } from './theme';

/**
 * The home hero, and the loader that builds it.
 *
 * The scene in `lib/homecoming` is one Three.js canvas that runs from the
 * first frame of loading through to the interactive hero: flocks fly in from
 * the edges, each bird lands on its spot and that piece of the house's mark
 * appears, right to left; at 100% a light crosses the finished mark, it
 * glides into its place in the layout, and the header and the copy fade in.
 * After that the birds answer the pointer.
 *
 * This file is only the scaffolding the scene needs — the section it covers,
 * the square it lands in, the caption and the progress line — plus the wiring
 * to this app's theme, locale and page states. Nothing in `lib/homecoming/src`
 * is touched: no bird counts, timings, colours or flight logic.
 *
 * The copy is passed in as `children` so it stays server-rendered: the
 * headline, the lead and the buttons are in the HTML whether or not the
 * canvas ever runs.
 */

/** The loader plays once per page load, not once per visit to the route. */
let loaderPlayed = false;

export function HomecomingHero({
  theme,
  captionTitle,
  captionSub,
  children,
}: {
  theme: ThemeValue;
  /** The house's name, in the reader's language. */
  captionTitle: string;
  /** The Latin subtitle under it, always LTR. */
  captionSub: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const control = useRef<HomecomingControl | null>(null);

  // Drawn rather than rendered: shown when the scene cannot run at all.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let disposed = false;

    // The import is dynamic so Three.js never reaches the server bundle and
    // never sits on the critical path of any other page.
    void import('@/lib/homecoming/src/mount.js').then(({ mountHomecoming, hasWebGL2 }) => {
      if (disposed || !hostRef.current) return;
      if (!hasWebGL2()) setFailed(true);

      // The loader belongs to a real load of the home page. Arriving here
      // from another page inside the app — where the header and the copy are
      // already on screen — goes straight to the hero instead: hiding them
      // again to play a four-second loader would be a strange thing to do to
      // someone who has just clicked "Startseite". The head script marks a
      // genuine home-page load by setting `data-hc="boot"`.
      const booted = document.documentElement.dataset.hc === 'boot';

      control.current = mountHomecoming({
        host: hostRef.current,
        anchor: slotRef.current,
        eventsEl: sectionRef.current,
        meterEl: meterRef.current,
        theme,
        skipLoader: loaderPlayed || !booted,
        fallbackImage: undefined,
        onReady: () => {
          loaderPlayed = true;
        },
        onError: () => setFailed(true),
        sceneOptions: {
          // This app keeps the theme on <html data-theme>, so the scene can
          // follow it directly and the colours glide on a toggle.
          themeEl: document.documentElement,
          themeAttr: 'data-theme',
        },
      });
    });

    // StrictMode mounts, unmounts and mounts again in development; dispose()
    // is complete, so the second mount simply starts over.
    return () => {
      disposed = true;
      control.current?.dispose();
      control.current = null;
    };
    // Mounted once. Theme changes go through setTheme below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    control.current?.setTheme(theme);
  }, [theme]);

  return (
    <section
      ref={sectionRef}
      className="hc-hero"
      style={{
        position: 'relative',
        background: 'var(--band)',
        color: 'var(--bandInk)',
        overflow: 'hidden',
      }}
    >
      {/* The site's own hero ground stays underneath: the canvas is
          transparent and sits on top of it. */}
      <PatternPlate tiling="shesh" drift opacity={0.75} />
      <Ring />

      <div ref={hostRef} className="hc-host" aria-hidden="true">
        <div className="hc-cap">
          <p className="hc-cap-title">{captionTitle}</p>
          <p className="hc-cap-sub ltr-island" dir="ltr">
            {captionSub}
          </p>
          <div className="hc-meter">
            <i ref={meterRef} />
          </div>
        </div>
      </div>

      <div className="hc-inner">
        <div className="hc-copy">{children}</div>

        {/* Where the mark comes to rest. */}
        <div ref={slotRef} className="hc-slot" aria-hidden="true">
          {failed ? (
            <div
              style={{
                position: 'absolute',
                inset: '13%',
              }}
            >
              <Mark className="" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
