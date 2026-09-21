import { describe, it, expect, beforeAll, vi } from 'vitest';

// The module reads AUTH_SECRET at call time, so it has to exist before the
// signing functions are exercised.
beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-for-signing-only';
});

// `server-only` throws outside a server component; the functions under test
// are pure, so the marker is stubbed away.
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const { createEditToken, verifyEditToken } = await import('@/lib/preferences');

describe('in-place edit session token', () => {
  const userId = '6f8c2b1a-0000-4000-8000-000000000000';

  it('round-trips a token it signed itself', () => {
    const token = createEditToken(userId);
    const session = verifyEditToken(token);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(userId);
    expect(session!.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects a token with a forged signature', () => {
    const token = createEditToken(userId);
    const [id, expires] = token.split('.');
    expect(verifyEditToken(`${id}.${expires}.not-the-signature`)).toBeNull();
  });

  it('rejects a token whose payload was edited after signing', () => {
    const token = createEditToken(userId);
    const [, expires, signature] = token.split('.');
    // Swapping in another user id must invalidate the signature — otherwise
    // an editor could act as someone else.
    expect(verifyEditToken(`other-user.${expires}.${signature}`)).toBeNull();
  });

  it('rejects a token whose expiry was pushed out', () => {
    const token = createEditToken(userId);
    const [id, , signature] = token.split('.');
    const farFuture = Date.now() + 10 * 365 * 24 * 3600 * 1000;
    expect(verifyEditToken(`${id}.${farFuture}.${signature}`)).toBeNull();
  });

  it('rejects an expired token even when correctly signed', () => {
    // Signed with the real secret but dated in the past.
    const past = Date.now() - 1000;
    const payload = `${userId}.${past}`;
    // Recreate the signature the same way the module does.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    const signature = createHmac('sha256', process.env.AUTH_SECRET!)
      .update(payload)
      .digest('base64url');
    expect(verifyEditToken(`${payload}.${signature}`)).toBeNull();
  });

  it('rejects malformed input rather than throwing', () => {
    expect(verifyEditToken(undefined)).toBeNull();
    expect(verifyEditToken('')).toBeNull();
    expect(verifyEditToken('one-part')).toBeNull();
    expect(verifyEditToken('a.b')).toBeNull();
    expect(verifyEditToken('a.b.c.d')).toBeNull();
  });
});
