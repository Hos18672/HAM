import Link from 'next/link';
import { Lock } from '@phosphor-icons/react/dist/ssr';

/**
 * What an editor sees where an administrator would see a page.
 *
 * A refused page is a normal thing to land on — a stale bookmark, a link a
 * colleague pasted — so it reads as an explanation rather than as a failure.
 * Throwing here instead would hand a non-technical member of staff a raw
 * server error.
 */
export function NoPermission({ what }: { what: string }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">Verwaltung</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Keine Berechtigung
        </h1>
      </div>

      <div className="card" style={{ maxInlineSize: 'var(--measure)', gap: 'var(--space-3)' }}>
        <Lock size={28} weight="duotone" aria-hidden="true" />
        <p>
          {what} steht nur Administratorinnen und Administratoren offen. Ihr Konto hat die Rolle
          <strong> Redakteur</strong> — damit können Sie alle Inhalte, Medien, Nachrichten und
          Einstellungen bearbeiten.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Wenn Sie hier Zugang brauchen, bitten Sie eine Administratorin, Ihre Rolle unter
          „Benutzer“ zu ändern.
        </p>
        <p>
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Zurück zur Übersicht
          </Link>
        </p>
      </div>
    </div>
  );
}
