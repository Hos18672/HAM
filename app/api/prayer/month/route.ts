import { NextResponse, type NextRequest } from 'next/server';
import { getTimetable } from '@/lib/prayer-page';

/**
 * One month of Vienna's prayer times, for the timetable when the reader moves
 * to a month the page did not open on. The same for everyone, so it is cached
 * at the edge for a day.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const year = Number(params.get('y'));
  const month = Number(params.get('m'));
  if (
    !Number.isInteger(year) ||
    year < 1901 ||
    year > 2199 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const timetable = await getTimetable(year, month);
  // A month computed locally because the API was down is kept only briefly,
  // so the API's answer replaces it once it is back.
  const maxAge = timetable.source === 'aladhan' ? 86400 : 600;
  return NextResponse.json(timetable, {
    headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` },
  });
}
