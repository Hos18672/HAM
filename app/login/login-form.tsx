'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { credentialsSchema, type Credentials } from '@/lib/validation/auth';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';

/**
 * The credentials form.
 *
 * One error message for every kind of failure — wrong address, wrong password,
 * or too many attempts. Distinguishing them would tell someone probing the
 * form which addresses are real accounts.
 */
const GENERIC_ERROR = 'E-Mail-Adresse oder Passwort stimmen nicht. Bitte versuchen Sie es erneut.';

export function LoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string;
}) {
  const [formError, setFormError] = useState<string | null>(initialError ? GENERIC_ERROR : null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const result = await signIn('credentials', {
          ...values,
          redirect: false,
        });

        if (result?.error || !result?.ok) {
          setFormError(GENERIC_ERROR);
          return;
        }
        // A full navigation rather than a router push: the session cookie has
        // just been set and the admin layout has to be rendered with it.
        window.location.href = redirectTo;
      })}
      style={{ display: 'grid', gap: 'var(--space-4)' }}
    >
      <Field
        label="E-Mail"
        required
        error={errors.email ? 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' : undefined}
      >
        {(props) => (
          <Input
            type="email"
            autoComplete="username"
            autoFocus
            dir="ltr"
            {...props}
            {...register('email')}
          />
        )}
      </Field>

      <Field
        label="Passwort"
        required
        error={errors.password ? 'Bitte geben Sie Ihr Passwort ein.' : undefined}
      >
        {(props) => (
          <Input type="password" autoComplete="current-password" {...props} {...register('password')} />
        )}
      </Field>

      <div aria-live="polite">
        {formError ? <p className="field-error">{formError}</p> : null}
      </div>

      <div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Anmeldung läuft …' : 'Anmelden'}
        </Button>
      </div>
    </form>
  );
}
