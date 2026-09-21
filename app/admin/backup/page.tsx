import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { BackupPanel } from '@/components/admin/backup-panel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sicherung' };

export default async function BackupPage() {
  const user = await requireUser();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Sicherung
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Alle Inhalte als eine Datei herunterladen — oder eine frühere Sicherung zurückspielen.
          Benutzerkonten, Nachrichten und das Protokoll sind nicht Teil der Sicherung.
        </p>
      </div>

      <BackupPanel canImport={user.role === 'admin'} />
    </div>
  );
}
