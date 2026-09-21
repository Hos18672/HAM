import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireUser, AuthError } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/db/queries/content';

/**
 * Manual cache flush. Content writes revalidate their own tag, so this is an
 * escape hatch for the rare case where a restore or a direct database change
 * has left the rendered pages stale.
 */
export async function POST(request: Request) {
  try {
    await requireUser('admin');
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.kind },
        { status: error.kind === 'forbidden' ? 403 : 401 },
      );
    }
    throw error;
  }

  const body = (await request.json().catch(() => ({}))) as { tag?: string };
  const tags = body.tag ? [body.tag] : Object.values(CACHE_TAGS);

  const known = new Set<string>(Object.values(CACHE_TAGS));
  const applied = tags.filter((tag) => known.has(tag));
  if (applied.length === 0) return NextResponse.json({ error: 'unknown-tag' }, { status: 400 });

  for (const tag of applied) revalidateTag(tag);
  return NextResponse.json({ revalidated: applied });
}
