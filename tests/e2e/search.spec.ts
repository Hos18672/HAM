import { test, expect } from '@playwright/test';

test.describe('site search', () => {
  test('opens from the header, finds content and navigates', async ({ page }) => {
    await page.goto('/de');

    const trigger = page.getByRole('button', { name: 'Suche öffnen' });
    await trigger.click();

    const input = page.getByRole('searchbox', { name: 'Website durchsuchen' });
    await expect(input).toBeFocused();

    await input.fill('Deutsch');
    // Results are debounced, then rendered beneath the pill.
    await expect(page.getByRole('link', { name: /Deutsch/ }).first()).toBeVisible();
  });

  test('typing does not restart the opening animation', async ({ page }) => {
    await page.goto('/de');
    await page.getByRole('button', { name: 'Suche öffnen' }).click();

    const input = page.getByRole('searchbox', { name: 'Website durchsuchen' });
    await input.fill('Kurs');
    await expect(page.locator('#' + (await input.getAttribute('aria-controls'))!)).toBeVisible();

    // Keep typing: the field must retain focus and its value throughout, which
    // it could not if the dialog were re-mounting on each keystroke.
    await input.type('e', { delay: 60 });
    await input.type(' A1', { delay: 60 });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Kurse A1');
  });

  test('finds Persian content in the Persian locale', async ({ page }) => {
    await page.goto('/fa');
    await page.getByRole('button', { name: 'باز کردن جست‌وجو' }).click();
    const input = page.getByRole('searchbox', { name: 'جست‌وجو در سایت' });
    await input.fill('دعا');
    await expect(page.getByRole('link').filter({ hasText: 'دعای' }).first()).toBeVisible();
  });

  test('closes on Escape and returns focus to the button', async ({ page }) => {
    await page.goto('/de');
    const trigger = page.getByRole('button', { name: 'Suche öffnen' });
    await trigger.click();

    const input = page.getByRole('searchbox', { name: 'Website durchsuchen' });
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
    // Focus must come back where it started, or a keyboard user is stranded.
    await expect(trigger).toBeFocused();
  });

  test('shows an empty state for a term with no matches', async ({ page }) => {
    await page.goto('/de');
    await page.getByRole('button', { name: 'Suche öffnen' }).click();
    await page
      .getByRole('searchbox', { name: 'Website durchsuchen' })
      .fill('zzzqqqxyznichtsfindbar');
    // The results panel carries a visually-hidden live-region count with the
    // same words, so the assertion targets the visible message specifically.
    await expect(
      page.locator('p:not(.visually-hidden)').filter({ hasText: /^Keine Treffer$/ }),
    ).toBeVisible();
    await expect(page.getByText('Andere Schreibweise')).toBeVisible();
  });
});
