'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { adminSearchAction } from '@/app/actions/admin-search';
import type { AdminHit } from '@/lib/db/queries/admin';
import { Input } from '../ui/field';

/** Search across every content field, in both languages, published or not. */
export function AdminSearch() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AdminHit[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    setPending(true);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await adminSearchAction(trimmed);
      if (cancelled) return;
      setHits(result);
      setPending(false);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', maxInlineSize: '40rem' }}>
      <label className="field-label" htmlFor="admin-search">
        Alle Inhalte durchsuchen
      </label>
      <div style={{ position: 'relative' }}>
        <MagnifyingGlass
          size={18}
          weight="duotone"
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInlineStart: 'var(--space-3)',
            insetBlockStart: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <Input
          id="admin-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Suchbegriff in Deutsch oder فارسی …"
          style={{ paddingInlineStart: 'var(--space-7)' }}
          aria-describedby="admin-search-count"
        />
      </div>

      <p id="admin-search-count" className="field-hint" aria-live="polite">
        {query.trim().length < 2
          ? 'Mindestens zwei Zeichen.'
          : pending
            ? 'Wird gesucht …'
            : `${hits.length} ${hits.length === 1 ? 'Treffer' : 'Treffer'}`}
      </p>

      {hits.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            border: 'var(--rule-hair) solid var(--color-rule)',
            borderRadius: 'var(--radius-baseline)',
            maxBlockSize: '22rem',
            overflowY: 'auto',
          }}
        >
          {hits.map((hit, index) => (
            <li key={`${hit.entity}-${hit.id}-${hit.locale}-${hit.field}-${index}`}>
              <Link
                href={hit.href}
                style={{
                  display: 'grid',
                  gap: '2px',
                  padding: 'var(--space-2) var(--space-3)',
                  textDecoration: 'none',
                  color: 'var(--color-ink)',
                  borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)',
                }}
              >
                <span className="kicker">
                  {hit.entity} · {hit.field} · {hit.locale}
                </span>
                <span
                  dir={hit.locale === 'fa' ? 'rtl' : 'ltr'}
                  style={{
                    fontSize: 'var(--text-sm)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hit.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
