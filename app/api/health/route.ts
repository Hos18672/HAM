import { NextResponse } from 'next/server';
import { sql as raw } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * What a deploy needs in order to log in, checked from the running site: is
 * the database reachable, does an admin account exist, are the auth
 * settings there and does AUTH_URL match the address being visited. It
 * names no account and prints no secret — only yes/no and error codes.
 */
export async function GET(request: Request) {
  const here = new URL(request.url).host;
  const authUrl = process.env.AUTH_URL;
  let authUrlHost: string | null = null;
  try {
    authUrlHost = authUrl ? new URL(authUrl).host : null;
  } catch {
    authUrlHost = 'invalid';
  }

  let database = 'ok';
  let adminAccounts: number | null = null;
  try {
    if (!process.env.DATABASE_URL)
      throw Object.assign(new Error('DATABASE_URL is not set'), { code: 'unset' });
    const { db } = await import('@/lib/db');
    const [row] = await db.execute<{ n: number }>(
      raw`select count(*)::int as n from users where role = 'admin'`,
    );
    adminAccounts = Number(row?.n ?? 0);
  } catch (failure) {
    const error = ((failure as { cause?: unknown }).cause ?? failure) as {
      code?: string;
      message?: string;
    };
    database = `error ${error.code ?? ''}: ${(error.message ?? String(error)).slice(0, 160)}`;
  }

  return NextResponse.json(
    {
      database,
      adminAccounts,
      authSecret: Boolean(process.env.AUTH_SECRET),
      authUrl: authUrl
        ? { set: true, matchesThisAddress: authUrlHost === here, thisAddress: here }
        : { set: false, thisAddress: here },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
