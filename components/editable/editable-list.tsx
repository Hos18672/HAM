import type { ReactNode } from 'react';
import { isEditing } from '@/lib/preferences';
import type { EntityKind } from '@/lib/validation/content';
import { EditableListToolbar, EditableListAdd } from './editable-list-client';

/**
 * Wraps one entry of a repeatable collection so it can grow a hover toolbar in
 * edit mode. Outside edit mode it renders its children and nothing else.
 *
 * Add, duplicate, delete and reorder all act on the base row, so they apply to
 * both languages at once — the two can never drift out of step.
 */
export async function EditableEntry({
  entity,
  id,
  parentId,
  isLast,
  children,
  className,
}: {
  entity: EntityKind;
  id: string;
  parentId?: string;
  /** Delete is disabled when only one entry remains. */
  isLast?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const editing = await isEditing();
  if (!editing) return <>{children}</>;

  return (
    <div className={`editable-region ${className ?? ''}`} data-entry={`${entity}.${id}`}>
      <EditableListToolbar entity={entity} id={id} parentId={parentId} isLast={isLast ?? false} />
      {children}
    </div>
  );
}

/** The "+ add" handle that closes a collection in edit mode. */
export async function EditableAdd({
  entity,
  parentId,
  label,
}: {
  entity: EntityKind;
  parentId?: string;
  label?: string;
}) {
  const editing = await isEditing();
  if (!editing) return null;
  return <EditableListAdd entity={entity} parentId={parentId} label={label} />;
}
