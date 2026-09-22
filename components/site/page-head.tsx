import type { ReactNode } from 'react';
import { Words } from './words';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { PageHeader } from '@/lib/db/queries/content';

/**
 * The dateline rail plus the thick–thin head pair that opens every page.
 * Flush left, with the whitespace collecting on the right.
 */
export function PageHead({
  header,
  locale,
  aside,
}: {
  header: PageHeader;
  locale: Locale;
  aside?: ReactNode;
}) {
  return (
    <header className="section-tight" data-rise>
      <div className="page">
        <div className="rail">
          <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
            <EditableText
              as="p"
              entity="page"
              id={header.id}
              field="kicker"
              locale={locale}
              value={header.kicker}
              className="kicker"
            />
            {aside}
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <EditableText
              as="h1"
              entity="page"
              id={header.id}
              field="title"
              locale={locale}
              value={header.title}
              style={{ fontSize: 'var(--text-4xl)' }}
              words
            />
            <EditableText
              as="p"
              entity="page"
              id={header.id}
              field="lead"
              locale={locale}
              value={header.lead}
              className="lead"
              multiline
              words="lines"
            />
          </div>
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
