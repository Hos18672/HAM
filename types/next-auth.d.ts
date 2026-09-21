import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Auth.js module augmentation.
 *
 * Kept in its own declaration file with an explicit import of each module
 * being augmented — TypeScript will only merge into a module it has already
 * resolved, and `next-auth/jwt` is reachable only through the package's
 * exports map.
 */

export type UserRole = 'admin' | 'editor';
export type { JWT };

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: UserRole } & DefaultSession['user'];
  }
  interface User {
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
    uid?: string;
  }
}
