'use client';

import { startTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * What an error boundary shows: a sentence the visitor can act on, a retry,
 * and a way back. The digest only goes to the console, where it can be
 * matched with a server log line; it is never a heading.
 */
export function ErrorView({
  error,
  reset,
  title,
  body,
  back,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  body?: string;
  back?: { href: string; label: string };
}) {
  const t = useTranslations('error');
  const tActions = useTranslations('actions');
  const router = useRouter();

  useEffect(() => {
    console.error('[error-boundary]', { digest: error.digest, message: error.message });
  }, [error]);

  // A server component that threw needs its payload fetched again, and
  // `reset` alone only re-renders what the client already has.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <div className="page section-loose error-view">
      <div className="rail">
        <div
          className="head-rule"
          aria-hidden="true"
          style={{ paddingBlockStart: 'var(--space-2)' }}
        />
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <h1 className="error-view-title">{title ?? t('errorTitle')}</h1>
          <p className="lead">{body ?? t('errorBody')}</p>
          <div className="error-view-actions">
            <Button onClick={retry}>{tActions('retry')}</Button>
            <Link href={back?.href ?? '/'} className="btn btn-secondary">
              {back?.label ?? t('backHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
