'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/lib/i18n/navigation';

/**
 * The home page's intro: the seal settles, a ring draws round it, the name
 * rises and a line runs under it, and the overlay fades — 1.2 seconds over a
 * page that is already rendered underneath.
 *
 * The head script decides whether it plays (`data-intro="play"` on <html>):
 * the home page only, once per browsing session, never with reduced motion or
 * Save-Data. Without that attribute the overlay is `display: none`, so a
 * reader without JavaScript never sees it; with it, the CSS animation ends
 * hidden on its own. This component only takes the node away afterwards —
 * on `animationend`, after 2.5 s at the latest, and at once on a page
 * restored from the back/forward cache.
 */
export function Intro() {
  const t = useTranslations('brand');
  const home = usePathname() === '/';
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const finish = () => {
      delete root.dataset.intro;
      setGone(true);
    };
    if (root.dataset.intro !== 'play') {
      setGone(true);
      return undefined;
    }
    const onEnd = (event: AnimationEvent) => {
      if (event.animationName === 'intro-out') finish();
    };
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) finish();
    };
    document.addEventListener('animationend', onEnd);
    window.addEventListener('pageshow', onShow);
    const timer = window.setTimeout(finish, 2500);
    return () => {
      document.removeEventListener('animationend', onEnd);
      window.removeEventListener('pageshow', onShow);
      window.clearTimeout(timer);
    };
  }, []);

  if (gone || !home) return null;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return (
    <div className="intro" aria-hidden="true">
      <div className="intro-stage">
        <span className="intro-mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- the seal, at a known size */}
          <img src={`${base}/logo-160.webp`} alt="" width={80} height={80} />
          <svg className="intro-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" pathLength={1} />
          </svg>
        </span>
        <p className="intro-word">{t('name')}</p>
        <span className="intro-line" />
      </div>
    </div>
  );
}
