import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { isLocale, locales } from '@/lib/i18n/config';
import { getQuranIndex, getSurahList } from '@/lib/quran';
import { getQuranHeader } from '@/lib/quran-page';
import { PageHead } from '@/components/site/page-head';
import { SurahIndex } from '@/components/site/surah-index';
import { QuranContinue } from '@/components/site/quran-continue';
import { Link } from '@/lib/i18n/navigation';

/** The text does not change; the list is rebuilt once a month at most. */
export const revalidate = 2592000;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const header = await getQuranHeader(locale);
  const canonical = `/${locale}/quran`;
  return {
    title: header.title,
    description: header.lead,
    alternates: {
      canonical,
      languages: { fa: '/fa/quran', de: '/de/quran', 'x-default': '/fa/quran' },
    },
    openGraph: { title: header.title, description: header.lead, url: canonical },
  };
}

export default async function QuranPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, surahs, index] = await Promise.all([
    getQuranHeader(typed),
    getSurahList(),
    getQuranIndex(),
  ]);
  // An unreachable API is an error, not an empty page: an error is not
  // cached, so the next visit tries again rather than keeping a blank list.
  const t = await getTranslations({ locale, namespace: 'quran' });
  if (!surahs || !index) throw new Error(t('unavailable'));

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <QuranContinue surahs={surahs} locale={typed} />
          <Link
            href="/quran/page/1"
            className="btn btn-primary"
            style={{ marginBlockEnd: 'var(--space-6)' }}
          >
            {t('readAsBook')}
          </Link>
          <SurahIndex surahs={surahs} startPage={index.surahPage} locale={typed} />
        </div>
      </section>
    </>
  );
}
