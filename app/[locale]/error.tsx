'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * The localized error boundary. Visitors get a sentence they can act on; the
 * stack trace goes to the server log, never to the page.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');
  const tActions = useTranslations('actions');

  useEffect(() => {
    // The digest is the only handle that ties this page to a server log line.
    console.error('[error-boundary]', { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div className="page section-loose">
      <div className="rail">
        <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
          <p className="kicker">{error.digest ?? '—'}</p>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--text-4xl)' }}>{t('errorTitle')}</h1>
          <p className="lead">{t('errorBody')}</p>
          <div className="flex gap-2">
            <Button onClick={reset}>{tActions('retry')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
