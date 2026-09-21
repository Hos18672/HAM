import Link from 'next/link';
import { PencilSimple, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { auth } from '@/lib/auth';
import { getAreaTiles, getSubmissions, getSubmissionCounts, getNextEvent } from '@/lib/db/queries/admin';
import { getSettings } from '@/lib/db/queries/content';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { AdminSearch } from '@/components/admin/admin-search';
import { EditModeButton } from '@/components/admin/edit-mode-button';

export const dynamic = 'force-dynamic';

/**
 * A task-first dashboard: what needs doing, then where to do it.
 *
 * The tiles are grouped the way staff think about the site — Website,
 * Startseite, Programm, Verein — not the way the database is shaped.
 */
export default async function AdminDashboard() {
  const session = await auth();
  const [tiles, recent, counts, settings] = await Promise.all([
    getAreaTiles(),
    getSubmissions(undefined, 5),
    getSubmissionCounts(),
    getSettings(),
  ]);
  const nextEvent = await getNextEvent(settings.defaultLocale);

  const groups = ['Website', 'Startseite', 'Programm', 'Verein'] as const;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-7)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Übersicht</p>
        <h1 style={{ fontSize: 'var(--text-4xl)', marginBlockStart: 'var(--space-2)' }}>
          Guten Tag, {session?.user?.name ?? 'Redaktion'}
        </h1>
      </div>

      <AdminSearch />

      {/* At a glance */}
      <div
        style={{
          display: 'grid',
          gap: 'var(--space-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(18rem, 100%), 1fr))',
        }}
      >
        <Card variant="soft">
          <p className="kicker">Neue Nachrichten</p>
          <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-bold)' }} className="tabular">
            {counts.new ?? 0}
          </p>
          <p>
            <Link href="/admin/submissions">Zum Posteingang</Link>
          </p>
        </Card>

        <Card variant="soft">
          <p className="kicker">Nächster Termin</p>
          {nextEvent ? (
            <>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                {nextEvent.title}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                {new Intl.DateTimeFormat('de-AT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Vienna',
                }).format(nextEvent.startsAt)}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--color-ink-muted)' }}>Kein Termin geplant.</p>
          )}
          <p>
            <Link href="/admin/content/events">Termine bearbeiten</Link>
          </p>
        </Card>

        <Card variant="soft">
          <p className="kicker">Website direkt bearbeiten</p>
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Öffnet die öffentliche Seite mit aktiver Bearbeitung: Text anklicken, tippen,
            fertig.
          </p>
          <div style={{ marginBlockStart: 'auto', paddingBlockStart: 'var(--space-3)' }} className="flex flex-wrap gap-2">
            <EditModeButton locale={settings.defaultLocale} />
            <Link href={`/${settings.defaultLocale}`} className="btn btn-secondary btn-sm" target="_blank">
              <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
              Website ansehen
            </Link>
          </div>
        </Card>
      </div>

      {/* Area tiles */}
      {groups.map((group) => {
        const groupTiles = tiles.filter((tile) => tile.group === group);
        if (groupTiles.length === 0) return null;
        return (
          <section key={group}>
            <h2 className="kicker" style={{ marginBlockEnd: 'var(--space-3)' }}>
              {group}
            </h2>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gap: 'var(--space-3)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(15rem, 100%), 1fr))',
              }}
            >
              {groupTiles.map((tile) => (
                <li key={tile.key}>
                  <Link
                    href={tile.href}
                    className="card card-interactive"
                    style={{ textDecoration: 'none', color: 'var(--color-ink)', blockSize: '100%' }}
                  >
                    <span className="flex items-center gap-2">
                      <PencilSimple size={18} weight="duotone" aria-hidden="true" />
                      <span style={{ fontWeight: 'var(--weight-bold)' }}>{tile.label}</span>
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                      {tile.entryCount} {tile.entryCount === 1 ? 'Eintrag' : 'Einträge'} ·{' '}
                      {tile.fieldCount} Felder
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Recent submissions */}
      <section>
        <h2 className="kicker" style={{ marginBlockEnd: 'var(--space-3)' }}>
          Zuletzt eingegangen
        </h2>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--color-ink-muted)' }}>Noch keine Nachrichten.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Art</th>
                <th scope="col">Name</th>
                <th scope="col">Eingegangen</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <Tag>{submission.kind}</Tag>
                  </td>
                  <td>{submission.name}</td>
                  <td className="tabular">
                    {new Intl.DateTimeFormat('de-AT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Vienna',
                    }).format(submission.createdAt)}
                  </td>
                  <td>{submission.status === 'new' ? 'Neu' : submission.status === 'read' ? 'Gelesen' : 'Archiviert'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
