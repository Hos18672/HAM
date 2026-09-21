'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { EDIT_COOKIE, createEditToken } from '@/lib/preferences';
import { isLocale, defaultLocale } from '@/lib/i18n/config';

/**
 * Start an in-place edit session.
 *
 * The cookie is signed and httpOnly, so edit mode cannot be entered by setting
 * a flag in the browser — only by an authenticated staff member coming through
 * this action.
 *
 * Both actions take `FormData` and are used as form actions, because they end
 * in `redirect()`: Next carries that out when it owns the invocation, which it
 * does not when the action is merely called inside a transition.
 */
export async function startEditMode(formData: FormData) {
  const user = await requireUser();

  const requested = String(formData.get('locale') ?? '');
  const locale = isLocale(requested) ? requested : defaultLocale;

  (await cookies()).set(EDIT_COOKIE, createEditToken(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // An hour. Long enough for an editing session, short enough that a
    // forgotten browser on a shared machine stops being one.
    maxAge: 60 * 60,
  });

  redirect(`/${locale}`);
}

export async function endEditMode(formData: FormData) {
  const requested = String(formData.get('locale') ?? '');
  const locale = isLocale(requested) ? requested : defaultLocale;

  (await cookies()).delete(EDIT_COOKIE);
  redirect(`/${locale}`);
}
