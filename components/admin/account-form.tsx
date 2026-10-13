'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOwnAccount } from '@/app/actions/admin';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { useToast } from './toast';

/**
 * The signed-in user's own name and password. Every role has this — user
 * management stays admin-only, but nobody should need an admin to change
 * their own password.
 */
export function AccountForm({ name }: { name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card"
      style={{ gap: 'var(--space-4)', maxInlineSize: '34rem' }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const newPassword = String(data.get('newPassword') ?? '');
        const repeat = String(data.get('repeatPassword') ?? '');
        if (newPassword !== repeat) {
          setError('Die beiden neuen Passwörter stimmen nicht überein.');
          return;
        }
        setError(null);
        startTransition(async () => {
          const result = await updateOwnAccount({
            name: String(data.get('name') ?? ''),
            currentPassword: String(data.get('currentPassword') ?? '') || undefined,
            newPassword: newPassword || undefined,
          });
          if (result.ok) {
            toast.show(newPassword ? 'Name und Passwort gespeichert.' : 'Gespeichert.', 'success');
            // The password fields never keep their contents after a save.
            for (const field of ['currentPassword', 'newPassword', 'repeatPassword']) {
              const input = form.elements.namedItem(field);
              if (input instanceof HTMLInputElement) input.value = '';
            }
            router.refresh();
          } else {
            setError(result.error ?? 'Das hat nicht geklappt.');
          }
        });
      }}
    >
      <Field label="Name" required>
        {(props) => (
          <Input {...props} name="name" type="text" defaultValue={name} autoComplete="name" />
        )}
      </Field>

      <fieldset
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          border: 0,
          padding: 0,
          margin: 0,
          paddingBlockStart: 'var(--space-3)',
          borderBlockStart: 'var(--rule-hair) solid var(--color-rule)',
        }}
      >
        <legend className="field-label" style={{ paddingBlockEnd: 'var(--space-2)' }}>
          Passwort ändern
        </legend>
        <p className="field-hint" style={{ margin: 0 }}>
          Leer lassen, um das Passwort zu behalten. Mindestens 12 Zeichen — ein langer Satz ist
          sicherer und leichter zu merken als ein kurzes, kompliziertes Wort.
        </p>
        <Field label="Bisheriges Passwort">
          {(props) => (
            <Input
              {...props}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              dir="ltr"
            />
          )}
        </Field>
        <Field label="Neues Passwort">
          {(props) => (
            <Input
              {...props}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              dir="ltr"
            />
          )}
        </Field>
        <Field label="Neues Passwort wiederholen">
          {(props) => (
            <Input
              {...props}
              name="repeatPassword"
              type="password"
              autoComplete="new-password"
              dir="ltr"
            />
          )}
        </Field>
      </fieldset>

      {error ? (
        <p role="alert" className="field-error" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={pending}>
          Speichern
        </Button>
      </div>
    </form>
  );
}
