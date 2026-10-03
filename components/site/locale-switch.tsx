'use client';

import { Suspense, type CSSProperties } from 'react';
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
interface SwitchProps {
  className?: string;
  style?: CSSProperties;
  /** "FA | DE" for the slim header bar; the full names everywhere else. */
  compact?: boolean;
}

export function LocaleSwitch(props: SwitchProps) {
  // `useSearchParams` opts its subtree out of static prerendering, so it is
  // read inside a boundary: the statically rendered markup links without the
  // query, and the moment it hydrates the real one is there.
  return (
    <Suspense fallback={<Switch {...props} search="" />}>
      <SwitchWithQuery {...props} />
    </Suspense>
  );
}

function SwitchWithQuery(props: SwitchProps) {
  const params = useSearchParams();
  const search = params.toString();
  return <Switch {...props} search={search ? `?${search}` : ''} />;
}

function Switch({ className, style, compact, search }: SwitchProps & { search: string }) {
  const t = useTranslations('locale');
  const pathname = usePathname();
  const params = useParams();
  const current = (params.locale as Locale | undefined) ?? 'fa';

  const position = locales.indexOf(current);

  return (
    <div
      className={cn('seg', compact && 'seg-compact', className)}
      style={style}
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
            // The language lives in the URL, so it survives every link and
            // every reload on its own. The one place it cannot is the bare
            // root, which has nothing to go on and sends everybody to the
            // house's own Persian. Recording the choice here lets that one
            // door remember a reader who has already made it — and leaves
            // the default exactly as it was for a reader who has not.
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
            }}
          >
            {compact ? (
              <>
                <span aria-hidden="true">{locale.toUpperCase()}</span>
                <span className="visually-hidden">{localeLabel[locale]}</span>
              </>
            ) : (
              localeLabel[locale]
            )}
          </Link>
        );
      })}
    </div>
  );
}
