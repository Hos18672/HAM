'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, UploadSimple, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { exportBackup, previewBackup, importBackup, type ImportDiff } from '@/app/actions/admin';
import { Button } from '../ui/button';
import { useToast } from './toast';

/**
 * Export, and a two-step import: the file is parsed and diffed first, and
 * nothing is written until the editor has seen how many rows each table would
 * gain or lose.
 */
export function BackupPanel({ canImport }: { canImport: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [diff, setDiff] = useState<ImportDiff[] | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    const result = await exportBackup();
    setBusy(false);

    if (!result.ok || !result.json) {
      toast.show('Der Export ist fehlgeschlagen.', 'error');
      return;
    }
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inhalte-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.show('Sicherung heruntergeladen.', 'success');
  }

  async function choose(file: File) {
    const text = await file.text();
    setBusy(true);
    const result = await previewBackup(text);
    setBusy(false);

    if (!result.ok || !result.diff) {
      toast.show(result.error ?? 'Die Datei konnte nicht gelesen werden.', 'error');
      return;
    }
    setPayload(text);
    setDiff(result.diff);
  }

  function apply() {
    if (!payload) return;
    startTransition(async () => {
      const result = await importBackup(payload);
      if (result.ok) {
        toast.show('Sicherung eingespielt.', 'success');
        setDiff(null);
        setPayload(null);
        router.refresh();
      } else {
        toast.show(result.error ?? 'Der Import ist fehlgeschlagen.', 'error');
      }
    });
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)', maxInlineSize: '44rem' }}>
      <section className="card" style={{ gap: 'var(--space-3)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Herunterladen</h2>
        <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Erzeugt eine JSON-Datei mit allen Texten in beiden Sprachen, den Terminen, Kursen,
          Bittgebeten und Gedenktagen. Bewahren Sie die Datei an einem sicheren Ort auf.
        </p>
        <div>
          <Button onClick={() => void download()} loading={busy} disabled={busy}>
            <Download size={16} weight="bold" aria-hidden="true" />
            Sicherung herunterladen
          </Button>
        </div>
      </section>

      {canImport ? (
        <section className="card" style={{ gap: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Zurückspielen</h2>
          <div
            className="flex items-start gap-2"
            style={{
              border: 'var(--rule-hair) solid var(--color-accent-2-400)',
              borderInlineStartWidth: 'var(--rule-thick)',
              borderRadius: 'var(--radius-baseline)',
              padding: 'var(--space-3)',
            }}
          >
            <WarningCircle size={20} weight="duotone" aria-hidden="true" style={{ flexShrink: 0 }} />
            <p className="text-sm">
              Ein Import ersetzt <strong>alle</strong> Inhalte durch die der Datei. Laden Sie
              vorher eine aktuelle Sicherung herunter.
            </p>
          </div>

          <div>
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              loading={busy}
              disabled={busy}
            >
              <UploadSimple size={16} weight="bold" aria-hidden="true" />
              Datei auswählen
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void choose(file);
                event.target.value = '';
              }}
            />
          </div>

          {diff ? (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <h3 className="kicker">Das würde sich ändern</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Tabelle</th>
                    <th scope="col">Jetzt</th>
                    <th scope="col">Nachher</th>
                    <th scope="col">Differenz</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((row) => {
                    const delta = row.incoming - row.current;
                    return (
                      <tr key={row.table}>
                        <td>{row.table}</td>
                        <td className="tabular">{row.current}</td>
                        <td className="tabular">{row.incoming}</td>
                        <td
                          className="tabular"
                          style={{
                            color:
                              delta === 0
                                ? 'var(--color-ink-faint)'
                                : delta > 0
                                  ? 'var(--color-accent-text)'
                                  : 'var(--color-accent-2-text)',
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex gap-2">
                <Button variant="danger" onClick={apply} loading={pending} disabled={pending}>
                  Jetzt einspielen
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDiff(null);
                    setPayload(null);
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <p style={{ color: 'var(--color-ink-muted)' }}>
          Nur Administratoren dürfen eine Sicherung zurückspielen.
        </p>
      )}
    </div>
  );
}
