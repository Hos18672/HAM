import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { AREAS, AREA_KEYS } from '@/lib/admin-areas';
import { ENTITIES } from '@/lib/db/entity-map';
import { getEditableRows } from '@/lib/db/queries/admin';
import { AreaEditor } from '@/components/admin/area-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  return { title: AREAS[area]?.title ?? 'Inhalte' };
}

export default async function ContentAreaPage({ params }: { params: Promise<{ area: string }> }) {
  // Re-checked here as well as in middleware: an admin page is not protected
  // by a redirect somewhere else.
  await requireUser();

  const { area: areaKey } = await params;
  const area = AREAS[areaKey];
  if (!area) notFound();

  const definition = ENTITIES[area.entity];
  const fieldColumns = Object.fromEntries(
    area.fields.map((field) => [field.name, definition.fields[field.name] ?? field.name]),
  );

  const rows = await getEditableRows(
    definition.base,
    definition.translations,
    definition.fk,
    fieldColumns,
    definition.sortable,
    definition.order,
  );

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Inhalte</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          {area.title}
        </h1>
        <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
          {area.description}
        </p>
      </div>

      <nav className="nav flex-wrap" aria-label="Inhaltsbereiche">
        {AREA_KEYS.map((key) => (
          <Link
            key={key}
            href={`/admin/content/${key}`}
            className="nav-link"
            aria-current={key === areaKey ? 'page' : undefined}
          >
            {AREAS[key]!.title}
          </Link>
        ))}
      </nav>

      <AreaEditor area={area} rows={rows} />
    </div>
  );
}
