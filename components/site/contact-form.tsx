'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  CheckCircle,
  CircleNotch,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr';
import { contactSchema, type ContactInput } from '@/lib/validation/forms';
import { CONTACT_FORM_TOPICS, isTopic, type Topic } from '@/lib/topics';
import { submitContact } from '@/app/actions/submissions';
import { Link } from '@/lib/i18n/navigation';
import { Field, Input, Textarea } from '../ui/field';
import type { Locale } from '@/lib/i18n/config';

/**
 * The contact form.
 *
 * The same Zod schema validates here and in the server action, so the two can
 * never disagree about what is acceptable. Error strings are catalogue keys
 * resolved in the reader's language. A field is checked when it is left and
 * again on submit; a failed submit lists what to fix at the top, each item a
 * link to its field, and puts the cursor in the first.
 */
/** Names of the things a link can be about, by topic and id. */
export type ContactSubjects = Partial<Record<'course' | 'event' | 'sport', Record<string, string>>>;

const MAX_MESSAGE = 2000;

const IDS = {
  name: 'contact-name',
  email: 'contact-email',
  phone: 'contact-phone',
  topic: 'contact-topic',
  subject: 'contact-subject',
  message: 'contact-message',
} as const;
type Checked = keyof typeof IDS;

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
  const sentRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      locale,
      hp_field_x: '',
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

  useEffect(() => {
    if (state === 'sent') sentRef.current?.focus();
  }, [state]);

  // A field is checked when it is left — but not while the pointer that left
  // it is still down. The error line appearing shifts everything below it,
  // and a press that began on a topic chip would end beside it and be lost.
  const pointerDown = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => {
    const down = () => {
      pointerDown.current = true;
    };
    const up = () => {
      pointerDown.current = false;
      const run = pending.current;
      pending.current = null;
      if (run) window.setTimeout(run, 120);
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
    };
  }, []);
  /** `register` with the check on leaving, and again on typing once it has failed. */
  const field = (name: Checked) =>
    register(name, {
      onBlur: () => {
        const run = () => void trigger(name);
        if (pointerDown.current) pending.current = run;
        else run();
      },
      onChange: () => {
        if (errors[name]) void trigger(name);
      },
    });

  const topic = watch('topic');
  const subject = watch('subject');
  const length = (watch('message') ?? '').length;
  const showSubject =
    topic === 'course' || topic === 'event' || topic === 'sport' || Boolean(subject);
  // A link may arrive with membership or donation selected; it stays a choice.
  const choices: readonly Topic[] =
    topic && !(CONTACT_FORM_TOPICS as readonly string[]).includes(topic)
      ? [...CONTACT_FORM_TOPICS, topic as Topic]
      : CONTACT_FORM_TOPICS;

  /** Resolve a schema error key through the catalogue, or show it verbatim. */
  const message = (key?: string) =>
    key && t.has(key.replace('form.', '')) ? t(key.replace('form.', '')) : key;
  const number = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
    useGrouping: false,
  });
  const warn = <WarningCircle size={16} weight="duotone" aria-hidden="true" />;
  const problems = (Object.keys(IDS) as Checked[]).filter((key) => errors[key]?.message);

  if (state === 'sent') {
    return (
      <div ref={sentRef} tabIndex={-1} role="status" className="contact-sent">
        <CheckCircle size={36} weight="duotone" aria-hidden="true" />
        <p>{t('success')}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            reset();
            mountedAt.current = Date.now();
            setState('idle');
          }}
        >
          {tContact('another')}
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="contact-form form-stack"
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
    >
      {submitCount > 0 && problems.length > 0 ? (
        <div role="alert" className="contact-summary">
          <p>{tContact('errorSummary')}</p>
          <ul>
            {problems.map((key) => (
              <li key={key}>
                <a
                  href={`#${IDS[key]}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setFocus(key);
                  }}
                >
                  {message(errors[key]?.message)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Honeypot: off-screen, out of the tab order, no label for autofill to
          match — but a bot fills it in. */}
      <div aria-hidden="true" className="hp-field">
        <input type="text" tabIndex={-1} autoComplete="off" {...register('hp_field_x')} />
      </div>

      <input type="hidden" {...register('locale')} value={locale} />

      <div className="contact-form-pair">
        <Field
          id={IDS.name}
          label={t('name')}
          required
          error={message(errors.name?.message)}
          errorIcon={warn}
        >
          {(props) => <Input type="text" autoComplete="name" {...props} {...field('name')} />}
        </Field>

        <Field
          id={IDS.email}
          label={t('email')}
          required
          error={message(errors.email?.message)}
          errorIcon={warn}
        >
          {(props) => (
            <Input type="email" autoComplete="email" dir="ltr" {...props} {...field('email')} />
          )}
        </Field>
      </div>

      <Field
        id={IDS.phone}
        label={t('phone')}
        optionalLabel={t('optional')}
        error={message(errors.phone?.message)}
        errorIcon={warn}
      >
        {(props) => (
          <Input type="tel" autoComplete="tel" dir="ltr" {...props} {...field('phone')} />
        )}
      </Field>

      {/* Radio buttons drawn as chips: every choice in sight, one tap, and the
          arrow keys move between them as in any radio group. */}
      <div className="field">
        <p className="field-label" id={`${IDS.topic}-label`}>
          {tContact('topic')}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={`${IDS.topic}-label`}
          aria-describedby={errors.topic ? `${IDS.topic}-error` : undefined}
          className="contact-chips"
        >
          {choices.map((choice, index) => (
            <label key={choice} className="contact-chip">
              <input
                type="radio"
                value={choice}
                id={index === 0 ? IDS.topic : undefined}
                {...register('topic')}
              />
              <Check size={16} weight="bold" aria-hidden="true" className="contact-chip-check" />
              {tContact(`topics.${choice}`)}
            </label>
          ))}
        </div>
        {errors.topic ? (
          <p className="field-error" id={`${IDS.topic}-error`}>
            {warn}
            {message(errors.topic.message)}
          </p>
        ) : null}
        <Link href="/support" className="contact-inline-link contact-support-link">
          {tContact('supportLink')}
          <ArrowRight size={14} weight="bold" aria-hidden="true" className="mirror" />
        </Link>
      </div>

      {showSubject ? (
        <Field
          id={IDS.subject}
          label={
            topic === 'course' || topic === 'event' || topic === 'sport'
              ? tContact(`subjectFor.${topic}`)
              : tContact('subject')
          }
          optionalLabel={t('optional')}
          error={message(errors.subject?.message)}
          errorIcon={warn}
        >
          {(props) => <Input type="text" {...props} {...field('subject')} />}
        </Field>
      ) : null}

      <Field
        id={IDS.message}
        label={t('message')}
        required
        error={message(errors.message?.message)}
        errorIcon={warn}
        hint={tContact('counter', {
          count: number.format(length),
          max: number.format(MAX_MESSAGE),
        })}
        className="contact-message"
      >
        {(props) => <Textarea maxLength={MAX_MESSAGE} {...props} {...field('message')} />}
      </Field>

      <p className="contact-consent">
        {tContact.rich('consent', {
          link: (chunks) => <Link href="/privacy">{chunks}</Link>,
        })}
      </p>

      {state === 'error' || state === 'rate-limited' ? (
        <p role="alert" className="contact-failed">
          <WarningCircle size={20} weight="duotone" aria-hidden="true" />
          {state === 'error' ? t('error') : t('rateLimited')}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          className="btn btn-lg contact-submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting ? (
            <CircleNotch size={20} weight="bold" aria-hidden="true" className="contact-spin" />
          ) : (
            <PaperPlaneTilt size={20} weight="duotone" aria-hidden="true" className="mirror" />
          )}
          {isSubmitting ? tActions('sending') : tContact('send')}
        </button>
      </div>
    </form>
  );
}
