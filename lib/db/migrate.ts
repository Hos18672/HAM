/**
 * Applies the migrations in `drizzle/` — what `drizzle-kit migrate` does,
 * but when the database cannot be reached it says why. drizzle-kit only
 * stops its spinner and exits, which leaves a failed deploy with nothing to
 * go on. The password is never printed.
 *
 *   pnpm db:migrate
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

/** The address with the password masked, to show which one was tried. */
function shown(value: string): string {
  try {
    const u = new URL(value);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(not a valid postgresql:// address)';
  }
}

/** A plain next step for the failures people actually hit. */
function hint(error: unknown): string {
  const e = error as { code?: string; message?: string; address?: string };
  const text = `${e.code ?? ''} ${e.message ?? ''}`;
  if (/28P01|password authentication failed/i.test(text))
    return 'The database password in the address is wrong. Use the password of the Supabase project (Project Settings → Database → Reset database password if unsure).';
  if (/42710|42P07|already exists/i.test(text))
    return 'The database already holds tables from an earlier attempt that were not recorded as migrations. On a new, empty project, reset it in Supabase → SQL Editor (see README → Deploying), then deploy again.';
  if (/Tenant or user not found/i.test(text))
    return 'The user name or region does not match. Copy the pooler address again from Supabase → Connect; its user looks like postgres.<project-ref>.';
  if (/ENOTFOUND|EAI_AGAIN/i.test(text))
    return 'The host name in the address does not exist. Copy it again from Supabase → Connect.';
  if (/ENETUNREACH|EHOSTUNREACH|EADDRNOTAVAIL/i.test(text) || (e.address ?? '').includes(':'))
    return 'This is the "Direct connection" address, which this server cannot reach. Use the "Session pooler" address (port 5432) for DIRECT_URL.';
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(text))
    return 'Nothing answered at that address and port. Check the port (6543 for DATABASE_URL, 5432 for DIRECT_URL) and that the Supabase project is not paused.';
  if (/Invalid URL|URI malformed/i.test(text))
    return 'The address could not be read. If the password contains characters like @ # / ? % :, URL-encode them or choose a password of letters and digits.';
  return 'See the error above.';
}

async function main() {
  if (!url) {
    console.error(
      '\n  ✗ No database address. Set DIRECT_URL (Supabase "Session pooler", port 5432) and DATABASE_URL (Supabase "Transaction pooler", port 6543) in the hosting settings.\n',
    );
    process.exit(1);
  }
  const client = postgres(url, { max: 1, prepare: false, connect_timeout: 20, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log('  ✓ Database is up to date.');
  } catch (failure) {
    // Drizzle wraps the driver's error as "Failed query: …"; the cause is
    // the one that says what went wrong.
    const error = (failure as { cause?: unknown }).cause ?? failure;
    const e = error as { code?: string; message?: string };
    console.error(`\n  ✗ Could not migrate the database at ${shown(url)}`);
    console.error(`    ${e.code ? `${e.code}: ` : ''}${e.message ?? String(error)}`);
    console.error(`    → ${hint(error)}\n`);
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}

void main();
