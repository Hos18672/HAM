'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ShareNetwork } from '@phosphor-icons/react/dist/ssr';

/**
 * The event page's floating bar: share the event, and add it to the
 * phone's calendar (an .ics file, which Android and iOS both open in their
 * calendar app).
 */
export function EventDetailBar({
  slug,
  title,
  ics,
  addLabel,
  children,
}: {
  slug: string;
  title: string;
  startsAtIso: string;
  ics: string;
  addLabel: string;
  /** The calendar icon, rendered on the server. */
  children: React.ReactNode;
}) {
  const tApp = useTranslations('app');
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="a-fab-bar">
      <button
        type="button"
        className="a-circle"
        style={{ inlineSize: 56, blockSize: 56 }}
        aria-label={copied ? tApp('linkCopied') : tApp('share')}
        onClick={share}
      >
        {copied ? (
          <Check size={23} weight="bold" aria-hidden="true" />
        ) : (
          <ShareNetwork size={23} weight="duotone" aria-hidden="true" />
        )}
      </button>
      <a className="a-btn" data-size="56" style={{ flex: 1 }} href={ics} download={`${slug}.ics`}>
        {children}
        {addLabel}
      </a>
    </div>
  );
}
