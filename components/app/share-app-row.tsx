'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShareNetwork } from '@phosphor-icons/react/dist/ssr';

/**
 * "Share the app": the system share sheet where there is one, otherwise the
 * site's address copied to the clipboard.
 */
export function ShareAppRow() {
  const t = useTranslations('app');
  const tBrand = useTranslations('brand');
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${window.location.pathname.replace(/\/more$/, '')}`;
    if (navigator.share) {
      await navigator.share({ title: tBrand('name'), url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className="a-list-row" onClick={share}>
      <ShareNetwork size={22} weight="duotone" aria-hidden="true" />
      <span className="a-grow">{t('shareApp')}</span>
      <span className="a-val" role="status">
        {copied ? t('linkCopied') : ''}
      </span>
    </button>
  );
}
