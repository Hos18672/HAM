import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireLocale } from '@/lib/i18n/locale-param';
import { isLocale, locales } from '@/lib/i18n/config';
import { getDuas } from '@/lib/db/queries/content';
import { duaText, DUA_TEXT_SLUGS, type DuaStub } from '@/lib/dua-texts';
import { DuaReader } from '@/components/site/dua-reader';

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

  const duas = await getDuas(typed);
  const dua = duas.find((entry) => entry.slug === slug);
  if (!dua) notFound();

  // Only the ones that can actually be opened, in the order the index
  // lists them: the reader turns and picks from this, so a swipe never
  // lands on a card with no text behind it.
  const catalogue: DuaStub[] = duas
    .filter((entry) => duaText(entry.slug))
    .map((entry) => ({
      slug: entry.slug,
      category: entry.category,
      title: entry.title,
      arabicTitle: entry.arabicTitle,
    }));

  // The reader owns the whole du'a — band, words and facts — because
  // turning to the next replaces all three at once, without a navigation.
  return (
    <DuaReader
      initial={{
        slug: dua.slug,
        category: dua.category,
        arabicTitle: dua.arabicTitle,
        title: dua.title,
        summary: dua.summary,
        whenToRead: dua.whenToRead,
        source: dua.source,
        origin: text.origin,
        lines: text.lines,
      }}
      catalogue={catalogue}
      locale={typed}
      basePath={`/${typed}/duas`}
    />
  );
}
