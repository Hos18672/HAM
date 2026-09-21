'use client';

import { useFormStatus } from 'react-dom';
import { PencilSimple } from '@phosphor-icons/react/dist/ssr';
import { startEditMode } from '@/app/actions/edit-mode';
import { Button } from '../ui/button';

/**
 * Opens the public site with an edit session active.
 *
 * A real `<form action={…}>` rather than an onClick handler: the action ends
 * in `redirect()`, and Next only carries that out when it owns the call. Fired
 * from inside a transition the redirect signal has nowhere to go and the
 * navigation silently never happens.
 */
export function EditModeButton({ locale }: { locale: string }) {
  return (
    <form action={startEditMode}>
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending} disabled={pending}>
      <PencilSimple size={14} weight="bold" aria-hidden="true" />
      Website direkt bearbeiten
    </Button>
  );
}
