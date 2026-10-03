import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { duaText } from '@/lib/dua-texts';
import { Card } from '../ui/card';
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
  const hasText = duaText(dua.slug) !== null;

  const factLabel = {
    flex: 'none' as const,
    minInlineSize: '7.5em',
    color: 'var(--color-accent-2-text)',
    fontWeight: 'var(--weight-semibold)',
  };

  return (
    <Card
      as="article"
      id={`dua-${dua.slug}`}
      className="dua card-linked h-full"
      style={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        gap: 'var(--space-3)',
        padding: 'clamp(22px, 2.4vw, 30px)',
      }}
    >
      <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
        {t(`category.${dua.category}`)}
      </p>

      {/* The whole card opens the text: the title's link covers it. */}
      <h2 className="card-title">
        {hasText ? (
          <Link href={`/${locale}/duas/${dua.slug}`} className="card-link">
            <EditableText
              entity="dua"
              id={dua.id}
              field="title"
              locale={locale}
              value={dua.title}
            />
          </Link>
        ) : (
          <EditableText entity="dua" id={dua.id} field="title" locale={locale} value={dua.title} />
        )}
      </h2>

      <EditableText
        as="p"
        entity="dua"
        id={dua.id}
        field="summary"
        locale={locale}
        value={dua.summary}
        className="card-body"
        multiline
        rise
      />

      {/* The text itself, where there is one. The card is a card; this is
          the way in to the reading. */}
      {hasText ? (
        <span className="card-go" aria-hidden="true">
          {t('readFull')}
          <ArrowRight size={15} weight="bold" className="mirror" />
        </span>
      ) : null}

      {/* The two facts, under the design's hairline: the label held at a fixed
          width so the values line up down the card. */}
      <div
        style={{
          marginBlockStart: 'auto',
          paddingBlockStart: 'var(--space-3)',
          borderBlockStart: 'var(--rule-hair) solid var(--line)',
          display: 'grid',
          gap: 'var(--space-2)',
          fontSize: 'var(--text-xs)',
          lineHeight: 'var(--leading-normal)',
        }}
      >
        <div className="flex gap-2">
          <span style={factLabel}>{t('whenToRead')}</span>
          <EditableText
            entity="dua"
            id={dua.id}
            field="whenToRead"
            locale={locale}
            value={dua.whenToRead}
          />
        </div>
        <div className="flex gap-2">
          <span style={factLabel}>{t('source')}</span>
          <EditableText
            entity="dua"
            id={dua.id}
            field="source"
            locale={locale}
            value={dua.source}
          />
        </div>
      </div>
    </Card>
  );
}
