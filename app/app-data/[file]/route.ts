import { NextResponse } from 'next/server';
import { appData } from '@/lib/app-data';
import { isLocale } from '@/lib/i18n/config';

/**
 * The Android app's content feed, one file per language: /app-data/fa.json
 * and /app-data/de.json (`lib/app-data.ts`).
 */
export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const locale = file.replace(/\.json$/, '');
  if (!file.endsWith('.json') || !isLocale(locale)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  return NextResponse.json(await appData(locale), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
