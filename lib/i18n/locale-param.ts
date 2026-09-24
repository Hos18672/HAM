import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale, type Locale } from './config';

/**
 * Takes the `[locale]` route param and hands back a real `Locale`.
 *
 * `[locale]` is the only segment at the root, so it matches anything Next has
 * no other home for — `/favicon.ico`, `/apple-touch-icon.png`, any dotted path
 * the middleware skips. Casting the param instead of checking it sends that
 * string on to Postgres, which rejects it against the `locale` enum and logs a
 * failed query for every such request. `dynamicParams = false` on the layout
 * 404s the response but does not stop the page's queries from starting.
 *
 * So every page under `[locale]` funnels its param through here: 404 first,
 * query second.
 */
export function requireLocale(locale: string): Locale {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
