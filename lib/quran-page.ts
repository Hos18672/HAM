import 'server-only';
import { getTranslations } from 'next-intl/server';
import { getPageHeader, type PageHeader } from './db/queries/content';
import type { Locale } from './i18n/config';

/**
 * The Quran page's head. Like every page's, it is kept in the database so the
 * editors can change it — but the page was added after the site was seeded,
 * so until `pnpm db:seed` has written its row the wording falls back to the
 * message catalogue rather than the page going missing.
 */
export async function getQuranHeader(locale: Locale): Promise<PageHeader> {
  const header = await getPageHeader('quran', locale);
  if (header) return header;
  const t = await getTranslations({ locale, namespace: 'quran.header' });
  return { id: '', key: 'quran', kicker: t('kicker'), title: t('title'), lead: t('lead') };
}
