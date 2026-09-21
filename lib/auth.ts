import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq, sql as raw } from 'drizzle-orm';
import { db } from './db';
import { users } from './db/schema';
import { credentialsSchema } from './validation/auth';
import { checkRateLimit } from './rate-limit';

export type { UserRole } from '@/types/next-auth';
import type { UserRole } from '@/types/next-auth';

/** Eight hours: a working day. Staff edit during opening hours; an overnight
 *  session left open on a shared machine is a liability, not a convenience. */
const SESSION_MAX_AGE = 8 * 60 * 60;

/** Cost 12. Roughly 250 ms on the hosting tier — slow enough to make offline
 *  cracking expensive, fast enough that a login does not feel broken. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/login', error: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(raw_credentials) {
        const parsed = credentialsSchema.safeParse(raw_credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Rate-limit by address: five failed attempts in fifteen minutes.
        // Keyed on the account rather than the IP so a shared office NAT does
        // not lock everyone out when one person mistypes.
        const limit = await checkRateLimit(`login:${email.toLowerCase()}`, 5, 15 * 60);
        if (!limit.allowed) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(raw`lower(${users.email})`, email.toLowerCase()))
          .limit(1);

        // Compare against a dummy hash when the account does not exist, so a
        // missing address and a wrong password take the same time to answer.
        const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidxx';
        const ok = await bcrypt.compare(password, hash);
        if (!ok || !user) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});

/**
 * The guard every admin server action calls first. Middleware is a
 * convenience, not a boundary: a server action is an HTTP endpoint and must
 * re-check the session itself.
 */
export async function requireUser(role?: UserRole) {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError('unauthenticated');
  if (role === 'admin' && session.user.role !== 'admin') throw new AuthError('forbidden');
  return session.user;
}

export class AuthError extends Error {
  constructor(public readonly kind: 'unauthenticated' | 'forbidden') {
    super(kind);
    this.name = 'AuthError';
  }
}
