import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { getDuas } from '@/lib/db/queries/content';
import { duaText } from '@/lib/dua-texts';

/**
 * One du'a as data, so the reader can turn to the next without loading the
 * whole page again — the same thing the mushaf does with its pages.
 *
 * Everything the page shows of a du'a is here, its heading band included,
 * because turning has to replace all of it at once: a reader left looking
 * at the previous du'a's title over this one's words would be worse than
 * the navigation it replaces.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  if (!isLocale(locale)) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  const text = duaText(slug);
  if (!text) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const dua = (await getDuas(locale)).find((entry) => entry.slug === slug);
  if (!dua) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  return NextResponse.json(
    {
      slug: dua.slug,
      category: dua.category,
      arabicTitle: dua.arabicTitle,
      title: dua.title,
      summary: dua.summary,
      whenToRead: dua.whenToRead,
      source: dua.source,
      origin: text.origin,
      lines: text.lines,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
