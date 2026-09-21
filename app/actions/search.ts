'use server';

import { search, type SearchHit } from '@/lib/search';
import { searchSchema } from '@/lib/validation/forms';

/** The single server action behind the header search. */
export async function searchAction(
  query: string,
  locale: string,
): Promise<{ hits: SearchHit[]; error?: string }> {
  const parsed = searchSchema.safeParse({ query, locale });
  if (!parsed.success) return { hits: [] };

  const hits = await search(parsed.data.query, parsed.data.locale);
  return { hits };
}
