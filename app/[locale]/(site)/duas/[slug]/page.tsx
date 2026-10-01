import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';

import { requireLocale } from '@/lib/i18n/locale-param';
import { isLocale, locales } from '@/lib/i18n/config';
import { getDuas } from '@/lib/db/queries/content';
import { duaText, DUA_TEXT_SLUGS } from '@/lib/dua-texts';
import { DuaReader, type Neighbour } from '@/components/site/dua-reader';
import { PatternPlate, Ring } from '@/components/site/ornaments';

/**
 * One du'a, in full: the Arabic line by line with the translation under it.
 *
 * Static, like everything else the site can settle in advance — the text of
 * a supplication from the ninth century does not change.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) => DUA_TEXT_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !duaText(slug)) return {};
  const dua = (await getDuas(locale)).find((entry) => entry.slug === slug);
  if (!dua) return {};
  const path = `/duas/${slug}`;
  return {
    title: dua.title,
    description: dua.summary,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { fa: `/fa${path}`, de: `/de${path}`, 'x-default': `/fa${path}` },
    },
  };
}

export default async function DuaTextPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const typed = requireLocale(locale);
  const text = duaText(slug);
  if (!text) notFound();

  const t = await getTranslations({ locale, namespace: 'duas' });
  const duas = await getDuas(typed);
  const dua = duas.find((entry) => entry.slug === slug);
  if (!dua) notFound();

  // The neighbours are the next and previous du'a that can actually be
  // opened, in the order the page lists them — so a swipe never lands on a
  // card with no text behind it.
  const readable = duas.filter((entry) => duaText(entry.slug));
  const at = readable.findIndex((entry) => entry.slug === slug);
  const neighbour = (entry: (typeof readable)[number] | undefined): Neighbour | null =>
    entry ? { slug: entry.slug, title: entry.title } : null;

  const basePath = `/${typed}/duas`;

  return (
    <>
      <header className="section-band page-head-band" data-rise>
        <PatternPlate tiling="shesh" drift opacity={0.7} />
        <Ring />
        <div className="page" style={{ position: 'relative' }}>
          <div style={{ maxInlineSize: '32em' }}>
            <Link href={basePath} className="dua-back">
              <ArrowLeft size={15} weight="bold" aria-hidden="true" className="mirror" />
              {t('allDuas')}
            </Link>
            <p className="kicker" style={{ marginBlockStart: '18px', color: 'var(--gold)' }}>
              {t(`category.${dua.category}`)}
            </p>
            <h1
              style={{
                marginBlockStart: '14px',
                fontSize: 'clamp(30px, 4.4vw, 52px)',
                lineHeight: 1.08,
                color: 'var(--bandHead)',
              }}
            >
              {dua.title}
            </h1>
            <p
              lang="ar"
              dir="rtl"
              className="dua-head-ar"
              style={{ marginBlockStart: '10px', color: 'var(--gold)' }}
            >
              {dua.arabicTitle}
            </p>
            <p style={{ marginBlockStart: '16px', color: 'var(--bandDim)' }}>{dua.summary}</p>
          </div>
        </div>
      </header>

      <section className="section mushaf-section">
        <div className="page" style={{ maxInlineSize: '58rem' }}>
          <DuaReader
            lines={text.lines}
            locale={typed}
            arabicTitle={dua.arabicTitle}
            title={dua.title}
            basePath={basePath}
            previous={neighbour(readable[at - 1])}
            next={neighbour(readable[at + 1])}
          />

          <dl className="dua-facts">
            <dt>{t('whenToRead')}</dt>
            <dd>{dua.whenToRead}</dd>
            <dt>{t('source')}</dt>
            <dd>{dua.source}</dd>
            <dt>{t('textSource')}</dt>
            <dd>{t(`textOrigin.${text.origin}`)}</dd>
          </dl>
        </div>
      </section>
    </>
  );
}
