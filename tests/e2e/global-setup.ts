import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, sql } from '../../lib/db';
import { users } from '../../lib/db/schema';
import { hashPassword } from '../../lib/password';
import { EDITOR_EMAIL, EDITOR_PASSWORD } from './helpers';

/**
 * Test fixtures that must exist before the suite runs.
 *
 * The editor account is created here, against the database, rather than by
 * driving the admin UI from a helper. Doing it through the UI made the role
 * tests depend on the user-creation form working — so a failure there failed
 * three unrelated tests, and the path was silently skipped on any machine
 * where the account already existed. That is exactly how it passed locally
 * and failed on a clean CI database.
 */
export default async function globalSetup() {
  const hash = await hashPassword(EDITOR_PASSWORD);

  await db
    .insert(users)
    .values({ email: EDITOR_EMAIL, name: 'Test Redakteur', role: 'editor', passwordHash: hash })
    .onConflictDoNothing();

  // Make sure an account left over from an earlier run is still an editor and
  // still has the password the tests sign in with.
  await db
    .update(users)
    .set({ role: 'editor', passwordHash: hash })
    .where(eq(users.email, EDITOR_EMAIL));

  await sql.end();
}
