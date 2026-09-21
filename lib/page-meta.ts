import type { Metadata } from 'next';
import { getPageHeader } from './db/queries/content';
import type { Locale } from './i18n/config';

/**
 * Per-page metadata, read from the same page row the heading renders — so the
 * title in the tab and the title on the page can never disagree, and an
 * editor changing one changes both.
 */
export async function pageMetadata(key: string, locale: string, path: string): Promise<Metadata> {
  const header = await getPageHeader(key, locale as Locale);
  const canonical = `/${locale}${path}`;

  return {
    title: header?.title,
    description: header?.lead,
    alternates: {
      canonical,
      languages: { fa: `/fa${path}`, de: `/de${path}`, 'x-default': `/fa${path}` },
    },
    openGraph: { title: header?.title, description: header?.lead, url: canonical },
  };
}
