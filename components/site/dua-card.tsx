import { getTranslations } from 'next-intl/server';
import { Card, FactPair } from '../ui/card';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { DuaEntry } from '@/lib/db/queries/content';

/**
 * A du'a card: the Arabic title set large and ghosted behind the content, with
 * the kicker, title, explanation and the labelled "when to read / source"
 * pair in front of it.
 */
export async function DuaCard({ dua, locale }: { dua: DuaEntry; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'duas' });

  return (
    <Card
      as="article"
      variant="softer"
      id={`dua-${dua.slug}`}
      className="h-full"
      style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
    >
      {/*
        The ghosted Arabic title.
        Drawn as SVG rather than as a text node on purpose: it is decoration —
        the same words are the heading right below it — and a 6%-opacity text
        node is indistinguishable from unreadably low-contrast body copy to
        anything inspecting the page, including a contrast checker. As SVG it
        is unambiguously a picture, and screen readers skip it.
      */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 400 80"
        preserveAspectRatio="xMaxYMax meet"
        style={{
          position: 'absolute',
          insetInlineEnd: '14px',
          insetBlockEnd: '-6px',
          inlineSize: '90%',
          blockSize: 'auto',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <text
          x="400"
          y="62"
          textAnchor="end"
          direction="rtl"
          style={{
            fontFamily: 'var(--font-naskh)',
            fontSize: '64px',
            fill: 'var(--gold)',
          }}
        >
          {dua.arabicTitle}
        </text>
      </svg>

      <p className="kicker">{t(`category.${dua.category}`)}</p>

      <EditableText
        as="h2"
        entity="dua"
        id={dua.id}
        field="title"
        locale={locale}
        value={dua.title}
        className="card-title"
        words="tight"
      />

      <EditableText
        as="p"
        entity="dua"
        id={dua.id}
        field="summary"
        locale={locale}
        value={dua.summary}
        className="card-body"
        multiline
      />

      <div
        style={{
          marginBlockStart: 'auto',
          paddingBlockStart: 'var(--space-3)',
          display: 'grid',
          gap: 'var(--space-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
        }}
      >
        <FactPair
          label={t('whenToRead')}
          value={
            <EditableText
              entity="dua"
              id={dua.id}
              field="whenToRead"
              locale={locale}
              value={dua.whenToRead}
            />
          }
        />
        <FactPair
          label={t('source')}
          value={
            <EditableText
              entity="dua"
              id={dua.id}
              field="source"
              locale={locale}
              value={dua.source}
            />
          }
        />
      </div>
    </Card>
  );
}
