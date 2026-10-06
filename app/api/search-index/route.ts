import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { searchIndex } from '@/lib/search';

/**
 * Everything the header search can find, in one language, as a list.
 *
 * The search itself is a server action. Where there is no server — the
 * static preview — the snapshot saves this list beside the pages and the
 * browser searches it instead (`lib/search-local`); the live site falls back
 * to it too if the action ever fails. Public content only, the same rows the
 * action searches.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  if (!isLocale(locale)) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  return NextResponse.json(await searchIndex(locale), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
