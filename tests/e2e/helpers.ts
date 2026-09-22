import type { Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'redaktion@haus-aller-menschen.at';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'entwicklung-nur-lokal';

/** Every public page, as the navigation lists them. */
export const PUBLIC_PATHS = [
  '',
  '/about',
  '/activities',
  '/courses',
  '/culture',
  '/sport',
  '/events',
  '/community',
  '/gallery',
  '/qibla',
  '/prayer',
  '/duas',
  '/support',
  '/contact',
  '/privacy',
  '/imprint',
] as const;

/** Sign in through the real form, as a member of staff would. */
export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('**/admin', { timeout: 20_000 });
}

/**
 * The editor fixture. Created by `global-setup.ts` against the database, so a
 * test can simply sign in as them.
 *
 * It used to be created by driving the user-creation form from a helper, which
 * made three role tests depend on that form working — and skipped the creation
 * path entirely on any machine where the account already existed. That is how
 * it passed locally and failed on a clean CI database.
 */
export const EDITOR_EMAIL = 'redakteur@haus-aller-menschen.at';
export const EDITOR_PASSWORD = 'ein-langes-testpasswort';
