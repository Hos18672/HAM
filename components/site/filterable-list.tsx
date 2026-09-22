'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FilterChips } from './filter-chips';

/**
 * Wraps a server-rendered list with a category filter.
 *
 * The children are pre-rendered Server Components, handed over as an array
 * with their category alongside — so filtering hides and shows already-built
 * markup rather than re-fetching, and the entries themselves stay on the
 * server where they can read the database and emit edit attributes.
 */
export function FilterableList({
  items,
  label,
  labelNamespace,
  emptyMessage,
  className,
}: {
  items: { key: string; category: string; node: ReactNode }[];
  label: string;
  labelNamespace: 'courses' | 'gallery' | 'duas';
  emptyMessage: string;
  className?: string;
}) {
  const tA11y = useTranslations('a11y');
  const [active, setActive] = useState('all');

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );

  const visible = active === 'all' ? items : items.filter((item) => item.category === active);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <FilterChips
        categories={categories}
        active={active}
        onChange={setActive}
        label={label}
        labelNamespace={labelNamespace}
      />

      {/* Announced so a screen reader learns the list changed. A bare "7" says
          nothing on its own, so this is a full sentence in the reader's
          language and numerals. */}
      <p className="visually-hidden" aria-live="polite">
        {tA11y('listCount', { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>{emptyMessage}</p>
      ) : (
        <ul className={className} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visible.map((item) => (
            <li key={item.key} data-rise>
              {item.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
