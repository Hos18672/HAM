'use client';

import { useTransition } from 'react';
import { PencilSimple } from '@phosphor-icons/react/dist/ssr';
import { startEditMode } from '@/app/actions/edit-mode';
import { Button } from '../ui/button';

/** Opens the public site with an edit session active. */
export function EditModeButton({ locale }: { locale: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      loading={pending}
      disabled={pending}
      onClick={() => startTransition(() => void startEditMode(locale))}
    >
      <PencilSimple size={14} weight="bold" aria-hidden="true" />
      Website direkt bearbeiten
    </Button>
  );
}
