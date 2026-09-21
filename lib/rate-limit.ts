/**
 * Fixed-window rate limiting in Postgres.
 *
 * Redis would be the textbook answer, but it is another account, another bill
 * and another processor to name in the privacy policy — for a site that takes
 * a handful of form posts a day. One upsert against a two-column table is
 * enough, and it is atomic: the whole decision happens in a single statement,
 * so two concurrent requests cannot both see a stale count.
 */
import { sql } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window ends. */
  resetIn: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const rows = await sql<{ count: number; window_start: Date }[]>`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
          THEN now()
          ELSE rate_limits.window_start
        END
      RETURNING count, window_start
    `;

    const row = rows[0];
    if (!row) return { allowed: true, remaining: limit - 1, resetIn: windowSeconds };

    const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
    return {
      allowed: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetIn: Math.max(0, Math.ceil(windowSeconds - elapsed)),
    };
  } catch (error) {
    // A limiter that fails closed would take the contact form down with the
    // database. Log and allow — the honeypot and timing check still stand.
    console.error('[rate-limit] check failed', { key, error });
    return { allowed: true, remaining: limit, resetIn: windowSeconds };
  }
}

/** Housekeeping: drop windows nothing can still be counting against. */
export async function pruneRateLimits(olderThanSeconds = 86_400): Promise<void> {
  await sql`DELETE FROM rate_limits WHERE window_start < now() - make_interval(secs => ${olderThanSeconds})`;
}

import { createHash } from 'node:crypto';

/**
 * A stable pseudonym for a client address. The salt is AUTH_SECRET, so the
 * hashes are useless outside this deployment and the address itself is never
 * written down — which is what makes storing it proportionate under the DSGVO.
 */
export function hashIp(ip: string | null | undefined): string {
  if (!ip) return '';
  return createHash('sha256')
    .update(`${process.env.AUTH_SECRET ?? 'dev-salt'}:${ip}`)
    .digest('hex')
    .slice(0, 64);
}

/** Read the client address from the proxy headers Vercel sets. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return headers.get('x-real-ip');
}
