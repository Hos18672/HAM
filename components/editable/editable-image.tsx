import { isEditing } from '@/lib/preferences';
import { EditableImageClient } from './editable-image-client';
import type { ReactNode } from 'react';

/**
 * In edit mode an image becomes a drop target that uploads straight into the
 * media library; outside it, it is whatever image the page rendered.
 */
export async function EditableImage({
  entity,
  id,
  field = 'imageId',
  children,
  category,
}: {
  entity: 'event' | 'gallery' | 'media';
  id: string;
  field?: string;
  children: ReactNode;
  category?: string;
}) {
  const editing = await isEditing();
  if (!editing) return <>{children}</>;

  return (
    <EditableImageClient entity={entity} id={id} field={field} category={category}>
      {children}
    </EditableImageClient>
  );
}
