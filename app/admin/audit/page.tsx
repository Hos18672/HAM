import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getAuditLog } from '@/lib/db/queries/admin';
import { Tag } from '@/components/ui/tag';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Protokoll' };

const ACTION_LABEL: Record<string, string> = {
  update: 'geändert',
  'update-base': 'geändert',
  add: 'angelegt',
  duplicate: 'dupliziert',
  delete: 'gelöscht',
  moveUp: 'verschoben',
  moveDown: 'verschoben',
  create: 'angelegt',
  status: 'Status geändert',
  export: 'exportiert',
  import: 'importiert',
  prune: 'aufgeräumt',
};

export default async function AuditPage() {
  await requireUser();
  const entries = await getAuditLog();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Protokoll
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Wer hat wann was geändert. Das Protokoll lässt sich nicht bearbeiten.
        </p>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>Noch keine Einträge.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Zeitpunkt</th>
              <th scope="col">Person</th>
              <th scope="col">Aktion</th>
              <th scope="col">Bereich</th>
              <th scope="col">Feld</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const diff = entry.diff as Record<string, unknown>;
              return (
                <tr key={entry.id}>
                  <td className="tabular" style={{ whiteSpace: 'nowrap' }}>
                    {new Intl.DateTimeFormat('de-AT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Vienna',
                    }).format(entry.createdAt)}
                  </td>
                  <td>{entry.userName ?? entry.userEmail ?? '—'}</td>
                  <td>
                    <Tag>{ACTION_LABEL[entry.action] ?? entry.action}</Tag>
                  </td>
                  <td>{entry.entity}</td>
                  <td className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                    {typeof diff.field === 'string'
                      ? `${diff.field}${typeof diff.locale === 'string' ? ` (${diff.locale})` : ''}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
