'use client';

import { useEffect } from 'react';
import { Button } from '../ui/button';

/**
 * The bar that appears only when there is something to save.
 *
 * Three things it has to get right:
 *  - ⌘/Ctrl + S saves, because that is what everyone's hands do;
 *  - leaving with unsaved work warns, via `beforeunload`;
 *  - it does not exist at all when the form is clean, so the page is not
 *    permanently wearing a piece of chrome that does nothing.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  count,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** How many fields have changed — shown so the editor knows the scope. */
  count?: number;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (dirty && !saving) onSave();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dirty, saving, onSave]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      // The browser shows its own wording; assigning returnValue is what makes
      // the prompt appear at all.
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!dirty) return null;

  return (
    <div
      role="region"
      aria-label="Ungespeicherte Änderungen"
      style={{
        position: 'sticky',
        insetBlockEnd: 0,
        zIndex: 'var(--z-editbar)',
        marginBlockStart: 'var(--space-5)',
        background: 'var(--color-ink)',
        color: 'var(--color-bg)',
        borderRadius: 'var(--radius-baseline)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <span style={{ fontWeight: 'var(--weight-bold)' }}>
        {count && count > 0
          ? `${count} ${count === 1 ? 'Änderung' : 'Änderungen'} nicht gespeichert`
          : 'Nicht gespeicherte Änderungen'}
      </span>
      <span className="text-xs" style={{ opacity: 0.8 }}>
        ⌘/Strg + S
      </span>
      <div className="ms-auto flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          style={{ color: 'var(--color-bg)', borderColor: 'var(--color-bg)' }}
        >
          Verwerfen
        </Button>
        <Button size="sm" onClick={onSave} loading={saving} disabled={saving}>
          {saving ? 'Wird gespeichert …' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
}
