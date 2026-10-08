import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { isLocale } from '@/lib/i18n/config';
import { digits } from '@/lib/i18n/format';
import { getMushafPage, getQuranIndex, getSurahList, PAGE_COUNT, TRANSLATION } from '@/lib/quran';
import { getQuranHeader } from '@/lib/quran-page';
import { QuranReader } from '@/components/site/quran-reader';

/**
 * The Quran as a book, one page at a time: the 604 pages of the Medina
 * mushaf, each at its own address. Rendered on request and kept for a month;
 * the text does not change.
 */
export const revalidate = 2592000;
// The locale layout turns unknown params away; pages are rendered on request
// instead, and `pageNumber` refuses anything but 1–604.
export const dynamicParams = true;

function pageNumber(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= PAGE_COUNT && String(n) === value ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}): Promise<Metadata> {
  const { locale, page } = await params;
  const n = pageNumber(page);
  if (!isLocale(locale) || !n) return {};
  const [header, t] = await Promise.all([
    getQuranHeader(locale),
    getTranslations({ locale, namespace: 'quran' }),
  ]);
  const path = `/quran/page/${n}`;
  return {
    title: `${header.title} · ${t('pageOf', { n: digits(n, locale) })}`,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { fa: `/fa${path}`, de: `/de${path}`, 'x-default': `/fa${path}` },
    },
  };
}

export default async function MushafRoute({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}) {
  const { locale, page: param } = await params;
  const typed = requireLocale(locale);
  const n = pageNumber(param);
  if (!n) notFound();

  const t = await getTranslations({ locale, namespace: 'quran' });
  const [page, index, surahs] = await Promise.all([
    getMushafPage(n, typed),
    getQuranIndex(),
    getSurahList(),
  ]);
  // Thrown rather than rendered, so a failed fetch is not cached for a month.
  if (!page || !index || !surahs) throw new Error(t('unavailable'));

  return (
    <QuranReader
      initialPage={page}
      surahs={surahs}
      surahPage={index.surahPage}
      juzPage={index.juzPage}
      locale={typed}
      translator={TRANSLATION[typed].translator}
    />
  );
}
