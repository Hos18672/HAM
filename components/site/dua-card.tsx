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
      {/* The ghosted Arabic title. Presentational: the same words are already
          in the heading below, so a screen reader should not read them twice. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetInlineEnd: 'var(--space-2)',
          insetBlockStart: 'var(--space-1)',
          fontFamily: 'var(--font-naskh)',
          fontSize: 'clamp(var(--text-4xl), 9vw, var(--text-6xl))',
          lineHeight: 1,
          color: 'var(--color-ink)',
          opacity: 0.06,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {dua.arabicTitle}
      </span>

      <p className="kicker">{t(`category.${dua.category}`)}</p>

      <EditableText
        as="h2"
        entity="dua"
        id={dua.id}
        field="title"
        locale={locale}
        value={dua.title}
        className="card-title"
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
