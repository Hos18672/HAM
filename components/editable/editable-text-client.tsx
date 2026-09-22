'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { updateField } from '@/app/actions/content';
import type { Locale } from '@/lib/i18n/config';
import type { EntityKind } from '@/lib/validation/content';
import { cn } from '../ui/cn';
import { useEditStatus } from './edit-status';

/**
 * The editable region itself: click, type, blur → saved.
 *
 * `contentEditable` with `plaintext-only` keeps pasted rich text from smuggling
 * markup into a field that is rendered as text. The save is optimistic — the
 * new text stays on screen immediately — and rolls back to the last known good
 * value if the server refuses.
 */
export function EditableTextClient({
  entity,
  id,
  field,
  locale,
  value,
  as: Tag = 'span',
  className,
  style,
  multiline,
}: {
  entity: EntityKind;
  id: string;
  field: string;
  locale: Locale;
  value: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const committed = useRef(value);
  const status = useEditStatus();

  // Keep the DOM in step when the server sends a new value (e.g. after another
  // editor's change) — but never while the field is focused, which would yank
  // the caret out from under the person typing.
  useEffect(() => {
    committed.current = value;
    const node = ref.current;
    if (node && document.activeElement !== node && node.textContent !== value) {
      node.textContent = value;
    }
  }, [value]);

  async function commit() {
    const node = ref.current;
    if (!node) return;
    const next = (node.textContent ?? '').replace(/ /g, ' ');
    if (next === committed.current) return;

    setSaving(true);
    status.setSaving();
    const result = await updateField({ entity, id, field, locale, value: next });
    setSaving(false);

    if (result.ok) {
      committed.current = next;
      status.setSaved();
    } else {
      // Roll back to the last value the server accepted.
      node.textContent = committed.current;
      status.setFailed(result.error ?? 'write-failed');
      // A stale page cannot be recovered by retrying — every id on it is old.
      if (result.error === 'stale-page') window.location.reload();
    }
  }

  return (
    <Tag
      ref={ref}
      className={cn('editable', className)}
      style={style}
      data-field={`${entity}.${id}.${field}`}
      data-saving={saving || undefined}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      // Deliberately no role="textbox": an explicit role would override the
      // element's own, so an editable <h1> would stop being a heading and the
      // page would lose its outline for exactly the person editing it.
      // `contenteditable` already exposes the element as editable; the label
      // says which field it is.
      aria-label={`${field} (${locale})`}
      aria-multiline={multiline ? true : undefined}
      tabIndex={0}
      spellCheck={false}
      onBlur={commit}
      onKeyDown={(event: React.KeyboardEvent) => {
        // Enter commits a single-line field; Escape reverts it.
        if (event.key === 'Enter' && !multiline) {
          event.preventDefault();
          (event.currentTarget as HTMLElement).blur();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          const node = ref.current;
          if (node) node.textContent = committed.current;
          (event.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </Tag>
  );
}
