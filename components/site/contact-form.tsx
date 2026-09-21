'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { contactSchema, type ContactInput } from '@/lib/validation/forms';
import { submitContact } from '@/app/actions/submissions';
import { Field, Input, Textarea, Select } from '../ui/field';
import { Button } from '../ui/button';
import type { Locale } from '@/lib/i18n/config';

const TOPICS = ['general', 'courses', 'events', 'membership', 'volunteer', 'other'] as const;

/**
 * The contact form.
 *
 * The same Zod schema validates here and in the server action, so the two can
 * never disagree about what is acceptable. Error strings are catalogue keys
 * resolved in the reader's language.
 */
export function ContactForm({ locale, defaultTopic }: { locale: Locale; defaultTopic?: string }) {
  const t = useTranslations('form');
  const tContact = useTranslations('contact');
  const tActions = useTranslations('actions');

  const [state, setState] = useState<'idle' | 'sent' | 'error' | 'rate-limited'>('idle');
  // Milliseconds since the form appeared — one half of the bot check.
  const mountedAt = useRef(Date.now());

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      locale,
      website: '',
      elapsed: 0,
      topic: (TOPICS as readonly string[]).includes(defaultTopic ?? '')
        ? (defaultTopic as ContactInput['topic'])
        : 'general',
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  /** Resolve a schema error key through the catalogue, or show it verbatim. */
  const message = (key?: string) => (key && t.has(key.replace('form.', '')) ? t(key.replace('form.', '')) : key);

  if (state === 'sent') {
    return (
      <div role="status" className="flex items-start gap-3" style={{ maxInlineSize: 'var(--measure)' }}>
        <CheckCircle
          size={28}
          weight="duotone"
          aria-hidden="true"
          style={{ color: 'var(--color-accent)', flexShrink: 0 }}
        />
        <div>
          <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)' }}>
            {t('success')}
          </p>
          <p style={{ marginBlockStart: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                reset();
                mountedAt.current = Date.now();
                setState('idle');
              }}
            >
              {tActions('retry')}
            </Button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await submitContact({
          ...values,
          elapsed: Date.now() - mountedAt.current,
        });

        if (result.ok) {
          setState('sent');
          return;
        }
        if (result.error === 'form.rateLimited') {
          setState('rate-limited');
          return;
        }
        for (const [field, key] of Object.entries(result.fields ?? {})) {
          setError(field as keyof ContactInput, { message: key });
        }
        setState('error');
      })}
      style={{ display: 'grid', gap: 'var(--space-4)', maxInlineSize: '36rem' }}
    >
      {/* Honeypot: off-screen and out of the tab order, but a bot fills it in. */}
      <div aria-hidden="true" className="visually-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
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

      <Field label={t('phone')} optionalLabel={t('optional')} error={message(errors.phone?.message)}>
        {(props) => <Input type="tel" autoComplete="tel" dir="ltr" {...props} {...register('phone')} />}
      </Field>

      <Field label={tContact('topic')} required error={message(errors.topic?.message)}>
        {(props) => (
          <Select {...props} {...register('topic')}>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {tContact(`topics.${topic}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label={t('message')} required error={message(errors.message?.message)}>
        {(props) => <Textarea rows={6} {...props} {...register('message')} />}
      </Field>

      <div aria-live="polite">
        {state === 'error' ? <p className="field-error">{t('error')}</p> : null}
        {state === 'rate-limited' ? <p className="field-error">{t('rateLimited')}</p> : null}
      </div>

      <div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? tActions('sending') : tActions('send')}
        </Button>
      </div>
    </form>
  );
}
