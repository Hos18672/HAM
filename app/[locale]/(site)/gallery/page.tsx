import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getPageHeader, getGallery } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { GalleryGrid } from '@/components/site/gallery-grid';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('gallery', locale, '/gallery');
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, items] = await Promise.all([getPageHeader('gallery', typed), getGallery(typed)]);
  if (!header) notFound();

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <GalleryGrid items={items} />
        </div>
      </section>
    </>
  );
}
