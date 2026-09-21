'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown, Plus, Copy, Trash, ArrowUp, ArrowDown } from '@phosphor-icons/react/dist/ssr';
import { updateField, updateBaseField, listOperation } from '@/app/actions/content';
import type { AreaSpec } from '@/lib/admin-areas';
import type { EditableRow } from '@/lib/db/queries/admin';
import { ICON_CHOICES } from '../site/icon';
import { BilingualField, LanguageToggle, type LanguageView } from './bilingual-field';
import { SaveBar } from './save-bar';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/field';
import { useToast } from './toast';

/** One pending edit, keyed so repeated typing in a field collapses to one write. */
type DraftKey = string;
interface Draft {
  kind: 'field' | 'base';
  entity: string;
  id: string;
  field: string;
  locale?: 'de' | 'fa';
  value: string | number | boolean | null;
}

/**
 * The editor for one content area.
 *
 * Edits accumulate as drafts in local state; nothing is written until Save.
 * That is deliberate: an editor rewriting a paragraph should not generate
 * thirty database writes and thirty audit rows, and should be able to change
 * their mind with Discard.
 */
export function AreaEditor({ area, rows }: { area: AreaSpec; rows: EditableRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [view, setView] = useState<LanguageView>('both');
  const [drafts, setDrafts] = useState<Record<DraftKey, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const dirty = Object.keys(drafts).length > 0;

  /** The value to render: the draft if there is one, else what the server sent. */
  const fieldValue = useCallback(
    (row: EditableRow, field: string, locale: 'de' | 'fa'): string => {
      const key = `f:${row.id}:${field}:${locale}`;
      const draft = drafts[key];
      if (draft) return String(draft.value ?? '');
      return row.fields[field]?.[locale] ?? '';
    },
    [drafts],
  );

  const baseValue = useCallback(
    (row: EditableRow, field: string): string | number | boolean | null => {
      const key = `b:${row.id}:${field}`;
      const draft = drafts[key];
      if (draft) return draft.value;
      // The base row comes straight from Postgres, so the column names are
      // snake_case; the spec names them in camelCase.
      const column = field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      const raw = row.base[column] ?? row.base[field] ?? null;
      if (raw instanceof Date) return raw.toISOString().slice(0, 16);
      return raw as string | number | boolean | null;
    },
    [drafts],
  );

  function setFieldDraft(row: EditableRow, field: string, locale: 'de' | 'fa', value: string) {
    const key = `f:${row.id}:${field}:${locale}`;
    const original = row.fields[field]?.[locale] ?? '';
    setDrafts((current) => {
      const next = { ...current };
      // Typing back to the original value clears the draft, so the save bar
      // disappears rather than offering to save a no-op.
      if (value === original) delete next[key];
      else next[key] = { kind: 'field', entity: area.entity, id: row.id, field, locale, value };
      return next;
    });
  }

  function setBaseDraft(row: EditableRow, field: string, value: string | number | boolean | null) {
    const key = `b:${row.id}:${field}`;
    setDrafts((current) => ({
      ...current,
      [key]: { kind: 'base', entity: area.entity, id: row.id, field, value },
    }));
  }

  async function save() {
    setSaving(true);
    const entries = Object.entries(drafts);
    let failures = 0;

    for (const [, draft] of entries) {
      const result =
        draft.kind === 'field'
          ? await updateField({
              entity: draft.entity,
              id: draft.id,
              field: draft.field,
              locale: draft.locale,
              value: String(draft.value ?? ''),
            })
          : await updateBaseField({
              entity: draft.entity,
              id: draft.id,
              field: draft.field,
              value: draft.value,
            });
      if (!result.ok) failures += 1;
    }

    setSaving(false);

    if (failures === 0) {
      setDrafts({});
      toast.show(
        `${entries.length} ${entries.length === 1 ? 'Änderung' : 'Änderungen'} gespeichert.`,
        'success',
      );
      router.refresh();
    } else {
      // The successful writes stand; only the failures are still pending, so
      // the editor can retry without redoing the rest.
      toast.show(
        `${failures} von ${entries.length} Änderungen konnten nicht gespeichert werden.`,
        'error',
      );
    }
  }

  function runListOp(op: 'add' | 'duplicate' | 'delete' | 'moveUp' | 'moveDown', id?: string) {
    startTransition(async () => {
      const result = await listOperation({ entity: area.entity, op, id });
      if (result.ok) {
        toast.show(
          op === 'add'
            ? 'Eintrag angelegt.'
            : op === 'duplicate'
              ? 'Eintrag dupliziert.'
              : op === 'delete'
                ? 'Eintrag gelöscht.'
                : 'Reihenfolge geändert.',
          'success',
        );
        router.refresh();
      } else {
        toast.show(
          result.error === 'last-entry'
            ? 'Der letzte Eintrag kann nicht gelöscht werden.'
            : 'Das hat nicht geklappt.',
          'error',
        );
      }
      setConfirmingDelete(null);
    });
  }

  const draftCount = useMemo(() => Object.keys(drafts).length, [drafts]);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <LanguageToggle view={view} onChange={setView} />
        {area.addable ? (
          <Button
            variant="secondary"
            size="sm"
            className="ms-auto"
            loading={pending}
            onClick={() => runListOp('add')}
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            Neuer Eintrag
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>
          Für diesen Bereich ist noch nichts eingetragen.
        </p>
      ) : null}

      <ul
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-3)' }}
      >
        {rows.map((row, index) => {
          const isCollapsed = collapsed[row.id] ?? false;
          const heading =
            fieldValue(row, area.titleField, 'de') ||
            fieldValue(row, area.titleField, 'fa') ||
            'Ohne Titel';

          return (
            <li key={row.id} id={`${area.entity}-${row.id}`}>
              <div className="card" style={{ gap: 'var(--space-3)' }}>
                {/* Entry header: collapse toggle plus the row controls. */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((current) => ({ ...current, [row.id]: !isCollapsed }))
                    }
                    aria-expanded={!isCollapsed}
                    aria-controls={`panel-${row.id}`}
                    className="btn btn-ghost btn-sm"
                    style={{ paddingInline: 'var(--space-1)' }}
                  >
                    <CaretDown
                      size={16}
                      weight="bold"
                      aria-hidden="true"
                      style={{
                        transform: isCollapsed ? 'rotate(-90deg)' : undefined,
                        transition: 'transform var(--duration-fast) var(--ease-standard)',
                      }}
                    />
                    <span style={{ fontWeight: 'var(--weight-bold)' }}>{heading}</span>
                  </button>

                  <div className="ms-auto flex gap-1">
                    {area.sortable ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Nach oben"
                          disabled={pending || index === 0}
                          onClick={() => runListOp('moveUp', row.id)}
                        >
                          <ArrowUp size={14} weight="bold" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Nach unten"
                          disabled={pending || index === rows.length - 1}
                          onClick={() => runListOp('moveDown', row.id)}
                        >
                          <ArrowDown size={14} weight="bold" aria-hidden="true" />
                        </Button>
                      </>
                    ) : null}

                    {area.addable ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Duplizieren"
                          disabled={pending}
                          onClick={() => runListOp('duplicate', row.id)}
                        >
                          <Copy size={14} weight="bold" aria-hidden="true" />
                        </Button>
                        {confirmingDelete === row.id ? (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={pending}
                            onClick={() => runListOp('delete', row.id)}
                            onBlur={() => setConfirmingDelete(null)}
                          >
                            Wirklich löschen?
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label="Löschen"
                            disabled={pending || rows.length <= 1}
                            onClick={() => setConfirmingDelete(row.id)}
                          >
                            <Trash size={14} weight="bold" aria-hidden="true" />
                          </Button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {!isCollapsed ? (
                  <div id={`panel-${row.id}`} style={{ display: 'grid', gap: 'var(--space-4)' }}>
                    {area.fields.map((spec) => (
                      <BilingualField
                        key={spec.name}
                        label={spec.label}
                        hint={spec.hint}
                        multiline={spec.multiline}
                        rows={spec.rows}
                        view={view}
                        values={{
                          de: fieldValue(row, spec.name, 'de'),
                          fa: fieldValue(row, spec.name, 'fa'),
                        }}
                        onChange={(locale, value) => setFieldDraft(row, spec.name, locale, value)}
                      />
                    ))}

                    {area.baseFields.length > 0 ? (
                      <div
                        style={{
                          display: 'grid',
                          gap: 'var(--space-3)',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(14rem, 100%), 1fr))',
                          paddingBlockStart: 'var(--space-2)',
                          borderBlockStart: 'var(--rule-hair) solid var(--color-rule)',
                        }}
                      >
                        {area.baseFields.map((spec) => {
                          const value = baseValue(row, spec.name);

                          if (spec.type === 'boolean') {
                            return (
                              <div key={spec.name} className="field">
                                <label
                                  className="flex items-center gap-2"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(value)}
                                    onChange={(event) =>
                                      setBaseDraft(row, spec.name, event.target.checked)
                                    }
                                  />
                                  <span className="field-label">{spec.label}</span>
                                </label>
                                {spec.hint ? <p className="field-hint">{spec.hint}</p> : null}
                              </div>
                            );
                          }

                          if (spec.type === 'select' || spec.type === 'icon') {
                            const options =
                              spec.type === 'icon'
                                ? ICON_CHOICES.map((icon) => ({ value: icon, label: icon }))
                                : (spec.options ?? []);
                            return (
                              <Field key={spec.name} label={spec.label} hint={spec.hint}>
                                {(props) => (
                                  <Select
                                    {...props}
                                    value={String(value ?? '')}
                                    onChange={(event) =>
                                      setBaseDraft(row, spec.name, event.target.value)
                                    }
                                  >
                                    {options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              </Field>
                            );
                          }

                          return (
                            <Field key={spec.name} label={spec.label} hint={spec.hint}>
                              {(props) => (
                                <Input
                                  {...props}
                                  type={
                                    spec.type === 'datetime'
                                      ? 'datetime-local'
                                      : spec.type === 'number'
                                        ? 'number'
                                        : 'text'
                                  }
                                  min={spec.min}
                                  max={spec.max}
                                  value={String(value ?? '')}
                                  onChange={(event) =>
                                    setBaseDraft(
                                      row,
                                      spec.name,
                                      spec.type === 'number'
                                        ? Number(event.target.value)
                                        : event.target.value,
                                    )
                                  }
                                />
                              )}
                            </Field>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <SaveBar
        dirty={dirty}
        saving={saving}
        count={draftCount}
        onSave={() => void save()}
        onDiscard={() => setDrafts({})}
      />
    </div>
  );
}
