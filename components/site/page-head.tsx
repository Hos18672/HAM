import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
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
export async function PageHead({ header, locale }: { header: PageHeader; locale: Locale }) {
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const here = tNav.has(header.key) ? tNav(header.key) : header.title;
  return (
    <header className="section-band page-head-band" data-rise>
      <PatternPlate tiling="shesh" drift opacity={0.7} />
      <Ring />

      <div className="page" style={{ position: 'relative' }}>
        <div style={{ maxInlineSize: '32em' }}>
          {/* A breadcrumb rather than a kicker: the kicker only ever repeated
              the title under it, while this says where the page sits. */}
          <nav aria-label={tNav('breadcrumb')} className="crumbs">
            <ol>
              <li>
                <Link href="/">{tNav('home')}</Link>
              </li>
              <li aria-hidden="true" className="crumbs-sep">
                <CaretRight size={12} weight="bold" className="mirror" />
              </li>
              <li>
                <span aria-current="page">{here}</span>
              </li>
            </ol>
          </nav>

          <EditableText
            as="h1"
            entity="page"
            id={header.id}
            field="title"
            locale={locale}
            value={header.title}
            style={{
              marginBlockStart: '20px',
              fontSize: 'clamp(28px, 4.2vw, 50px)',
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
              fontSize: 'clamp(15.5px, 1.4vw, 18px)',
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
      {kicker ? <p className="kicker kicker-led">{kicker}</p> : null}
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
