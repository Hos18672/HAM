'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { locales, localeLabel, type Locale } from '@/lib/i18n/config';
import { cn } from './cn';

/**
 * The language switch: a segmented pill on the chip ground. The active
 * segment is white on the header (`default`) or the green fill in the menu
 * sheet (`solid`). `compact` shows فا / DE, `full` the languages' names.
 *
 * It keeps the reader on the same page, query string and all, and records
 * the choice for the bare root, which has nothing else to go on.
 */
interface Props {
  variant?: 'default' | 'solid';
  labels?: 'compact' | 'full';
  className?: string;
}

const SHORT: Record<Locale, string> = { fa: 'فا', de: 'DE' };

function remember(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** The current page with its query, which `usePathname` drops. */
function useHere(search: string) {
  return `${usePathname()}${search}`;
}

export function LangSwitch(props: Props) {
  // `useSearchParams` opts its subtree out of static prerendering, so it is
  // read inside a boundary: the built markup links without the query, and
  // the hydrated one with it.
  return (
    <Suspense fallback={<Segments {...props} search="" />}>
      <WithQuery {...props} />
    </Suspense>
  );
}

function WithQuery(props: Props) {
  const search = useSearchParams().toString();
  return <Segments {...props} search={search ? `?${search}` : ''} />;
}

function Segments({
  variant = 'default',
  labels = 'compact',
  className,
  search,
}: Props & { search: string }) {
  const t = useTranslations('locale');
  const here = useHere(search);
  const current = (useParams().locale as Locale | undefined) ?? 'fa';
  return (
    <div
      className={cn('lang-switch', variant === 'solid' && 'lang-switch-solid', className)}
      role="group"
      aria-label={t('switch')}
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={here}
          locale={locale}
          hrefLang={locale}
          lang={locale}
          className="lang-seg"
          aria-current={locale === current ? 'true' : undefined}
          onClick={() => remember(locale)}
        >
          {labels === 'compact' ? (
            <>
              <span aria-hidden="true">{SHORT[locale]}</span>
              <span className="visually-hidden">{localeLabel[locale]}</span>
            </>
          ) : (
            localeLabel[locale]
          )}
        </Link>
      ))}
    </div>
  );
}

/** One round button that goes to the other language — the phone header's. */
export function LangCircle({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Circle className={className} search="" />}>
      <CircleWithQuery className={className} />
    </Suspense>
  );
}

function CircleWithQuery({ className }: { className?: string }) {
  const search = useSearchParams().toString();
  return <Circle className={className} search={search ? `?${search}` : ''} />;
}

function Circle({ className, search }: { className?: string; search: string }) {
  const t = useTranslations('nav');
  const here = useHere(search);
  const current = (useParams().locale as Locale | undefined) ?? 'fa';
  const other: Locale = current === 'fa' ? 'de' : 'fa';
  return (
    <Link
      href={here}
      locale={other}
      hrefLang={other}
      className={cn('icon-circle icon-circle-text', className)}
      aria-label={t('otherLanguage')}
      onClick={() => remember(other)}
    >
      <span lang={other} aria-hidden="true">
        {SHORT[other]}
      </span>
    </Link>
  );
}
