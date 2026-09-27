import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/lib/i18n/navigation';
import { requireLocale } from '@/lib/i18n/locale-param';
import { getQuranIndex, SURAH_COUNT } from '@/lib/quran';

/**
 * A surah's own address. The Quran is read as a book now, so this sends the
 * reader to the page the surah begins on, at its banner.
 */
export const dynamicParams = true;

export default async function SurahRoute({
  params,
}: {
  params: Promise<{ locale: string; surah: string }>;
}) {
  const { locale, surah } = await params;
  const typed = requireLocale(locale);
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > SURAH_COUNT || String(n) !== surah) notFound();

  const index = await getQuranIndex();
  if (!index) {
    const t = await getTranslations({ locale, namespace: 'quran' });
    throw new Error(t('unavailable'));
  }
  redirect({ href: `/quran/page/${index.surahPage[n]}#surah-${n}`, locale: typed });
}
