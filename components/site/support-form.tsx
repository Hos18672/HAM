'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CheckCircle, Check, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import {
  membershipSchema,
  donationSchema,
  type MembershipInput,
  type DonationInput,
} from '@/lib/validation/forms';
import { submitMembership, submitDonation } from '@/app/actions/submissions';
import { Field, Input, Textarea } from '../ui/field';
import { Button } from '../ui/button';
import type { Locale } from '@/lib/i18n/config';

type Mode = 'membership' | 'donation';
type Values = MembershipInput & DonationInput;

export interface SupportOption {
  value: string;
  label: string;
  /** Membership tiers carry a price and their benefits. */
  price?: string;
  benefits?: string[];
}

/**
 * One form serving both the membership tiers and the donation purposes: the
 * fields are the same but for the choice, so two near-identical components
 * would only be two places to fix a bug. The choice is a set of radio cards
 * at the head of the form — the tiers with their price and benefits — so
 * there is one form per tab instead of one per tier.
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
  options: SupportOption[];
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
    watch,
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
      <div role="status" className="form-done">
        <CheckCircle size={32} weight="duotone" aria-hidden="true" />
        <div>
          <p className="form-done-title">
            {mode === 'membership' ? t('successMembership') : t('successDonation')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            style={{ marginBlockStart: 'var(--space-3)' }}
            onClick={() => {
              mountedAt.current = Date.now();
              setState('idle');
            }}
          >
            {tActions('retry')}
          </Button>
        </div>
      </div>
    );
  }

  const chosen = watch(selectField as keyof Values) as string;
  const choiceError =
    mode === 'membership'
      ? (errors.tier?.message as string | undefined)
      : (errors.purpose?.message as string | undefined);

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
      <div aria-hidden="true" className="hp-field">
        <label htmlFor={`${mode}-website`}>Website</label>
        <input
          id={`${mode}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          {...register('website')}
        />
      </div>

      <input type="hidden" {...register('locale')} value={locale} />

      <p className="form-legend">{t('requiredLegend')}</p>

      <fieldset className="choice-set" data-kind={mode}>
        <legend>
          {mode === 'membership' ? tSupport('chooseTier') : tSupport('choosePurpose')}
          <span className="field-required" aria-hidden="true">
            {' '}
            *
          </span>
        </legend>
        <div className="choice-grid">
          {options.map((option) => (
            <label
              key={option.value}
              className="choice-card"
              data-on={chosen === option.value ? 'true' : undefined}
            >
              <input type="radio" value={option.value} {...register(selectField as keyof Values)} />
              <span className="choice-title">{option.label}</span>
              {option.price ? <span className="choice-price">{option.price}</span> : null}
              {option.benefits && option.benefits.length > 0 ? (
                <ul className="choice-benefits">
                  {option.benefits.slice(0, 3).map((benefit) => (
                    <li key={benefit}>
                      <Check size={14} weight="bold" aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          ))}
        </div>
        {choiceError ? <p className="field-error">{message(choiceError)}</p> : null}
      </fieldset>

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
        label={t('message')}
        optionalLabel={t('optional')}
        error={message(errors.message?.message)}
      >
        {(props) => <Textarea rows={compact ? 3 : 5} {...props} {...register('message')} />}
      </Field>

      {state === 'error' || state === 'rate-limited' ? (
        <p role="alert" className="form-failed">
          <WarningCircle size={20} weight="duotone" aria-hidden="true" />
          {state === 'error' ? t('error') : t('rateLimited')}
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? tActions('sending') : tActions('send')}
        </Button>
      </div>
    </form>
  );
}
