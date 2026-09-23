import { getTranslations } from 'next-intl/server';
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
      className="dua h-full"
      style={{
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        gap: 'var(--space-3)',
        padding: 'clamp(22px, 2.4vw, 30px)',
      }}
    >
      {/*
        The ghosted Arabic title.
        Drawn as SVG rather than as a text node on purpose: it is decoration —
        the same words are the heading right below it — and a 7%-opacity text
        node is indistinguishable from unreadably low-contrast body copy to
        anything inspecting the page, including a contrast checker. As SVG it
        is unambiguously a picture, and screen readers skip it.

        It sits at z-index 0, not -1: the card is an isolated stacking context,
        so a negative index would put it behind the card's own background and
        it would never be seen at all.
      */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 400 80"
        preserveAspectRatio="xMaxYMax meet"
        className="dua-ghost"
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

      <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
        {t(`category.${dua.category}`)}
      </p>

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
        rise
      />

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
