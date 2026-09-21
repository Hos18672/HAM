'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { EDIT_COOKIE, createEditToken } from '@/lib/preferences';

/**
 * Start an in-place edit session.
 *
 * The cookie is signed and httpOnly, so edit mode cannot be entered by setting
 * a flag in the browser — only by an authenticated staff member coming through
 * this action.
 */
export async function startEditMode(locale: string) {
  const user = await requireUser();

  (await cookies()).set(EDIT_COOKIE, createEditToken(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });

  redirect(`/${locale}`);
}

export async function endEditMode(locale: string) {
  (await cookies()).delete(EDIT_COOKIE);
  redirect(`/${locale}`);
}
