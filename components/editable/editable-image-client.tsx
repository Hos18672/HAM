'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateBaseField } from '@/app/actions/content';
import { ALLOWED_UPLOAD_MIME } from '@/lib/validation/content';
import { sendImage } from '@/lib/upload-client';
import { useEditStatus } from './edit-status';

export function EditableImageClient({
  entity,
  id,
  field,
  category,
  children,
}: {
  entity: 'event' | 'gallery' | 'media';
  id: string;
  field: string;
  category?: string;
  children: ReactNode;
}) {
  const t = useTranslations('edit');
  const router = useRouter();
  const status = useEditStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    status.setSaving();
    const sent = await sendImage(file, category ? { category } : {});
    if (!sent.ok) {
      status.setFailed('upload-failed');
      // The bar only says "not saved"; the editor needs to know why.
      window.alert(sent.reason);
      return;
    }
    const mediaId = sent.id;

    // Point the entity at the freshly uploaded media row.
    const result = await updateBaseField({ entity, id, field, value: mediaId });
    if (result.ok) {
      status.setSaved();
      router.refresh();
    } else {
      status.setFailed(result.error ?? 'write-failed');
    }
  }

  return (
    <div
      className="editable-drop"
      data-over={over || undefined}
      data-field={`${entity}.${id}.${field}`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) void upload(file);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label={t('dropImage')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        aria-label={t('dropImage')}
        accept={ALLOWED_UPLOAD_MIME.join(',')}
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
