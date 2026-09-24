import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { Compass } from '@/components/site/compass';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('qibla', locale, '/qibla');
}

export default async function QiblaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const header = await getPageHeader('qibla', typed);
  if (!header) notFound();

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <Compass locale={typed} />
        </div>
      </section>
    </>
  );
}
