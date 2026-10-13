import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().trim().min(3).max(255).email(),
  password: z.string().min(1).max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

/** What we require of a new or changed password. Length beats character
 *  classes: a long passphrase is both stronger and easier for staff. */
export const passwordSchema = z
  .string()
  .min(12, 'Mindestens 12 Zeichen.')
  .max(200, 'Höchstens 200 Zeichen.');

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: z.string().trim().min(1).max(160),
  role: z.enum(['admin', 'editor']),
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160).optional(),
  role: z.enum(['admin', 'editor']).optional(),
  password: passwordSchema.optional(),
});

export const userDeleteSchema = z.object({ id: z.string().uuid() });

/** A signed-in user changing their own account. The current password is
 *  asked for again, so a session left open on a shared machine cannot be
 *  used to lock its owner out. */
export const accountUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Bitte einen Namen angeben.').max(160),
    currentPassword: z.string().max(200).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((value) => !value.newPassword || Boolean(value.currentPassword), {
    message: 'Bitte das bisherige Passwort angeben.',
  });
