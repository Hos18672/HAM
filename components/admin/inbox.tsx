'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Envelope, EnvelopeOpen, Archive } from '@phosphor-icons/react/dist/ssr';
import { setSubmissionStatus, exportSubmissionsCsv } from '@/app/actions/admin';
import type { SubmissionRow } from '@/lib/db/queries/admin';
import { Button } from '../ui/button';
import { Tag, FilterTag } from '../ui/tag';
import { useToast } from './toast';

const KIND_LABEL: Record<string, string> = {
  contact: 'Kontakt',
  membership: 'Mitgliedschaft',
  donation: 'Spende',
  volunteer: 'Mitarbeit',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Neu',
  read: 'Gelesen',
  archived: 'Archiviert',
};

export function Inbox({ submissions }: { submissions: SubmissionRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'archived'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible =
    filter === 'all' ? submissions : submissions.filter((row) => row.status === filter);

  function setStatus(id: string, status: 'new' | 'read' | 'archived') {
    startTransition(async () => {
      const result = await setSubmissionStatus({ id, status });
      if (result.ok) {
        toast.show(`Als „${STATUS_LABEL[status]}“ markiert.`, 'success');
        router.refresh();
      } else {
        toast.show('Das hat nicht geklappt.', 'error');
      }
    });
  }

  async function download() {
    const result = await exportSubmissionsCsv();
    if (!result.ok || !result.csv) {
      toast.show('Der Export ist fehlgeschlagen.', 'error');
      return;
    }
    // Built and revoked in the browser: the CSV never becomes a URL anyone
    // else could fetch.
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nachrichten-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.show('CSV-Datei erstellt.', 'success');
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtern" className="flex flex-wrap gap-2">
          {(['all', 'new', 'read', 'archived'] as const).map((value) => (
            <FilterTag key={value} pressed={filter === value} onClick={() => setFilter(value)}>
              {value === 'all' ? 'Alle' : STATUS_LABEL[value]}
            </FilterTag>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="ms-auto" onClick={() => void download()}>
          <Download size={16} weight="bold" aria-hidden="true" />
          CSV exportieren
        </Button>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>Keine Nachrichten in dieser Ansicht.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 'var(--space-2)',
          }}
        >
          {visible.map((row) => {
            const isOpen = expanded === row.id;
            return (
              <li key={row.id}>
                <div
                  className="card"
                  style={{
                    gap: 'var(--space-2)',
                    borderInlineStartWidth: row.status === 'new' ? 'var(--rule-thick)' : undefined,
                    borderInlineStartColor:
                      row.status === 'new' ? 'var(--color-accent)' : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    aria-expanded={isOpen}
                    className="flex flex-wrap items-center gap-2"
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'start',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Tag>{KIND_LABEL[row.kind] ?? row.kind}</Tag>
                    <span style={{ fontWeight: 'var(--weight-bold)' }}>{row.name}</span>
                    <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }} dir="ltr">
                      {row.email}
                    </span>
                    <span
                      className="tabular ms-auto text-xs"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      {new Intl.DateTimeFormat('de-AT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Vienna',
                      }).format(row.createdAt)}
                    </span>
                  </button>

                  {isOpen ? (
                    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                      <dl style={{ display: 'grid', gap: 'var(--space-1)', margin: 0 }}>
                        {row.phone ? (
                          <div className="flex gap-2 text-sm">
                            <dt className="kicker" style={{ inlineSize: '7rem' }}>
                              Telefon
                            </dt>
                            <dd style={{ margin: 0 }} dir="ltr">
                              {row.phone}
                            </dd>
                          </div>
                        ) : null}
                        {row.topic ? (
                          <div className="flex gap-2 text-sm">
                            <dt className="kicker" style={{ inlineSize: '7rem' }}>
                              Anliegen
                            </dt>
                            <dd style={{ margin: 0 }}>{row.topic}</dd>
                          </div>
                        ) : null}
                        <div className="flex gap-2 text-sm">
                          <dt className="kicker" style={{ inlineSize: '7rem' }}>
                            Sprache
                          </dt>
                          <dd style={{ margin: 0 }}>{row.locale === 'fa' ? 'فارسی' : 'Deutsch'}</dd>
                        </div>
                      </dl>

                      {row.message ? (
                        <p
                          dir={row.locale === 'fa' ? 'rtl' : 'ltr'}
                          lang={row.locale}
                          style={{
                            whiteSpace: 'pre-wrap',
                            background: 'var(--color-neutral-100)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-baseline)',
                          }}
                        >
                          {row.message}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <a href={`mailto:${row.email}`} className="btn btn-secondary btn-sm">
                          Antworten
                        </a>
                        {row.status !== 'read' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setStatus(row.id, 'read')}
                          >
                            <EnvelopeOpen size={14} weight="bold" aria-hidden="true" />
                            Als gelesen
                          </Button>
                        ) : null}
                        {row.status !== 'new' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setStatus(row.id, 'new')}
                          >
                            <Envelope size={14} weight="bold" aria-hidden="true" />
                            Als ungelesen
                          </Button>
                        ) : null}
                        {row.status !== 'archived' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setStatus(row.id, 'archived')}
                          >
                            <Archive size={14} weight="bold" aria-hidden="true" />
                            Archivieren
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
