import { NextResponse, type NextRequest } from 'next/server';
import { getPrayerDay } from '@/lib/prayer-page';
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit';

/**
 * Today's prayer times for the visitor's own position.
 *
 * The browser sends its coordinates here rather than to Aladhan, so the API
 * only ever sees this server. They are cut to two decimals (about a kilometre,
 * far finer than prayer times change over) before they go anywhere, which
 * also lets neighbours share one cached answer. Nothing is stored.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lng'));
  const timeZone = params.get('tz') ?? '';

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !isTimeZone(timeZone)
  ) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  // Each answer is at most two calls to Aladhan; keep one visitor from
  // turning this into a proxy for many.
  const ipHash = hashIp(clientIp(request.headers));
  const limit = await checkRateLimit(`prayer-day:${ipHash || 'unknown'}`, 30, 3600);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate-limited' },
      { status: 429, headers: { 'Retry-After': String(limit.resetIn) } },
    );
  }

  const day = await getPrayerDay(new Date(), {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
    timeZone,
  });
  return NextResponse.json(day, { headers: { 'Cache-Control': 'private, no-store' } });
}

function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
