import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { getMushafPage, PAGE_COUNT } from '@/lib/quran';

/**
 * One mushaf page as data, for turning pages in the reader without loading
 * the whole site page again. The same for everyone and never changing, so it
 * is cached at the edge for a month.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  const n = Number(page);
  if (!isLocale(locale) || !Number.isInteger(n) || n < 1 || n > PAGE_COUNT) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  const data = await getMushafPage(n, locale);
  if (!data) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400' },
  });
}
