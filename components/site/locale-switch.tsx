'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/lib/i18n/navigation';
import { locales, localeLabel, type Locale } from '@/lib/i18n/config';
import { cn } from '../ui/cn';

/**
 * Keeps the reader on the same page when they switch language — `usePathname`
 * from next-intl returns the route without the locale prefix, so the link is
 * the same page in the other language rather than a jump to the home page.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const pathname = usePathname();
  const params = useParams();
  const current = (params.locale as Locale | undefined) ?? 'fa';

  return (
    <div className={cn('nav', className)} role="group" aria-label={t('switch')}>
      {locales.map((locale) => {
        const isCurrent = locale === current;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            className="nav-link"
            aria-current={isCurrent ? 'true' : undefined}
            style={isCurrent ? { fontWeight: 'var(--weight-bold)', color: 'var(--color-ink)' } : undefined}
          >
            {localeLabel[locale]}
          </Link>
        );
      })}
    </div>
  );
}
