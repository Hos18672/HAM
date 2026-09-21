'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import {
  membershipSchema,
  donationSchema,
  type MembershipInput,
  type DonationInput,
} from '@/lib/validation/forms';
import { submitMembership, submitDonation } from '@/app/actions/submissions';
import { Field, Input, Textarea, Select } from '../ui/field';
import { Button } from '../ui/button';
import type { Locale } from '@/lib/i18n/config';

type Mode = 'membership' | 'donation';
type Values = MembershipInput & DonationInput;

/**
 * One form serving both the membership tiers and the donation purposes: the
 * fields are the same but for the select, so two near-identical components
 * would only be two places to fix a bug.
 */
export function SupportForm({
  locale,
  mode,
  options,
  preselected,
  compact,
}: {
  locale: Locale;
  mode: Mode;
  /** `{ value, label }` for the tier or purpose select. */
  options: { value: string; label: string }[];
  preselected?: string;
  compact?: boolean;
}) {
  const t = useTranslations('form');
  const tSupport = useTranslations('support');
  const tActions = useTranslations('actions');

  const [state, setState] = useState<'idle' | 'sent' | 'error' | 'rate-limited'>('idle');
  const mountedAt = useRef(Date.now());

  const schema = mode === 'membership' ? membershipSchema : donationSchema;
  const selectField = mode === 'membership' ? 'tier' : 'purpose';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    // The two schemas differ only in the name of the select field, so the
    // resolver is cast to the union the form actually carries.
    resolver: zodResolver(schema) as never,
    defaultValues: {
      locale,
      website: '',
      elapsed: 0,
      name: '',
      email: '',
      phone: '',
      message: '',
      tier: preselected ?? options[0]?.value ?? '',
      purpose: preselected ?? options[0]?.value ?? '',
    } as Values,
  });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const message = (key?: string) =>
    key && t.has(key.replace('form.', '')) ? t(key.replace('form.', '')) : key;

  if (state === 'sent') {
    return (
      <div role="status" className="flex items-start gap-3">
        <CheckCircle
          size={24}
          weight="duotone"
          aria-hidden="true"
          style={{ color: 'var(--color-accent)', flexShrink: 0 }}
        />
        <p style={{ fontWeight: 'var(--weight-semibold)' }}>{t('successMembership')}</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const payload = { ...values, elapsed: Date.now() - mountedAt.current };
        const result =
          mode === 'membership' ? await submitMembership(payload) : await submitDonation(payload);

        if (result.ok) {
          setState('sent');
          reset();
          return;
        }
        setState(result.error === 'form.rateLimited' ? 'rate-limited' : 'error');
      })}
      style={{ display: 'grid', gap: compact ? 'var(--space-3)' : 'var(--space-4)' }}
    >
      <div aria-hidden="true" className="visually-hidden">
        <label htmlFor={`${mode}-website`}>Website</label>
        <input
          id={`${mode}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('website')}
        />
      </div>

      <input type="hidden" {...register('locale')} value={locale} />

      <Field label={t('name')} required error={message(errors.name?.message)}>
        {(props) => <Input type="text" autoComplete="name" {...props} {...register('name')} />}
      </Field>

      <Field label={t('email')} required error={message(errors.email?.message)}>
        {(props) => (
          <Input type="email" autoComplete="email" dir="ltr" {...props} {...register('email')} />
        )}
      </Field>

      <Field
        label={t('phone')}
        optionalLabel={t('optional')}
        error={message(errors.phone?.message)}
      >
        {(props) => (
          <Input type="tel" autoComplete="tel" dir="ltr" {...props} {...register('phone')} />
        )}
      </Field>

      <Field
        label={mode === 'membership' ? tSupport('tier') : tSupport('purpose')}
        required
        error={message(
          mode === 'membership'
            ? (errors.tier?.message as string | undefined)
            : (errors.purpose?.message as string | undefined),
        )}
      >
        {(props) => (
          <Select {...props} {...register(selectField as keyof Values)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label={t('message')}
        optionalLabel={t('optional')}
        error={message(errors.message?.message)}
      >
        {(props) => <Textarea rows={compact ? 3 : 5} {...props} {...register('message')} />}
      </Field>

      <div aria-live="polite">
        {state === 'error' ? <p className="field-error">{t('error')}</p> : null}
        {state === 'rate-limited' ? <p className="field-error">{t('rateLimited')}</p> : null}
      </div>

      <div>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? tActions('sending') : tActions('send')}
        </Button>
      </div>
    </form>
  );
}
