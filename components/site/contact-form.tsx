'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { contactSchema, type ContactInput } from '@/lib/validation/forms';
import { TOPICS, isTopic } from '@/lib/topics';
import { submitContact } from '@/app/actions/submissions';
import { Field, Input, Textarea, Select } from '../ui/field';
import { Button } from '../ui/button';
import type { Locale } from '@/lib/i18n/config';

/**
 * The contact form.
 *
 * The same Zod schema validates here and in the server action, so the two can
 * never disagree about what is acceptable. Error strings are catalogue keys
 * resolved in the reader's language.
 */
/** Names of the things a link can be about, by topic and id. */
export type ContactSubjects = Partial<Record<'course' | 'event' | 'sport', Record<string, string>>>;

export function ContactForm({
  locale,
  subjects = {},
}: {
  locale: Locale;
  subjects?: ContactSubjects;
}) {
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      locale,
      website: '',
      elapsed: 0,
      topic: 'general',
      subject: '',
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  // The topic, and the course or event it is about, come from the link
  // (`?topic=course&id=deutsch-a1`). Read here rather than on the server so
  // the static preview, which has no server to read a query string, does the
  // same thing.
  useEffect(() => {
    mountedAt.current = Date.now();
    const query = new URLSearchParams(window.location.search);
    const topic = query.get('topic');
    if (!isTopic(topic)) return;
    setValue('topic', topic);
    const id = query.get('id');
    const names =
      topic === 'course' || topic === 'event' || topic === 'sport' ? subjects[topic] : undefined;
    if (id && names?.[id]) setValue('subject', names[id]);
  }, [setValue, subjects]);

  const topic = watch('topic');
  const subject = watch('subject');
  const showSubject =
    topic === 'course' || topic === 'event' || topic === 'sport' || Boolean(subject);

  /** Resolve a schema error key through the catalogue, or show it verbatim. */
  const message = (key?: string) =>
    key && t.has(key.replace('form.', '')) ? t(key.replace('form.', '')) : key;

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="flex items-start gap-3"
        style={{ maxInlineSize: 'var(--measure)' }}
      >
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
      <p className="form-legend">{t('requiredLegend')}</p>
      {/* Honeypot: off-screen and out of the tab order, but a bot fills it in. */}
      <div aria-hidden="true" className="hp-field">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
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

      {showSubject ? (
        <Field
          label={
            topic === 'course' || topic === 'event' || topic === 'sport'
              ? tContact(`subjectFor.${topic}`)
              : tContact('subject')
          }
          optionalLabel={t('optional')}
          error={message(errors.subject?.message)}
        >
          {(props) => <Input type="text" {...props} {...register('subject')} />}
        </Field>
      ) : null}

      <Field label={t('message')} required error={message(errors.message?.message)}>
        {(props) => <Textarea rows={6} {...props} {...register('message')} />}
      </Field>

      {state === 'error' || state === 'rate-limited' ? (
        <p role="alert" className="form-failed">
          <WarningCircle size={20} weight="duotone" aria-hidden="true" />
          {state === 'error' ? t('error') : t('rateLimited')}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? tActions('sending') : tActions('send')}
        </Button>
      </div>
    </form>
  );
}
