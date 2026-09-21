import { z } from 'zod';
import { locales } from '../i18n/config';

/**
 * Public form schemas. The error strings are message-catalogue keys, not
 * prose: the client resolves them in the reader's language, and the server
 * uses the same schema so the two can never disagree about what is valid.
 */

const name = z
  .string()
  .trim()
  .min(1, 'form.errors.nameRequired')
  .max(200, 'form.errors.nameTooLong');

const email = z
  .string()
  .trim()
  .min(1, 'form.errors.emailRequired')
  .max(255, 'form.errors.emailInvalid')
  .email('form.errors.emailInvalid');

/** Loose on purpose: international numbers come in many shapes and rejecting a
 *  valid one is worse than accepting an odd one into a field a human reads. */
const phone = z
  .string()
  .trim()
  .max(64, 'form.errors.phoneInvalid')
  .regex(/^[+()/\d\s.-]*$/, 'form.errors.phoneInvalid')
  .optional()
  .or(z.literal(''));

const message = z
  .string()
  .trim()
  .min(5, 'form.errors.messageRequired')
  .max(5000, 'form.errors.messageTooLong');

/**
 * Anti-spam fields present on every public form.
 *  - `website` is a honeypot: hidden from people, irresistible to bots.
 *  - `elapsed` is milliseconds since the form mounted. A human needs seconds
 *    to fill a form; a script posts in tens of milliseconds.
 * Both are accepted by the schema and judged in the action, so a tripped trap
 * can return the same success state a real submission does — telling a bot it
 * failed only teaches it to try again.
 */
export const antiSpamSchema = z.object({
  website: z.string().max(200).optional().default(''),
  elapsed: z.coerce.number().int().nonnegative().optional().default(0),
});

export const MIN_FILL_MS = 2500;

export const localeField = z.enum(locales);

export const contactSchema = antiSpamSchema.extend({
  name,
  email,
  phone,
  topic: z
    .enum(['general', 'courses', 'events', 'membership', 'volunteer', 'other'])
    .describe('form.errors.topicRequired'),
  message,
  locale: localeField,
});
/**
 * Two types per form, because they genuinely differ.
 *
 * `*Input` is what a form holds *before* Zod applies defaults and coercion —
 * which is what react-hook-form is generic over. `*Values` is what the action
 * receives after parsing. Conflating them is what makes the resolver types
 * refuse to line up.
 */
export type ContactInput = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;

export const membershipSchema = antiSpamSchema.extend({
  name,
  email,
  phone,
  tier: z.string().trim().min(1, 'form.errors.tierRequired').max(64),
  message: message.or(z.literal('')).optional().default(''),
  locale: localeField,
});
export type MembershipInput = z.input<typeof membershipSchema>;
export type MembershipValues = z.output<typeof membershipSchema>;

export const donationSchema = antiSpamSchema.extend({
  name,
  email,
  phone,
  purpose: z.string().trim().min(1, 'form.errors.topicRequired').max(64),
  message: message.or(z.literal('')).optional().default(''),
  locale: localeField,
});
export type DonationInput = z.input<typeof donationSchema>;
export type DonationValues = z.output<typeof donationSchema>;

export const volunteerSchema = antiSpamSchema.extend({
  name,
  email,
  phone,
  message,
  locale: localeField,
});
export type VolunteerInput = z.input<typeof volunteerSchema>;
export type VolunteerValues = z.output<typeof volunteerSchema>;

export const searchSchema = z.object({
  query: z.string().trim().min(2).max(120),
  locale: localeField,
});
