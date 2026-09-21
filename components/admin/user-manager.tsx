'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import { createUser, updateUser, deleteUser } from '@/app/actions/admin';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/field';
import { Tag } from '../ui/tag';
import { useToast } from './toast';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  createdAt: Date;
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  function run(promise: Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await promise;
      toast.show(result.ok ? success : (result.error ?? 'Das hat nicht geklappt.'), result.ok ? 'success' : 'error');
      if (result.ok) {
        setShowInvite(false);
        setResetting(null);
        setConfirming(null);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div>
        <Button variant="secondary" size="sm" onClick={() => setShowInvite((open) => !open)}>
          <Plus size={16} weight="bold" aria-hidden="true" />
          Benutzer anlegen
        </Button>
      </div>

      {showInvite ? (
        <form
          className="card"
          style={{ gap: 'var(--space-3)', maxInlineSize: '34rem' }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(
              createUser({
                email: String(data.get('email') ?? ''),
                name: String(data.get('name') ?? ''),
                role: String(data.get('role') ?? 'editor'),
                password: String(data.get('password') ?? ''),
              }),
              'Benutzer angelegt.',
            );
          }}
        >
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Neuer Benutzer</h2>

          <Field label="Name" required>
            {(props) => <Input {...props} name="name" type="text" />}
          </Field>
          <Field label="E-Mail" required>
            {(props) => <Input {...props} name="email" type="email" dir="ltr" />}
          </Field>
          <Field label="Rolle">
            {(props) => (
              <Select {...props} name="role" defaultValue="editor">
                <option value="editor">Redakteur — darf Inhalte bearbeiten</option>
                <option value="admin">Administrator — darf alles</option>
              </Select>
            )}
          </Field>
          <Field
            label="Passwort"
            required
            hint="Mindestens 12 Zeichen. Ein langer Satz ist sicherer und leichter zu merken als ein kurzes Kauderwelsch."
          >
            {(props) => <Input {...props} name="password" type="text" autoComplete="new-password" />}
          </Field>

          <div className="flex gap-2">
            <Button type="submit" loading={pending} disabled={pending}>
              Anlegen
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : null}

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">E-Mail</th>
            <th scope="col">Rolle</th>
            <th scope="col">Seit</th>
            <th scope="col">
              <span className="visually-hidden">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                {user.name}
                {user.id === currentUserId ? (
                  <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                    {' '}
                    (Sie)
                  </span>
                ) : null}
              </td>
              <td dir="ltr">{user.email}</td>
              <td>
                <Select
                  aria-label={`Rolle von ${user.name}`}
                  value={user.role}
                  disabled={pending}
                  onChange={(event) =>
                    run(
                      updateUser({ id: user.id, role: event.target.value as 'admin' | 'editor' }),
                      'Rolle geändert.',
                    )
                  }
                  style={{ minHeight: '2.125rem', fontSize: 'var(--text-xs)' }}
                >
                  <option value="editor">Redakteur</option>
                  <option value="admin">Administrator</option>
                </Select>
              </td>
              <td className="tabular">
                {new Intl.DateTimeFormat('de-AT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'Europe/Vienna',
                }).format(user.createdAt)}
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {resetting === user.id ? (
                    <form
                      className="flex gap-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        run(
                          updateUser({ id: user.id, password: String(data.get('password') ?? '') }),
                          'Passwort geändert.',
                        );
                      }}
                    >
                      <Input
                        name="password"
                        type="text"
                        required
                        minLength={12}
                        placeholder="Neues Passwort"
                        aria-label={`Neues Passwort für ${user.name}`}
                        style={{ minHeight: '2.125rem', inlineSize: '14rem' }}
                      />
                      <Button type="submit" size="sm" loading={pending}>
                        Setzen
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setResetting(null)}>
                        Abbrechen
                      </Button>
                    </form>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setResetting(user.id)} disabled={pending}>
                      Passwort
                    </Button>
                  )}

                  {user.id === currentUserId ? (
                    <Tag>eigenes Konto</Tag>
                  ) : confirming === user.id ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onBlur={() => setConfirming(null)}
                      onClick={() => run(deleteUser({ id: user.id }), 'Benutzer gelöscht.')}
                    >
                      Wirklich löschen?
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(user.id)} disabled={pending}>
                      Löschen
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
