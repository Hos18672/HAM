import bcrypt from 'bcryptjs';

/**
 * Password hashing, deliberately separate from `lib/auth.ts`.
 *
 * That module wires up Auth.js and cannot be imported outside a Next.js
 * runtime — but the seed script and the e2e fixtures need to create an account
 * from plain Node. Keeping the hash here lets them share the real function
 * rather than reimplementing it at a cost that might drift.
 */

/** Cost 12. Roughly 250 ms on the hosting tier — slow enough to make offline
 *  cracking expensive, fast enough that a login does not feel broken. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
