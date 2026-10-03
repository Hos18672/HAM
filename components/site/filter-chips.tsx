'use client';

import { useLocale, useTranslations } from 'next-intl';
import { digits } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import { FilterTag } from '../ui/tag';

/**
 * A row of filter chips. The filtering itself is client-side over a list the
 * server already rendered: the collections here are a few dozen items at most,
 * so a round trip per chip would be slower and would cost the reader their
 * scroll position.
 */
export function FilterChips({
  categories,
  active,
  onChange,
  label,
  labelNamespace,
  counts,
}: {
  categories: string[];
  active: string;
  onChange: (value: string) => void;
  label: string;
  /** Message namespace holding `category.<key>` labels. */
  labelNamespace: 'courses' | 'gallery' | 'duas' | 'events' | 'sport';
  /** How many items each chip would show, keyed by category, plus `all`. */
  counts?: Record<string, number>;
}) {
  const locale = useLocale() as Locale;
  const count = (key: string) =>
    counts?.[key] !== undefined ? (
      <span className="chip-count">{digits(counts[key]!, locale)}</span>
    ) : null;
  const t = useTranslations(labelNamespace);
  const tActions = useTranslations('actions');

  const labelFor = (key: string) => (t.has(`category.${key}`) ? t(`category.${key}`) : key);

  return (
    <div role="group" aria-label={label} className="chips">
      <FilterTag pressed={active === 'all'} onClick={() => onChange('all')}>
        {tActions('all')}
        {count('all')}
      </FilterTag>
      {categories.map((category) => (
        <FilterTag key={category} pressed={active === category} onClick={() => onChange(category)}>
          {labelFor(category)}
          {count(category)}
        </FilterTag>
      ))}
    </div>
  );
}
