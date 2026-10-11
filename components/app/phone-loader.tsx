'use client';

import { useEffect, useRef } from 'react';
import { PatternPlate } from '@/components/site/ornaments';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** How long the hand-over runs (the mark settling, the birds opening into
 *  their ring) before the screen fades onto the page. */
const HOLD_MS = 1400;
/** The fade itself; matches `.a-loader[data-out]` in app-shell.css. */
const FADE_MS = 500;

/**
 * The loader on a phone and in the app: the desktop hero's own scene — birds
 * fly in and build the mark, a light passes over it — on the same green band,
 * full screen. When it hands over, the screen fades onto whatever page was
 * opened and the scene is disposed.
 *
 * Armed by a script in the head (`data-splash` on <html>): only below 1024px,
 * once per browsing session, never with reduced motion. Unarmed, the overlay
 * is `display: none` and Three.js is never fetched. The markup is in the
 * server HTML so the band is there from the first paint, with no flash of the
 * page underneath while the scene downloads.
 */
export function PhoneLoader({
  captionTitle,
  captionSub,
}: {
  captionTitle: string;
  captionSub: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    if (!root || html.dataset.splash !== '1') return undefined;

    root.dataset.live = '';
    let disposed = false;
    let control: { dispose(): void } | null = null;
    const timers: number[] = [];

    const finish = () => {
      control?.dispose();
      control = null;
      // The scene leaves `data-hc="ready"` behind; nothing on a phone reads
      // it, and a later desktop-width hero must find the page unmarked.
      delete html.dataset.hc;
      delete html.dataset.splash;
    };
    const leave = () => {
      if (disposed) return;
      timers.push(
        window.setTimeout(() => {
          root.dataset.out = '';
          timers.push(window.setTimeout(finish, FADE_MS));
        }, HOLD_MS),
      );
    };

    void import('@/lib/homecoming/src/mount.js')
      .then(({ mountHomecoming }) => {
        if (disposed || !hostRef.current) return;
        control = mountHomecoming({
          host: hostRef.current,
          anchor: slotRef.current,
          meterEl: meterRef.current,
          theme: html.dataset.theme === 'dark' ? 'dark' : 'light',
          // Without WebGL 2 the mark is shown in the slot instead.
          fallbackImage: `${BASE}/logo.png`,
          onReady: leave,
          sceneOptions: { themeEl: html, themeAttr: 'data-theme' },
        });
      })
      .catch(() => {
        // The chunk failed to load (offline on a first visit): just open.
        root.dataset.out = '';
        timers.push(window.setTimeout(finish, FADE_MS));
      });

    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      finish();
    };
  }, []);

  return (
    <div ref={rootRef} className="a-loader" aria-hidden="true">
      <PatternPlate tiling="shesh" drift opacity={0.75} />
      <div ref={hostRef} className="hc-host">
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
      {/* Where the mark comes to rest: the middle of the screen. */}
      <div ref={slotRef} className="a-loader-slot" />
    </div>
  );
}
