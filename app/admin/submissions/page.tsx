import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getSubmissions, getSubmissionCounts } from '@/lib/db/queries/admin';
import { Inbox } from '@/components/admin/inbox';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Posteingang' };

export default async function SubmissionsPage() {
  await requireUser();
  const [submissions, counts] = await Promise.all([getSubmissions(), getSubmissionCounts()]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Posteingang
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          {counts.new} neu · {counts.read} gelesen · {counts.archived} archiviert. Archivierte
          Nachrichten werden nach 24 Monaten gelöscht, wie in der Datenschutzerklärung angekündigt.
        </p>
      </div>

      <Inbox submissions={submissions} />
    </div>
  );
}
