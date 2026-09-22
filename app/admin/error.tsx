'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * The admin's error boundary.
 *
 * Without one, anything that throws inside /admin renders Next's default
 * error screen — a stack trace in development and a bare "something went
 * wrong" in production. Staff here are not developers; they get a sentence
 * they can act on, and the digest so a failure can be found in the log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] unhandled error', { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <p className="kicker">{error.digest ?? 'Fehler'}</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBlockStart: 'var(--space-2)' }}>
          Da ist etwas schiefgelaufen
        </h1>
      </div>

      <div className="card" style={{ maxInlineSize: 'var(--measure)', gap: 'var(--space-3)' }}>
        <p>
          Diese Seite konnte nicht geladen werden. Ihre zuletzt gespeicherten Änderungen sind davon
          nicht betroffen.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={reset}>Erneut versuchen</Button>
          <Link href="/admin" className="btn btn-secondary">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    </div>
  );
}
