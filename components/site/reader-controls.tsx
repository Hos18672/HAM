'use client';

import { useTranslations } from 'next-intl';
import {
  CornersIn,
  CornersOut,
  Minus,
  Plus,
  Presentation,
  TextAa,
} from '@phosphor-icons/react/dist/ssr';
import { digits } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import type { Reader } from './use-reader';

/**
 * The two controls a long text needs and the site did not have: how big the
 * letters are, and whether the reading takes the whole screen.
 *
 * They sit in the same toolbar as everything else rather than appearing only
 * once the screen is full — a reader looking for larger type should not have
 * to discover fullscreen first — and the toolbar goes into the overlay with
 * them, so nothing is given up by filling the screen.
 */
export function ReaderControls({ reader, locale }: { reader: Reader; locale: Locale }) {
  const t = useTranslations('reader');

  return (
    <>
      <div className="reader-size" role="group" aria-label={t('textSize')}>
        <TextAa size={17} weight="duotone" aria-hidden="true" />
        <button
          type="button"
          onClick={reader.smaller}
          disabled={!reader.canReduce}
          aria-label={t('smaller')}
        >
          <Minus size={13} weight="bold" aria-hidden="true" />
        </button>
        {/* The reading, so a reader can see they have changed something and
            find their way back to where they started. */}
        <span className="reader-size-value tabular" aria-hidden="true">
          {digits(Math.round(reader.scale * 100), locale)}%
        </span>
        <button
          type="button"
          onClick={reader.larger}
          disabled={!reader.canEnlarge}
          aria-label={t('larger')}
        >
          <Plus size={13} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        className="mushaf-switch reader-full-btn"
        aria-pressed={reader.full}
        onClick={reader.toggleFull}
      >
        {reader.full ? (
          <CornersIn size={17} weight="duotone" aria-hidden="true" />
        ) : (
          <CornersOut size={17} weight="duotone" aria-hidden="true" />
        )}
        {/* The word is the button's name to a screen reader whether or not
            there is room to show it: on a narrow screen in fullscreen it is
            hidden rather than dropped, so nothing is cut off at the edge. */}
        <span className="reader-btn-label">
          {reader.full ? t('exitFullscreen') : t('fullscreen')}
        </span>
      </button>

      {/* For the hall and for a large monitor: one page, type sized to the
          room, and the controls out of the way until a hand comes near. */}
      <button
        type="button"
        className="mushaf-switch reader-full-btn reader-present-btn"
        aria-pressed={reader.presenting}
        onClick={reader.togglePresenting}
      >
        <Presentation size={17} weight="duotone" aria-hidden="true" />
        <span className="reader-btn-label">
          {reader.presenting ? t('exitPresentation') : t('presentation')}
        </span>
      </button>
    </>
  );
}
