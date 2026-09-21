import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, PUBLIC_PATHS } from './helpers';

/**
 * WCAG 2.2 AA, checked with axe on every public page in both languages and on
 * the admin pages behind the login.
 */
async function audit(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

test.describe('accessibility', () => {
  for (const locale of ['fa', 'de'] as const) {
    for (const path of PUBLIC_PATHS) {
      test(`${locale}${path || '/'} has no axe violations`, async ({ page }) => {
        await page.goto(`/${locale}${path}`);
        const results = await audit(page);
        expect(
          results.violations,
          results.violations
            .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
            .join('\n'),
        ).toEqual([]);
      });
    }
  }

  test('dark mode has no contrast violations', async ({ page }) => {
    await page.goto('/de');
    await page.getByRole('button', { name: /Darstellung wechseln/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const results = await audit(page);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  for (const path of ['/admin', '/admin/content/courses', '/admin/media', '/admin/settings']) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await login(page);
      await page.goto(path);
      const results = await audit(page);
      expect(
        results.violations,
        results.violations.map((v) => `${v.id}: ${v.help}`).join('\n'),
      ).toEqual([]);
    });
  }

  test('the login page has no axe violations', async ({ page }) => {
    await page.goto('/login');
    const results = await audit(page);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('the gallery lightbox is keyboard-complete', async ({ page }) => {
    await page.goto('/de/gallery');
    const firstImage = page.getByRole('button', { name: /Bild vergrößern/ }).first();
    // Only meaningful once images exist; skip cleanly on a fresh seed.
    if ((await firstImage.count()) === 0) test.skip(true, 'no images in the seeded gallery');

    await firstImage.click();
    const dialog = page.getByRole('dialog', { name: 'Bildansicht' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstImage).toBeFocused();
  });
});
