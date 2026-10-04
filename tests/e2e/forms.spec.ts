import { test, expect } from '@playwright/test';

test.describe('contact form', () => {
  test('validates before it submits', async ({ page }) => {
    await page.goto('/de/contact');
    await page.getByRole('button', { name: 'Nachricht senden' }).click();

    // Client-side validation from the same Zod schema the server uses: each
    // error beside its field, and again in the summary at the top, as a link
    // to the field. The cursor goes to the first.
    const inline = page.locator('.field-error');
    await expect(inline.getByText('Bitte geben Sie Ihren Namen an.')).toBeVisible();
    await expect(inline.getByText('Bitte geben Sie eine E-Mail-Adresse an.')).toBeVisible();
    await expect(
      page.getByRole('alert').getByRole('link', { name: 'Bitte geben Sie Ihren Namen an.' }),
    ).toBeVisible();
    await expect(page.getByLabel('Name', { exact: false })).toBeFocused();
  });

  test('rejects an address that is not an address', async ({ page }) => {
    await page.goto('/de/contact');
    await page.getByLabel('Name', { exact: false }).fill('Testperson');
    await page.getByLabel('E-Mail', { exact: false }).fill('keine-adresse');
    await page.getByLabel('Nachricht', { exact: false }).fill('Eine ausreichend lange Nachricht.');
    await page.getByRole('button', { name: 'Nachricht senden' }).click();
    await expect(
      page.locator('.field-error').getByText('Diese E-Mail-Adresse sieht nicht richtig aus.'),
    ).toBeVisible();
  });

  test('accepts a real submission and confirms it', async ({ page }) => {
    await page.goto('/de/contact');

    // The form carries a fill-time check, so a submission that arrives within
    // 3 s of mount is treated as automated. Wait it out like a person would.
    await page.waitForTimeout(3200);

    await page.getByLabel('Name', { exact: false }).fill('Playwright Testperson');
    await page.getByLabel('E-Mail', { exact: false }).fill('playwright@example.at');
    await page
      .getByLabel('Nachricht', { exact: false })
      .fill('Dies ist eine automatische Testnachricht aus der e2e-Suite.');
    await page.getByRole('button', { name: 'Nachricht senden' }).click();

    await expect(page.getByText('Danke! Ihre Nachricht ist bei uns angekommen.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('works in Persian too', async ({ page }) => {
    await page.goto('/fa/contact');
    await page.getByRole('button', { name: 'ارسال پیام' }).click();
    await expect(page.locator('.field-error').getByText('لطفاً نام خود را بنویسید.')).toBeVisible();
  });
});
