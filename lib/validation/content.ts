import { z } from 'zod';
import { locales } from '../i18n/config';

/**
 * Admin content schemas. Every server action that writes content validates
 * with one of these — including the in-place editor, which posts through the
 * same door as the /admin forms.
 */

export const localeField = z.enum(locales);
export const uuid = z.string().uuid();

/** The set of entities the generic list/field actions can address. Keeping it
 *  as a closed enum means a crafted request cannot name an arbitrary table. */
export const entityKinds = [
  'page',
  'block',
  'offer',
  'course',
  'event',
  'programme',
  'sport',
  'culture',
  'community',
  'values',
  'week',
  'dua',
  'occasion',
  'gallery',
  'media',
  'membership',
] as const;
export type EntityKind = (typeof entityKinds)[number];
export const entityKindSchema = z.enum(entityKinds);

/** One in-place edit: which entity, which row, which field, which language. */
export const fieldUpdateSchema = z.object({
  entity: entityKindSchema,
  id: uuid,
  field: z
    .string()
    .trim()
    .min(1)
    .max(64)
    // The field name reaches a column mapping; keep it to an identifier shape.
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  locale: localeField,
  value: z.string().max(20_000),
});
export type FieldUpdate = z.infer<typeof fieldUpdateSchema>;

/** A base-row (language-independent) field: sort, category, slug, icon … */
export const baseFieldUpdateSchema = z.object({
  entity: entityKindSchema,
  id: uuid,
  field: z.string().trim().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  value: z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
});

export const listOpSchema = z.object({
  entity: entityKindSchema,
  /** `add` needs no id; the others act on an existing row. */
  op: z.enum(['add', 'duplicate', 'delete', 'moveUp', 'moveDown']),
  id: uuid.optional(),
  /** Scope for nested lists — e.g. programme items belong to an event. */
  parentId: uuid.optional(),
});
export type ListOp = z.infer<typeof listOpSchema>;

export const settingsSchema = z.object({
  defaultLocale: localeField,
  defaultTheme: z.enum(['light', 'dark']),
  showOpeningEvent: z.boolean(),
  contactEmail: z.string().trim().max(255).email().or(z.literal('')),
  phone: z.string().trim().max(64),
  address: z.string().trim().max(500),
  iban: z
    .string()
    .trim()
    .max(64)
    // Loose IBAN shape — the bank validates properly, we only guard the field.
    .regex(/^$|^[A-Z]{2}[0-9A-Z\s]{8,40}$/i, 'Diese IBAN sieht nicht richtig aus.'),
  mapUrl: z.string().trim().max(1000).url().or(z.literal('')),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const submissionStatusSchema = z.object({
  id: uuid,
  status: z.enum(['new', 'read', 'archived']),
});

/** Uploads: what the storage bucket will accept. Both are enforced again on
 *  the server after the bytes arrive — a client-side check is a courtesy. */
export const ALLOWED_UPLOAD_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const uploadMetaSchema = z.object({
  alt: z.record(localeField, z.string().max(500)).optional(),
  caption: z.record(localeField, z.string().max(1000)).optional(),
  category: z.string().trim().max(64).default('general'),
});

/** The shape of a full content export. Deliberately permissive about the rows
 *  themselves — the import re-validates each table against the live schema —
 *  but strict about the envelope, so an unrelated JSON file is rejected early. */
export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type Backup = z.infer<typeof backupSchema>;
