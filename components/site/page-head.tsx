import type { ReactNode } from 'react';
import { Words } from './words';
import { PatternPlate, Ring } from './ornaments';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { PageHeader } from '@/lib/db/queries/content';

/**
 * The band that opens every page but the home page.

 * The design gives all fifteen sub-pages the same head: a full-bleed band of
 * the deep green with the girih ground drifting behind it, a gold ring-and-dot
 * beside the kicker, the title set large on the band's own near-white, and the
 * lead under it. It is the one piece of furniture every page shares, and it is
 * what tells you at a glance that you have arrived somewhere.
 */
export function PageHead({ header, locale }: { header: PageHeader; locale: Locale }) {
  return (
    <header className="section-band" style={{ paddingBlock: 'clamp(48px, 6vw, 96px)' }} data-rise>
      <PatternPlate tiling="shesh" drift opacity={0.7} />
      <Ring />

      <div className="page" style={{ position: 'relative' }}>
        <div style={{ maxInlineSize: '32em' }}>
          <div className="flex items-center gap-3">
            {/* The ring and dot: the design's mark for a page kicker. */}
            <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
              <circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
              <circle cx="13" cy="13" r="3.6" fill="var(--gold)" />
            </svg>
            <EditableText
              as="span"
              entity="page"
              id={header.id}
              field="kicker"
              locale={locale}
              value={header.kicker}
              className="kicker"
              style={{ color: 'var(--gold)' }}
            />
          </div>

          <EditableText
            as="h1"
            entity="page"
            id={header.id}
            field="title"
            locale={locale}
            value={header.title}
            style={{
              marginBlockStart: '20px',
              fontSize: 'clamp(33px, 4.8vw, 58px)',
              lineHeight: 1.08,
              color: 'var(--bandHead)',
            }}
            words="hero"
          />

          <EditableText
            as="p"
            entity="page"
            id={header.id}
            field="lead"
            locale={locale}
            value={header.lead}
            style={{
              marginBlockStart: '22px',
              fontSize: 'clamp(16px, 1.5vw, 18.5px)',
              lineHeight: 1.85,
              color: 'var(--bandDim)',
            }}
            multiline
            words="lines"
          />
        </div>
      </div>
    </header>
  );
}

/** A section heading in the same idiom, for the blocks below the head. */
export function SectionHead({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      style={{ display: 'grid', gap: 'var(--space-2)', marginBlockEnd: 'var(--space-5)' }}
      data-rise
    >
      {kicker ? <p className="kicker">{kicker}</p> : null}
      {/* A heading given as a plain string reveals a word at a time, like every
          other heading on the site; one built from elements is left alone. */}
      {typeof title === 'string' ? (
        <Words as="h2" style={{ fontSize: 'var(--text-3xl)' }}>
          {title}
        </Words>
      ) : title ? (
        <h2 style={{ fontSize: 'var(--text-3xl)' }}>{title}</h2>
      ) : null}
      {children}
    </div>
  );
}
