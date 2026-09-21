'use server';

import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { adminSearch, type AdminHit } from '@/lib/db/queries/admin';

const schema = z.string().trim().min(2).max(120);

export async function adminSearchAction(term: string): Promise<AdminHit[]> {
  // The admin search reads unpublished content, so it is behind the session
  // like every other admin action.
  await requireUser();

  const parsed = schema.safeParse(term);
  if (!parsed.success) return [];
  return adminSearch(parsed.data);
}
