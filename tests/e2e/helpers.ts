import { expect, type Page } from '@playwright/test';

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

export const EDITOR_EMAIL = 'redakteur@haus-aller-menschen.at';
export const EDITOR_PASSWORD = 'ein-langes-testpasswort';

/**
 * Make sure an `editor` account exists, so the role boundary can be tested
 * against a real session rather than by reading the code.
 */
export async function ensureEditor(page: Page) {
  await login(page);
  await page.goto('/admin/users');

  const row = page.getByRole('row').filter({ hasText: EDITOR_EMAIL });
  if ((await row.count()) === 0) {
    await page.getByRole('button', { name: 'Benutzer anlegen' }).click();
    await page.getByLabel('Name', { exact: false }).fill('Test Redakteur');
    await page.getByLabel('E-Mail', { exact: false }).fill(EDITOR_EMAIL);
    await page.getByLabel('Passwort', { exact: false }).fill(EDITOR_PASSWORD);
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(row).toBeVisible({ timeout: 15_000 });
  }

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await page.waitForURL('**/login', { timeout: 20_000 });
}
