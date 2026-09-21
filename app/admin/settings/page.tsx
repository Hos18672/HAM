import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/db/queries/content';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  await requireUser();
  const settings = await getSettings();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Einstellungen
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Diese Angaben erscheinen im Seitenfuß, auf der Kontaktseite und im Impressum.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
