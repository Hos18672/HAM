'use client';

import { useTransition } from 'react';
import { PencilSimple, ArrowSquareOut, CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { endEditMode } from '@/app/actions/edit-mode';
import type { Locale } from '@/lib/i18n/config';
import { Button, LinkButton } from '../ui/button';
import { useEditStatus } from './edit-status';

export interface EditBarLabels {
  mode: string;
  lastSaved: string;
  never: string;
  saving: string;
  saved: string;
  failed: string;
  toAdmin: string;
  exit: string;
  editing: string;
}

export function EditBarClient({ locale, labels }: { locale: Locale; labels: EditBarLabels }) {
  const status = useEditStatus();
  const [pending, startTransition] = useTransition();

  const stateLabel =
    status.state === 'saving'
      ? labels.saving
      : status.state === 'failed'
        ? labels.failed
        : status.state === 'saved'
          ? labels.saved
          : labels.mode;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        insetInline: 0,
        insetBlockEnd: 0,
        zIndex: 'var(--z-editbar)',
        background: 'var(--color-ink)',
        color: 'var(--color-bg)',
        paddingBlock: 'var(--space-2)',
      }}
    >
      <div className="page flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2" style={{ fontWeight: 'var(--weight-bold)' }}>
          {status.state === 'failed' ? (
            <WarningCircle size={18} weight="duotone" aria-hidden="true" />
          ) : status.state === 'saved' ? (
            <CheckCircle size={18} weight="duotone" aria-hidden="true" />
          ) : (
            <PencilSimple size={18} weight="duotone" aria-hidden="true" />
          )}
          {stateLabel}
        </span>

        <span className="text-xs" style={{ opacity: 0.8 }}>
          {labels.editing}
        </span>

        <span className="text-xs" style={{ opacity: 0.8 }}>
          {labels.lastSaved}:{' '}
          {status.lastSavedAt
            ? new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'de-AT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'Europe/Vienna',
              }).format(status.lastSavedAt)
            : labels.never}
        </span>

        <div className="ms-auto flex items-center gap-2">
          <LinkButton href={`/admin`} variant="secondary" size="sm" style={{ color: 'var(--color-bg)', borderColor: 'var(--color-bg)' }}>
            <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            {labels.toAdmin}
          </LinkButton>
          <Button
            size="sm"
            loading={pending}
            onClick={() => startTransition(() => void endEditMode(locale))}
          >
            {labels.exit}
          </Button>
        </div>
      </div>
    </div>
  );
}
