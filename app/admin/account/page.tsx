import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { AccountForm } from '@/components/admin/account-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mein Konto' };

export default async function AccountPage() {
  const session = await requireUser();
  const [user] = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Mein Konto
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Angemeldet als <span dir="ltr">{user?.email ?? session.email}</span> ·{' '}
          {(user?.role ?? session.role) === 'admin' ? 'Administrator' : 'Redaktion'}
        </p>
      </div>

      <AccountForm name={user?.name ?? session.name ?? ''} />
    </div>
  );
}
