import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader } from '@/lib/db/queries/content';
import { EditableText } from '@/components/editable/editable-text';
import { Qibla } from '@/components/site/qibla';
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
    /**
     * The one page that does not open with the green band every other page
     * opens with. A compass is an instrument: it is only useful if it is on
     * the screen when you arrive, and the band plus the stage under it do
     * not both fit on a phone. The band's own words are still here, set as
     * a title row, and still edited in the same place.
     */
    <section className="section section-tight qibla-section" data-rise>
      <div className="page">
        <div className="qibla-head">
          <div className="qibla-head-words">
            <EditableText
              as="span"
              entity="page"
              id={header.id}
              field="kicker"
              locale={typed}
              value={header.kicker}
              className="kicker"
              style={{ color: 'var(--goldInk)' }}
            />
            <EditableText
              as="h1"
              entity="page"
              id={header.id}
              field="title"
              locale={typed}
              value={header.title}
            />
          </div>
          <EditableText
            as="p"
            entity="page"
            id={header.id}
            field="lead"
            locale={typed}
            value={header.lead}
            className="qibla-head-lede"
          />
        </div>
        <Qibla locale={typed} />
      </div>
    </section>
  );
}
