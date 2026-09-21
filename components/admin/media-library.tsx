'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UploadSimple, Trash, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { saveMediaMeta, deleteMedia, addToGallery } from '@/app/actions/admin';
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from '@/lib/validation/content';
import type { MediaRow } from '@/lib/db/queries/admin';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/field';
import { useToast } from './toast';

const CATEGORIES = [
  { value: 'general', label: 'Allgemein' },
  { value: 'events', label: 'Veranstaltungen' },
  { value: 'courses', label: 'Kurse' },
  { value: 'sport', label: 'Sport' },
  { value: 'culture', label: 'Kultur' },
  { value: 'house', label: 'Haus' },
];

export function MediaLibrary({
  items,
  storageReady,
}: {
  items: MediaRow[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => {
      if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
        toast.show(`${file.name}: Dieses Dateiformat wird nicht unterstützt.`, 'error');
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.show(`${file.name}: Die Datei ist größer als 8 MB.`, 'error');
        return false;
      }
      return true;
    });
    if (list.length === 0) return;

    setUploading(list.length);
    let failed = 0;

    for (const file of list) {
      const form = new FormData();
      form.set('file', file);
      form.set('gallery', 'true');
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      if (!response.ok) failed += 1;
      setUploading((current) => current - 1);
    }

    if (failed === 0) {
      toast.show(`${list.length} ${list.length === 1 ? 'Bild' : 'Bilder'} hochgeladen.`, 'success');
    } else {
      toast.show(`${failed} von ${list.length} Uploads sind fehlgeschlagen.`, 'error');
    }
    router.refresh();
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {!storageReady ? (
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
            Der Dateispeicher ist noch nicht eingerichtet. Tragen Sie <code>SUPABASE_URL</code> und{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in die Datei <code>.env</code> ein, damit Bilder
            hochgeladen werden können.
          </p>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length > 0) void upload(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Bilder hochladen"
        aria-disabled={!storageReady}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-rule)'}`,
          background: dragOver ? 'var(--color-accent-100)' : 'transparent',
          borderRadius: 'var(--radius-soft)',
          padding: 'var(--space-6)',
          display: 'grid',
          placeItems: 'center',
          gap: 'var(--space-2)',
          cursor: storageReady ? 'pointer' : 'not-allowed',
          opacity: storageReady ? 1 : 0.6,
          textAlign: 'center',
        }}
      >
        <UploadSimple size={32} weight="duotone" aria-hidden="true" />
        <p style={{ fontWeight: 'var(--weight-bold)' }}>
          {uploading > 0
            ? `Noch ${uploading} ${uploading === 1 ? 'Bild' : 'Bilder'} …`
            : 'Bilder hierher ziehen oder klicken'}
        </p>
        <p className="field-hint">JPEG, PNG, WebP, AVIF oder GIF · höchstens 8 MB je Datei</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          // Visually hidden but still a real control, so it carries a real
          // name rather than relying on the drop zone's label.
          aria-label="Bilddateien auswählen"
          accept={ALLOWED_UPLOAD_MIME.join(',')}
          className="visually-hidden"
          disabled={!storageReady}
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {items.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>Noch keine Bilder in der Mediathek.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 'var(--space-4)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(20rem, 100%), 1fr))',
          }}
        >
          {items.map((item) => (
            <li key={item.id}>
              <MediaCard
                item={item}
                pending={pending}
                confirming={confirming === item.id}
                onConfirm={() => setConfirming(item.id)}
                onCancelConfirm={() => setConfirming(null)}
                onDelete={() =>
                  startTransition(async () => {
                    const result = await deleteMedia({ id: item.id });
                    toast.show(
                      result.ok ? 'Bild gelöscht.' : 'Das Bild konnte nicht gelöscht werden.',
                      result.ok ? 'success' : 'error',
                    );
                    setConfirming(null);
                    router.refresh();
                  })
                }
                onAddToGallery={() =>
                  startTransition(async () => {
                    const result = await addToGallery({ mediaId: item.id, category: 'general' });
                    toast.show(
                      result.ok ? 'Zur Galerie hinzugefügt.' : 'Das hat nicht geklappt.',
                      result.ok ? 'success' : 'error',
                    );
                    router.refresh();
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaCard({
  item,
  pending,
  confirming,
  onConfirm,
  onCancelConfirm,
  onDelete,
  onAddToGallery,
}: {
  item: MediaRow;
  pending: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onDelete: () => void;
  onAddToGallery: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [alt, setAlt] = useState(item.alt);
  const [caption, setCaption] = useState(item.caption);
  const [category, setCategory] = useState(item.category ?? 'general');
  const [saving, setSaving] = useState(false);

  const dirty =
    alt.de !== item.alt.de ||
    alt.fa !== item.alt.fa ||
    caption.de !== item.caption.de ||
    caption.fa !== item.caption.fa ||
    category !== (item.category ?? 'general');

  async function save() {
    setSaving(true);
    const result = await saveMediaMeta({ id: item.id, alt, caption, category });
    setSaving(false);
    toast.show(
      result.ok ? 'Gespeichert.' : 'Das hat nicht geklappt.',
      result.ok ? 'success' : 'error',
    );
    if (result.ok) router.refresh();
  }

  return (
    <div className="card" style={{ gap: 'var(--space-3)' }}>
      <Image
        src={item.url}
        alt={item.alt.de || item.alt.fa || ''}
        width={item.width || 600}
        height={item.height || 400}
        sizes="20rem"
        style={{
          inlineSize: '100%',
          blockSize: '10rem',
          objectFit: 'cover',
          borderRadius: 'var(--radius-baseline)',
        }}
      />

      <p className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
        {item.width}×{item.height} · {item.mime.replace('image/', '').toUpperCase()} ·{' '}
        {item.usageCount === 0 ? 'nirgends verwendet' : `${item.usageCount}× verwendet`}
      </p>

      <Field label="Alternativtext (Deutsch)" hint="Beschreibt das Bild für blinde Besucher.">
        {(props) => (
          <Input
            {...props}
            value={alt.de}
            onChange={(event) => setAlt({ ...alt, de: event.target.value })}
          />
        )}
      </Field>

      <Field label="Alternativtext (فارسی)">
        {(props) => (
          <Input
            {...props}
            dir="rtl"
            lang="fa"
            style={{ fontFamily: 'var(--font-naskh)' }}
            value={alt.fa}
            onChange={(event) => setAlt({ ...alt, fa: event.target.value })}
          />
        )}
      </Field>

      <Field label="Bildunterschrift (Deutsch)">
        {(props) => (
          <Input
            {...props}
            value={caption.de}
            onChange={(event) => setCaption({ ...caption, de: event.target.value })}
          />
        )}
      </Field>

      <Field label="Bildunterschrift (فارسی)">
        {(props) => (
          <Input
            {...props}
            dir="rtl"
            lang="fa"
            style={{ fontFamily: 'var(--font-naskh)' }}
            value={caption.fa}
            onChange={(event) => setCaption({ ...caption, fa: event.target.value })}
          />
        )}
      </Field>

      {item.galleryItemId ? (
        <Field label="Kategorie in der Galerie">
          {(props) => (
            <Select
              {...props}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-2" style={{ marginBlockStart: 'auto' }}>
        <Button size="sm" onClick={() => void save()} disabled={!dirty || saving} loading={saving}>
          Speichern
        </Button>

        {!item.galleryItemId ? (
          <Button variant="secondary" size="sm" onClick={onAddToGallery} disabled={pending}>
            Zur Galerie
          </Button>
        ) : null}

        {confirming ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            onBlur={onCancelConfirm}
            disabled={pending}
          >
            {item.usageCount > 0
              ? `Trotz ${item.usageCount} Verwendung${item.usageCount === 1 ? '' : 'en'} löschen?`
              : 'Wirklich löschen?'}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Löschen"
            onClick={onConfirm}
            disabled={pending}
          >
            <Trash size={14} weight="bold" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
