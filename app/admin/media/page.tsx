import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getMediaLibrary } from '@/lib/db/queries/admin';
import { isStorageConfigured } from '@/lib/storage';
import { MediaLibrary } from '@/components/admin/media-library';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Medien' };

export default async function MediaPage() {
  await requireUser();
  const items = await getMediaLibrary();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>Medien</h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          Alle Bilder der Website. Der Alternativtext ist keine Formsache — ohne ihn ist das Bild
          für blinde Besucherinnen und Besucher nicht vorhanden.
        </p>
      </div>

      <MediaLibrary items={items} storageReady={isStorageConfigured()} />
    </div>
  );
}
