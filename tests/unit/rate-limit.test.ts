import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The limiter talks to Postgres, so the SQL tag is stubbed with a small
 * in-memory store. What is being tested is the *policy* — which calls consume
 * an allowance and which do not — not the SQL itself.
 */
interface Row {
  count: number;
  window_start: Date;
}
const store = new Map<string, Row>();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => {
  /**
   * A stand-in for the postgres.js tag. It recognises the three statements the
   * limiter issues by looking at the assembled query text.
   */
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join(' ');
    const key = String(values[0]);

    if (query.includes('INSERT INTO rate_limits')) {
      const windowSeconds = Number(values[1]);
      const existing = store.get(key);
      const expired =
        existing && Date.now() - existing.window_start.getTime() > windowSeconds * 1000;

      const row: Row =
        !existing || expired
          ? { count: 1, window_start: new Date() }
          : { count: existing.count + 1, window_start: existing.window_start };
      store.set(key, row);
      return Promise.resolve([row]);
    }

    if (query.includes('SELECT count, window_start')) {
      const windowSeconds = Number(values[1]);
      const existing = store.get(key);
      if (!existing) return Promise.resolve([]);
      if (Date.now() - existing.window_start.getTime() > windowSeconds * 1000) {
        return Promise.resolve([]);
      }
      return Promise.resolve([existing]);
    }

    if (query.includes('DELETE FROM rate_limits')) {
      store.delete(key);
      return Promise.resolve([]);
    }

    return Promise.resolve([]);
  };

  return { sql, db: {} };
});

const { checkRateLimit, peekRateLimit, recordAttempt, clearRateLimit, hashIp, clientIp } =
  await import('@/lib/rate-limit');

beforeEach(() => {
  store.clear();
  process.env.AUTH_SECRET = 'test-secret';
});

describe('fixed-window limiter', () => {
  it('allows up to the limit and refuses the one after', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await checkRateLimit('contact:abc', 5, 3600);
      expect(result.allowed, `attempt ${attempt}`).toBe(true);
      expect(result.remaining).toBe(5 - attempt);
    }
    expect((await checkRateLimit('contact:abc', 5, 3600)).allowed).toBe(false);
  });

  it('counts each key separately', async () => {
    for (let i = 0; i < 5; i += 1) await checkRateLimit('contact:one', 5, 3600);
    expect((await checkRateLimit('contact:one', 5, 3600)).allowed).toBe(false);
    expect((await checkRateLimit('contact:two', 5, 3600)).allowed).toBe(true);
  });

  it('starts a fresh window once the old one has passed', async () => {
    for (let i = 0; i < 5; i += 1) await checkRateLimit('contact:abc', 5, 3600);
    expect((await checkRateLimit('contact:abc', 5, 3600)).allowed).toBe(false);

    // Backdate the window as if an hour had gone by.
    const row = store.get('contact:abc')!;
    row.window_start = new Date(Date.now() - 3601_000);

    expect((await checkRateLimit('contact:abc', 5, 3600)).allowed).toBe(true);
  });
});

describe('login throttling policy', () => {
  const key = 'login:redaktion@example.at';

  it('does not consume the allowance when only peeking', async () => {
    // This is the regression that matters: a successful login must not count.
    // Peeking a hundred times leaves the allowance untouched.
    for (let i = 0; i < 100; i += 1) {
      expect((await peekRateLimit(key, 5, 900)).allowed).toBe(true);
    }
    expect(store.has(key)).toBe(false);
  });

  it('locks out only after five recorded failures', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await peekRateLimit(key, 5, 900)).allowed, `before failure ${attempt}`).toBe(true);
      await recordAttempt(key, 900);
    }
    expect((await peekRateLimit(key, 5, 900)).allowed).toBe(false);
  });

  it('clears the counter when an attempt finally succeeds', async () => {
    for (let i = 0; i < 4; i += 1) await recordAttempt(key, 900);
    expect((await peekRateLimit(key, 5, 900)).remaining).toBe(1);

    await clearRateLimit(key);

    // A mistyped password earlier in the afternoon must not accumulate
    // towards a later lockout.
    expect((await peekRateLimit(key, 5, 900)).allowed).toBe(true);
    expect((await peekRateLimit(key, 5, 900)).remaining).toBe(5);
  });
});

describe('client address handling', () => {
  it('pseudonymises an address rather than storing it', async () => {
    const hash = hashIp('192.0.2.1');
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('192.0.2.1');
    // Stable, so abuse can still be correlated.
    expect(hashIp('192.0.2.1')).toBe(hash);
    expect(hashIp('192.0.2.2')).not.toBe(hash);
  });

  it('returns an empty string when there is no address', () => {
    expect(hashIp(null)).toBe('');
    expect(hashIp(undefined)).toBe('');
  });

  it('reads the first address from the proxy chain', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe(
      '203.0.113.7',
    );
    expect(clientIp(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(clientIp(new Headers())).toBeNull();
  });
});
