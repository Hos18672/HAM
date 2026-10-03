'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { isOpenAt } from '@/lib/site-facts';

/**
 * "Open now" / "Closed now", worked out in the browser: the page is built
 * once and served for hours, so the server cannot know. Nothing is shown until
 * the browser has said, rather than a guess that flips on hydration.
 */
export function OpenNow() {
  const t = useTranslations('house');
  const [open, setOpen] = useState<boolean | null | undefined>(undefined);
  useEffect(() => {
    const update = () => setOpen(isOpenAt(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (open === undefined) return <span className="open-now" aria-hidden="true" />;
  const state = open === null ? 'programme' : open ? 'open' : 'closed';
  return (
    <span className="open-now" data-state={state} role="status">
      <span className="open-now-dot" aria-hidden="true" />
      {t(`status.${state}`)}
    </span>
  );
}
