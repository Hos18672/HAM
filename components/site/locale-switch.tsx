'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/lib/i18n/navigation';
import { locales, localeLabel, type Locale } from '@/lib/i18n/config';
import { cn } from '../ui/cn';

/**
 * Keeps the reader on the same page when they switch language — `usePathname`
 * from next-intl returns the route without the locale prefix, so the link is
 * the same page in the other language rather than a jump to the home page.
 *
 * The query string has to be carried over by hand: `usePathname` drops it, and
 * on a page whose content depends on it (the prayer calendar's `?y=&m=`)
 * losing it would silently throw the reader back to the current month.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  // `useSearchParams` opts its subtree out of static prerendering, so it is
  // read inside a boundary: the statically rendered markup links without the
  // query, and the moment it hydrates the real one is there.
  return (
    <Suspense fallback={<Switch className={className} search="" />}>
      <SwitchWithQuery className={className} />
    </Suspense>
  );
}

function SwitchWithQuery({ className }: { className?: string }) {
  const params = useSearchParams();
  const search = params.toString();
  return <Switch className={className} search={search ? `?${search}` : ''} />;
}

function Switch({ className, search }: { className?: string; search: string }) {
  const t = useTranslations('locale');
  const pathname = usePathname();
  const params = useParams();
  const current = (params.locale as Locale | undefined) ?? 'fa';

  const position = locales.indexOf(current);

  return (
    <div
      className={cn('seg', className)}
      role="group"
      aria-label={t('switch')}
      data-pos={position < 0 ? 0 : position}
    >
      {/* Decorative: the moving fill behind the active option. What is active
          is announced by aria-current on the link itself. */}
      <span className="seg-thumb" aria-hidden="true" />
      {locales.map((locale) => {
        const isCurrent = locale === current;
        return (
          <Link
            key={locale}
            href={`${pathname}${search}`}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            className="seg-option"
            data-on={isCurrent ? 'true' : 'false'}
            aria-current={isCurrent ? 'true' : undefined}
          >
            {localeLabel[locale]}
          </Link>
        );
      })}
    </div>
  );
}
