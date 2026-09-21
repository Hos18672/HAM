import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { media, mediaTranslations, galleryItems } from '@/lib/db/schema';
import { requireUser, AuthError } from '@/lib/auth';
import { readEditSession } from '@/lib/preferences';
import { uploadImage, readImageSize } from '@/lib/storage';
import { MAX_UPLOAD_BYTES } from '@/lib/validation/content';
import { locales } from '@/lib/i18n/config';
import { revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

/**
 * Media upload.
 *
 * Reachable by a logged-in staff member or from a live edit session — the same
 * two doors as the content actions. The file is checked for size and type
 * before anything is written, and again inside `uploadImage`.
 */
export async function POST(request: Request) {
  let userId: string;
  const editSession = await readEditSession();
  if (editSession) {
    userId = editSession.userId;
  } else {
    try {
      const user = await requireUser();
      userId = user.id;
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      throw error;
    }
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no-file' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'too-large' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { width, height } = readImageSize(bytes);

  const uploaded = await uploadImage(file);
  if ('error' in uploaded) {
    const status = uploaded.error === 'not-configured' ? 503 : 400;
    return NextResponse.json({ error: uploaded.error }, { status });
  }

  const [row] = await db
    .insert(media)
    .values({
      url: uploaded.url,
      key: uploaded.key,
      mime: uploaded.mime,
      width,
      height,
      uploadedBy: userId,
    })
    .returning({ id: media.id });

  if (!row) return NextResponse.json({ error: 'write-failed' }, { status: 500 });

  // An alt row per locale from the start, so the caption editor always has a
  // row to write into and the two languages stay in step.
  const altFromFilename = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  await db
    .insert(mediaTranslations)
    .values(
      locales.map((locale) => ({ mediaId: row.id, locale, alt: altFromFilename, caption: '' })),
    );

  // When the upload came from the gallery page, list it straight away.
  const addToGallery = form.get('gallery') === 'true';
  if (addToGallery) {
    const category = String(form.get('category') ?? 'general').slice(0, 64);
    await db.insert(galleryItems).values({ mediaId: row.id, category, sort: 0 });
    revalidateTag('gallery');
  }

  return NextResponse.json({
    id: row.id,
    url: uploaded.url,
    width,
    height,
    mime: uploaded.mime,
  });
}
