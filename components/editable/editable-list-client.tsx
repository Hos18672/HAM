'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Copy, X, ArrowUp, ArrowDown } from '@phosphor-icons/react/dist/ssr';
import { listOperation } from '@/app/actions/content';
import type { EntityKind } from '@/lib/validation/content';
import { Button } from '../ui/button';
import { useEditStatus } from './edit-status';

export function EditableListToolbar({
  entity,
  id,
  parentId,
  isLast,
}: {
  entity: EntityKind;
  id: string;
  parentId?: string;
  isLast: boolean;
}) {
  const t = useTranslations('edit');
  const router = useRouter();
  const status = useEditStatus();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(op: 'add' | 'duplicate' | 'delete' | 'moveUp' | 'moveDown') {
    status.setSaving();
    startTransition(async () => {
      const result = await listOperation({ entity, op, id, parentId });
      if (result.ok) {
        status.setSaved();
        // The page is a Server Component: re-fetch it so the new order or the
        // new entry appears without a full reload.
        router.refresh();
      } else {
        status.setFailed(result.error ?? 'write-failed');
      }
      setConfirming(false);
    });
  }

  return (
    <div className="editable-toolbar">
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        disabled={pending}
        aria-label={t('add')}
        title={t('add')}
        onClick={() => run('add')}
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        disabled={pending}
        aria-label={t('duplicate')}
        title={t('duplicate')}
        onClick={() => run('duplicate')}
      >
        <Copy size={14} weight="bold" aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        disabled={pending}
        aria-label={t('moveUp')}
        title={t('moveUp')}
        onClick={() => run('moveUp')}
      >
        <ArrowUp size={14} weight="bold" aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        disabled={pending}
        aria-label={t('moveDown')}
        title={t('moveDown')}
        onClick={() => run('moveDown')}
      >
        <ArrowDown size={14} weight="bold" aria-hidden="true" />
      </Button>
      <Button
        variant={confirming ? 'danger' : 'secondary'}
        size="sm"
        iconOnly={!confirming}
        disabled={pending || isLast}
        aria-label={isLast ? t('lastEntry') : t('delete')}
        title={isLast ? t('lastEntry') : t('delete')}
        onClick={() => {
          // Delete always confirms — one click reveals the confirmation, the
          // second carries it out.
          if (!confirming) {
            setConfirming(true);
            return;
          }
          run('delete');
        }}
        onBlur={() => setConfirming(false)}
      >
        {confirming ? t('confirmDelete') : <X size={14} weight="bold" aria-hidden="true" />}
      </Button>
    </div>
  );
}

export function EditableListAdd({
  entity,
  parentId,
  label,
}: {
  entity: EntityKind;
  parentId?: string;
  label?: string;
}) {
  const t = useTranslations('edit');
  const router = useRouter();
  const status = useEditStatus();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      disabled={pending}
      onClick={() => {
        status.setSaving();
        startTransition(async () => {
          const result = await listOperation({ entity, op: 'add', parentId });
          if (result.ok) {
            status.setSaved();
            router.refresh();
          } else {
            status.setFailed(result.error ?? 'write-failed');
          }
        });
      }}
    >
      <Plus size={16} weight="bold" aria-hidden="true" />
      {label ?? t('add')}
    </Button>
  );
}
