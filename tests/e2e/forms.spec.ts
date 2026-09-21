import { test, expect } from '@playwright/test';

test.describe('contact form', () => {
  test('validates before it submits', async ({ page }) => {
    await page.goto('/de/contact');
    await page.getByRole('button', { name: 'Absenden' }).click();

    // Client-side validation from the same Zod schema the server uses.
    await expect(page.getByText('Bitte geben Sie Ihren Namen an.')).toBeVisible();
    await expect(page.getByText('Bitte geben Sie eine E-Mail-Adresse an.')).toBeVisible();
  });

  test('rejects an address that is not an address', async ({ page }) => {
    await page.goto('/de/contact');
    await page.getByLabel('Name', { exact: false }).fill('Testperson');
    await page.getByLabel('E-Mail', { exact: false }).fill('keine-adresse');
    await page.getByLabel('Nachricht', { exact: false }).fill('Eine ausreichend lange Nachricht.');
    await page.getByRole('button', { name: 'Absenden' }).click();
    await expect(page.getByText('Diese E-Mail-Adresse sieht nicht richtig aus.')).toBeVisible();
  });

  test('accepts a real submission and confirms it', async ({ page }) => {
    await page.goto('/de/contact');

    // The form carries a fill-time check, so a submission that arrives within
    // 2.5 s of mount is treated as automated. Wait it out like a person would.
    await page.waitForTimeout(3000);

    await page.getByLabel('Name', { exact: false }).fill('Playwright Testperson');
    await page.getByLabel('E-Mail', { exact: false }).fill('playwright@example.at');
    await page
      .getByLabel('Nachricht', { exact: false })
      .fill('Dies ist eine automatische Testnachricht aus der e2e-Suite.');
    await page.getByRole('button', { name: 'Absenden' }).click();

    await expect(page.getByText('Danke! Ihre Nachricht ist bei uns angekommen.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('works in Persian too', async ({ page }) => {
    await page.goto('/fa/contact');
    await page.getByRole('button', { name: 'ارسال' }).click();
    await expect(page.getByText('لطفاً نام خود را بنویسید.')).toBeVisible();
  });
});
