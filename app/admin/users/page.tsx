import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getUsers } from '@/lib/db/queries/admin';
import { UserManager } from '@/components/admin/user-manager';
import { NoPermission } from '@/components/admin/no-permission';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Benutzer' };

export default async function UsersPage() {
  // Admin only. Checked by reading the role rather than by demanding it:
  // `requireUser('admin')` throws, and an unhandled throw here means an editor
  // following a stale link gets a 500 instead of being told why.
  const current = await requireUser();
  if (current.role !== 'admin') return <NoPermission what="Die Benutzerverwaltung" />;

  const users = await getUsers();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Benutzer
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Redakteure dürfen alle Inhalte bearbeiten. Administratoren zusätzlich Benutzer verwalten
          und Sicherungen einspielen.
        </p>
      </div>

      <UserManager users={users} currentUserId={current.id} />
    </div>
  );
}
