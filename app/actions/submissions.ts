'use server';

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit';
import { sendSubmissionNotification } from '@/lib/email';
import {
  contactSchema,
  membershipSchema,
  donationSchema,
  volunteerSchema,
  MIN_FILL_MS,
} from '@/lib/validation/forms';

/**
 * Public form submissions.
 *
 * Order matters: the row is written first and the notification is sent after.
 * If Resend is down, the association still has the message.
 */

export interface SubmitResult {
  ok: boolean;
  /** A message-catalogue key, resolved in the reader's language by the form. */
  error?: 'form.error' | 'form.rateLimited';
  /** Per-field errors, also as catalogue keys. */
  fields?: Record<string, string>;
}

const SUCCESS: SubmitResult = { ok: true };

/**
 * The two silent traps, judged together.
 *
 * A tripped trap returns *success*. Telling a bot it failed only teaches it
 * which field gave it away; a person who somehow trips it loses one message,
 * which is the lesser harm than a flooded inbox.
 */
function looksAutomated(website: string, elapsed: number): boolean {
  if (website.trim().length > 0) return true;
  // `elapsed` is 0 when JavaScript never ran, which is a person with scripts
  // off rather than a bot — so only a positive, implausibly fast time counts.
  if (elapsed > 0 && elapsed < MIN_FILL_MS) return true;
  return false;
}

async function guard(bucket: string): Promise<{ allowed: boolean; ipHash: string }> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const ipHash = hashIp(ip);
  // Five submissions an hour from one address: generous for a person,
  // useless for a script.
  const limit = await checkRateLimit(`${bucket}:${ipHash || 'unknown'}`, 5, 3600);
  return { allowed: limit.allowed, ipHash };
}

async function store(
  kind: 'contact' | 'membership' | 'donation' | 'volunteer',
  ipHash: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    topic?: string;
    message?: string;
    locale: 'fa' | 'de';
  },
): Promise<SubmitResult> {
  try {
    await db.insert(submissions).values({
      kind,
      name: data.name,
      email: data.email,
      phone: data.phone ?? '',
      topic: data.topic ?? '',
      message: data.message ?? '',
      locale: data.locale,
      ipHash,
    });
  } catch (error) {
    console.error('[submissions] insert failed', { kind, error });
    return { ok: false, error: 'form.error' };
  }

  // Awaited rather than fired and forgotten: on a serverless runtime the
  // function can be frozen the moment the action returns.
  await sendSubmissionNotification({ kind, ...data });
  return SUCCESS;
}

/** Turn a Zod failure into the per-field catalogue keys the form renders. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitContact(input: unknown): Promise<SubmitResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'form.error', fields: fieldErrors(parsed.error.issues) };

  const { website, elapsed, ...data } = parsed.data;
  if (looksAutomated(website, elapsed)) return SUCCESS;

  const { allowed, ipHash } = await guard('contact');
  if (!allowed) return { ok: false, error: 'form.rateLimited' };

  return store('contact', ipHash, data);
}

export async function submitMembership(input: unknown): Promise<SubmitResult> {
  const parsed = membershipSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'form.error', fields: fieldErrors(parsed.error.issues) };

  const { website, elapsed, tier, ...rest } = parsed.data;
  if (looksAutomated(website, elapsed)) return SUCCESS;

  const { allowed, ipHash } = await guard('membership');
  if (!allowed) return { ok: false, error: 'form.rateLimited' };

  return store('membership', ipHash, { ...rest, topic: tier });
}

export async function submitDonation(input: unknown): Promise<SubmitResult> {
  const parsed = donationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'form.error', fields: fieldErrors(parsed.error.issues) };

  const { website, elapsed, purpose, ...rest } = parsed.data;
  if (looksAutomated(website, elapsed)) return SUCCESS;

  const { allowed, ipHash } = await guard('donation');
  if (!allowed) return { ok: false, error: 'form.rateLimited' };

  return store('donation', ipHash, { ...rest, topic: purpose });
}

export async function submitVolunteer(input: unknown): Promise<SubmitResult> {
  const parsed = volunteerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'form.error', fields: fieldErrors(parsed.error.issues) };

  const { website, elapsed, ...data } = parsed.data;
  if (looksAutomated(website, elapsed)) return SUCCESS;

  const { allowed, ipHash } = await guard('volunteer');
  if (!allowed) return { ok: false, error: 'form.rateLimited' };

  return store('volunteer', ipHash, data);
}
