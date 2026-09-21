'use client';

import { useTranslations } from 'next-intl';
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
}: {
  categories: string[];
  active: string;
  onChange: (value: string) => void;
  label: string;
  /** Message namespace holding `category.<key>` labels. */
  labelNamespace: 'courses' | 'gallery' | 'duas';
}) {
  const t = useTranslations(labelNamespace);
  const tActions = useTranslations('actions');

  const labelFor = (key: string) => (t.has(`category.${key}`) ? t(`category.${key}`) : key);

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      <FilterTag pressed={active === 'all'} onClick={() => onChange('all')}>
        {tActions('all')}
      </FilterTag>
      {categories.map((category) => (
        <FilterTag key={category} pressed={active === category} onClick={() => onChange(category)}>
          {labelFor(category)}
        </FilterTag>
      ))}
    </div>
  );
}
