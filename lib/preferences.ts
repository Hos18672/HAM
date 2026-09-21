import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Server-read preferences. The theme is a cookie so the very first paint on
 * the server already carries the right token set — a client-side read would
 * mean a flash of the wrong theme, which is exactly what the design forbids.
 */

export const THEME_COOKIE = 'ham-theme';
export const EDIT_COOKIE = 'ham-edit';

export type Theme = 'light' | 'dark';

export async function readTheme(fallback: Theme = 'light'): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === 'dark' || value === 'light' ? value : fallback;
}

/* ─── Edit session ───────────────────────────────────────────────────────── */

/**
 * In-place edit mode is carried by a signed, httpOnly cookie — never a
 * client-side flag. The signature binds the session to the user id and an
 * expiry, so a visitor cannot put the site into edit mode by setting a cookie,
 * and a stolen cookie stops working within the hour.
 */
export interface EditSession {
  userId: string;
  expiresAt: number;
}

const EDIT_TTL_MS = 60 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not set — edit mode cannot be signed.');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createEditToken(userId: string): string {
  const payload = `${userId}.${Date.now() + EDIT_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyEditToken(token: string | undefined): EditSession | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts as [string, string, string];

  const expected = sign(`${userId}.${expiresRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return { userId, expiresAt };
}

/** True when the current request is inside a valid in-place edit session. */
export async function readEditSession(): Promise<EditSession | null> {
  const token = (await cookies()).get(EDIT_COOKIE)?.value;
  return verifyEditToken(token);
}

export async function isEditing(): Promise<boolean> {
  return (await readEditSession()) !== null;
}
