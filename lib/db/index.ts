import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * A single pooled client, cached on `globalThis` so Next.js's dev-mode module
 * reloading does not open a new pool on every edit. `prepare: false` is
 * required by Supabase's transaction-mode pooler, which cannot hold prepared
 * statements across a connection it may hand to someone else.
 */
const globalForDb = globalThis as unknown as { __hamSql?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in the connection string.',
    );
  }
  return postgres(url, { prepare: false, max: 10 });
}

export const sql = globalForDb.__hamSql ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForDb.__hamSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
export type Database = typeof db;
