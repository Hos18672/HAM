'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from '@phosphor-icons/react/dist/ssr';

/** Copies a value (the IBAN, without its spaces) and says so for two seconds. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations('support');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <Check size={16} weight="bold" aria-hidden="true" />
      ) : (
        <Copy size={16} weight="duotone" aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? t('copied') : label}</span>
    </button>
  );
}
