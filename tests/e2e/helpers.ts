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
export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-Mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Passwort').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await page.waitForURL('**/admin', { timeout: 20_000 });
}
