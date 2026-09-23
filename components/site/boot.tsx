'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mark } from './ornaments';

/** Where the design's own timing lands: draw, hold, then smoke away. */
const HOLD_MS = 1500;
const EXIT_MS = 1500;

/**
 * The opening screen.
 *
 * The design opens on a full-bleed band with the mark drawing itself in a gold
 * arc, the house's name arriving under it, a meter filling, and then the whole
 * thing blurring away in three drifting puffs of gold light. It is the first
 * thing the site does, and it was the largest piece of the design missing here.
 *
 * Two departures from the prototype, both deliberate:
 *
 * The prototype is one document, so its boot runs once per visit by
 * construction. This site is sixteen real pages, and three seconds of loader
 * on every navigation would be intolerable — so it runs once per browsing
 * session, recorded in `sessionStorage`, and never again until the tab is
 * closed.
 *
 * And it never waits for JavaScript to decide. The markup is in the server
 * HTML and an inline script in the document head turns it on before the first
 * paint, so it either covers the page from the very first frame or it never
 * appears at all — there is no flash of content that then gets covered. This
 * component only runs the clock that takes it away, and the same head script
 * carries a fallback timer in case this bundle never arrives.
 */
export function Boot() {
  const t = useTranslations('brand');
  const [phase, setPhase] = useState<'wait' | 'exit' | 'gone'>('wait');

  useEffect(() => {
    if (document.documentElement.dataset.boot !== '1') {
      setPhase('gone');
      return;
    }
    const toExit = window.setTimeout(() => setPhase('exit'), HOLD_MS);
    const toGone = window.setTimeout(() => {
      delete document.documentElement.dataset.boot;
      setPhase('gone');
    }, HOLD_MS + EXIT_MS);
    return () => {
      window.clearTimeout(toExit);
      window.clearTimeout(toGone);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className="boot" data-exit={phase === 'exit' ? '1' : undefined} aria-hidden="true">
      <span
        className="puff"
        style={
          {
            inlineSize: '44%',
            blockSize: '44%',
            insetBlockStart: '26%',
            insetInlineStart: '20%',
            '--dx': '-16%',
            '--dy': '-40%',
          } as React.CSSProperties
        }
      />
      <span
        className="puff"
        style={
          {
            inlineSize: '38%',
            blockSize: '38%',
            insetBlockStart: '40%',
            insetInlineStart: '52%',
            '--dx': '14%',
            '--dy': '-46%',
            animationDelay: '0.08s',
          } as React.CSSProperties
        }
      />
      <span
        className="puff"
        style={
          {
            inlineSize: '52%',
            blockSize: '52%',
            insetBlockStart: '52%',
            insetInlineStart: '30%',
            '--dx': '4%',
            '--dy': '-30%',
            animationDelay: '0.16s',
          } as React.CSSProperties
        }
      />

      {/* The same crescent panel the page transition uses, held at full cover. */}
      <div className="boot-panel">
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

      <div className="boot-in">
        <div className="boot-mark">
          {/* The arc that draws itself around the mark, and the slow orbit
              outside it. r=46 in a 100 box, so the dash length is 2πr. */}
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle
              className="dr"
              cx="50"
              cy="50"
              r="46"
              style={{ '--len': 289 } as React.CSSProperties}
              strokeWidth="1.5"
              strokeDasharray="289"
            />
          </svg>
          <svg className="boot-orbit" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="4" r="2" fill="var(--gold)" />
          </svg>
          <span className="boot-logo">
            <Mark className="" />
          </span>
        </div>

        <div style={{ display: 'grid', justifyItems: 'center', gap: '10px' }}>
          <p className="boot-word">{t('name')}</p>
          <p className="boot-sub ltr-island">{t('sub')} · Wien</p>
        </div>

        <div className="boot-meter">
          <i />
        </div>
      </div>
    </div>
  );
}
