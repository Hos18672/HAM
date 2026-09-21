import type { CSSProperties, ElementType } from 'react';
import { isEditing } from '@/lib/preferences';
import type { Locale } from '@/lib/i18n/config';
import type { EntityKind } from '@/lib/validation/content';
import { EditableTextClient } from './editable-text-client';

export interface EditableTextProps {
  entity: EntityKind;
  id: string;
  field: string;
  locale: Locale;
  value: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Multi-line content keeps its newlines and edits as a block. */
  multiline?: boolean;
}

/**
 * A managed piece of text.
 *
 * Outside edit mode this renders exactly the element it would have rendered
 * anyway — no wrapper, no client JavaScript, no cost. Inside edit mode it
 * upgrades to an editable region.
 *
 * The `data-field` attribute is emitted by the component itself, from the ids
 * it already has. Edit mode never matches rendered strings against content:
 * two offers with the same title would be indistinguishable, and an edit would
 * land on the wrong row.
 */
export async function EditableText({
  entity,
  id,
  field,
  locale,
  value,
  as: Tag = 'span',
  className,
  style,
  multiline,
}: EditableTextProps) {
  const editing = await isEditing();

  if (!editing) {
    return (
      <Tag className={className} style={style} data-field={`${entity}.${id}.${field}`}>
        {value}
      </Tag>
    );
  }

  return (
    <EditableTextClient
      entity={entity}
      id={id}
      field={field}
      locale={locale}
      value={value}
      as={Tag}
      className={className}
      style={style}
      multiline={multiline}
    />
  );
}
