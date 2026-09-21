export const locales = ['fa', 'de'] as const;
export type Locale = (typeof locales)[number];

/** Persian is the association's first language. The admin can change the
 *  redirect target for `/` in the settings; this is the compile-time fallback
 *  used before settings have ever been written. */
export const defaultLocale: Locale = 'fa';

export const localeDirection: Record<Locale, 'rtl' | 'ltr'> = {
  fa: 'rtl',
  de: 'ltr',
};

/** BCP-47 tags for Intl. `de-AT` rather than `de` — Austrian date and number
 *  formatting differs from German (e.g. "Jänner"). */
export const intlLocale: Record<Locale, string> = {
  fa: 'fa-IR',
  de: 'de-AT',
};

export const localeLabel: Record<Locale, string> = {
  fa: 'فارسی',
  de: 'Deutsch',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
