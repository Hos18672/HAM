'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown, Plus, Copy, Trash, ArrowUp, ArrowDown } from '@phosphor-icons/react/dist/ssr';
import { updateField, updateBaseField, listOperation } from '@/app/actions/content';
import type { AreaSpec, NestedSpec } from '@/lib/admin-areas';
import type { EditableRow } from '@/lib/db/queries/admin';
import { ICON_CHOICES } from '../site/icon';
import { BilingualField, LanguageToggle, type LanguageView } from './bilingual-field';
import { SaveBar } from './save-bar';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/field';
import { useToast } from './toast';
import { toViennaInput, fromViennaInput } from '@/lib/vienna-time';

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
export interface MediaChoice {
  id: string;
  url: string;
  label: string;
}

type ListOp = 'add' | 'duplicate' | 'delete' | 'moveUp' | 'moveDown';

export function AreaEditor({
  area,
  rows,
  nested = {},
  media = [],
}: {
  area: AreaSpec;
  rows: EditableRow[];
  /** Nested entries (an event's programme), by parent id. */
  nested?: Record<string, EditableRow[]>;
  /** Images an image field can choose from. */
  media?: MediaChoice[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [view, setView] = useState<LanguageView>('both');
  const [drafts, setDrafts] = useState<Record<DraftKey, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const dirty = Object.keys(drafts).length > 0;

  const datetimeFields = useMemo(
    () => new Set(area.baseFields.filter((f) => f.type === 'datetime').map((f) => f.name)),
    [area.baseFields],
  );

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
      // Dates are shown as Vienna wall time, whatever zone the browser is in.
      if (raw instanceof Date || datetimeFields.has(field)) {
        return toViennaInput(raw as Date | string | null);
      }
      return raw as string | number | boolean | null;
    },
    [drafts, datetimeFields],
  );

  function setFieldDraft(
    row: EditableRow,
    field: string,
    locale: 'de' | 'fa',
    value: string,
    entity: string = area.entity,
  ) {
    const key = `f:${row.id}:${field}:${locale}`;
    const original = row.fields[field]?.[locale] ?? '';
    setDrafts((current) => {
      const next = { ...current };
      // Typing back to the original value clears the draft, so the save bar
      // disappears rather than offering to save a no-op.
      if (value === original) delete next[key];
      else next[key] = { kind: 'field', entity, id: row.id, field, locale, value };
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
              // The input holds Vienna wall time; the database wants an
              // instant. An emptied date is no date, not an invalid one.
              value:
                draft.entity === area.entity && datetimeFields.has(draft.field)
                  ? fromViennaInput(String(draft.value ?? ''))
                  : draft.value,
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

  function runListOp(op: ListOp, id?: string, scope?: { entity: string; parentId: string }) {
    startTransition(async () => {
      const result = await listOperation({
        entity: scope?.entity ?? area.entity,
        op,
        id,
        parentId: scope?.parentId,
      });
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

                          if (spec.type === 'media') {
                            const chosen = media.find((item) => item.id === value);
                            return (
                              <Field key={spec.name} label={spec.label} hint={spec.hint}>
                                {(props) => (
                                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                                    <Select
                                      {...props}
                                      value={String(value ?? '')}
                                      onChange={(event) =>
                                        setBaseDraft(row, spec.name, event.target.value || null)
                                      }
                                    >
                                      <option value="">— kein Bild —</option>
                                      {media.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.label}
                                        </option>
                                      ))}
                                    </Select>
                                    {chosen ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={chosen.url}
                                        alt=""
                                        style={{
                                          inlineSize: '100%',
                                          maxInlineSize: '16rem',
                                          aspectRatio: '16 / 9',
                                          objectFit: 'cover',
                                          borderRadius: 'var(--radius-baseline)',
                                        }}
                                      />
                                    ) : null}
                                  </div>
                                )}
                              </Field>
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

                    {area.nested ? (
                      <NestedList
                        spec={area.nested}
                        parentId={row.id}
                        rows={nested[row.id] ?? []}
                        view={view}
                        pending={pending}
                        fieldValue={fieldValue}
                        onField={(child, field, locale, value) =>
                          setFieldDraft(child, field, locale, value, area.nested!.entity)
                        }
                        onOp={(op, id) =>
                          runListOp(op, id, { entity: area.nested!.entity, parentId: row.id })
                        }
                      />
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

/**
 * A list inside one entry — an event's programme. Its text edits join the
 * same drafts as the entry's own fields, so one Save writes both; adding,
 * removing and reordering act at once, like the entry's own row controls.
 */
function NestedList({
  spec,
  parentId,
  rows,
  view,
  pending,
  fieldValue,
  onField,
  onOp,
}: {
  spec: NestedSpec;
  parentId: string;
  rows: EditableRow[];
  view: LanguageView;
  pending: boolean;
  fieldValue: (row: EditableRow, field: string, locale: 'de' | 'fa') => string;
  onField: (row: EditableRow, field: string, locale: 'de' | 'fa', value: string) => void;
  onOp: (op: ListOp, id?: string) => void;
}) {
  return (
    <section
      aria-labelledby={`nested-${parentId}`}
      style={{
        display: 'grid',
        gap: 'var(--space-3)',
        paddingBlockStart: 'var(--space-3)',
        borderBlockStart: 'var(--rule-hair) solid var(--color-rule)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`nested-${parentId}`} className="field-label" style={{ margin: 0 }}>
          {spec.label}
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          {rows.length} {rows.length === 1 ? 'Punkt' : 'Punkte'}
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="ms-auto"
          disabled={pending}
          onClick={() => onOp('add')}
        >
          <Plus size={14} weight="bold" aria-hidden="true" />
          {spec.itemLabel} hinzufügen
        </Button>
      </div>
      {spec.hint ? <p className="field-hint">{spec.hint}</p> : null}

      {rows.length > 0 ? (
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 'var(--space-3)',
          }}
        >
          {rows.map((child, index) => (
            <li
              key={child.id}
              aria-label={`${spec.itemLabel} ${index + 1}`}
              style={{
                display: 'grid',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-baseline)',
                background: 'var(--color-bg)',
                border: 'var(--rule-hair) solid var(--color-rule)',
              }}
            >
              <div className="flex items-center gap-1">
                <span className="tabular text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {index + 1}.
                </span>
                <div className="ms-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`${spec.itemLabel} nach oben`}
                    disabled={pending || index === 0}
                    onClick={() => onOp('moveUp', child.id)}
                  >
                    <ArrowUp size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`${spec.itemLabel} nach unten`}
                    disabled={pending || index === rows.length - 1}
                    onClick={() => onOp('moveDown', child.id)}
                  >
                    <ArrowDown size={14} weight="bold" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`${spec.itemLabel} entfernen`}
                    disabled={pending}
                    onClick={() => onOp('delete', child.id)}
                  >
                    <Trash size={14} weight="bold" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {spec.fields.map((field) => (
                <BilingualField
                  key={field.name}
                  label={field.label}
                  hint={field.hint}
                  view={view}
                  values={{
                    de: fieldValue(child, field.name, 'de'),
                    fa: fieldValue(child, field.name, 'fa'),
                  }}
                  onChange={(locale, value) => onField(child, field.name, locale, value)}
                />
              ))}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
