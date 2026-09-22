import { test, expect } from '@playwright/test';
import { PUBLIC_PATHS } from './helpers';

test.describe('public site', () => {
  test('redirects the bare root to the default locale', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fa$/);
  });

  for (const locale of ['fa', 'de'] as const) {
    test(`every page loads in ${locale}`, async ({ page }) => {
      for (const path of PUBLIC_PATHS) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status(), `${locale}${path}`).toBeLessThan(400);

        // Exactly one h1 per page — the document outline depends on it.
        await expect(page.locator('h1'), `${locale}${path} h1 count`).toHaveCount(1);

        // The direction and language must match the locale, or the Persian
        // pages read left-to-right.
        const html = page.locator('html');
        await expect(html).toHaveAttribute('lang', locale);
        await expect(html).toHaveAttribute('dir', locale === 'fa' ? 'rtl' : 'ltr');
      }
    });
  }

  test('renders Persian-Indic digits on Persian pages', async ({ page }) => {
    await page.goto('/fa/prayer');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/[۰-۹]/);
    // The prayer times themselves, not just an incidental number.
    expect(body).toMatch(/[۰-۹]{2}:[۰-۹]{2}/);
  });

  test('renders Latin digits and Austrian formatting on German pages', async ({ page }) => {
    await page.goto('/de/prayer');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/\d{2}:\d{2}/);
    expect(body).not.toMatch(/[۰-۹]/);
  });

  test('language switch keeps the reader on the same page', async ({ page }) => {
    await page.goto('/de/courses');
    await page.getByRole('link', { name: 'فارسی' }).first().click();
    await expect(page).toHaveURL(/\/fa\/courses$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.getByRole('link', { name: 'Deutsch' }).first().click();
    await expect(page).toHaveURL(/\/de\/courses$/);
  });

  test('language switch keeps the query string too', async ({ page }) => {
    // The prayer calendar's month lives in ?y=&m=. Dropping it on a language
    // switch throws the reader silently back to the current month.
    await page.goto('/de/prayer?y=2026&m=3');
    await expect(page.getByRole('heading', { name: /März 2026/ })).toBeVisible();

    await page.getByRole('link', { name: 'فارسی' }).first().click();
    await expect(page).toHaveURL(/\/fa\/prayer\?y=2026&m=3$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('theme toggle switches and survives a reload', async ({ page }) => {
    await page.goto('/de');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: /Darstellung wechseln/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The cookie is what makes the server render dark on the next request —
    // which is what prevents a flash of the wrong theme.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('theme toggle switches back again without a reload', async ({ page }) => {
    // The server-rendered prop only changes on the next server render, so the
    // toggle has to carry its own state or the second click is a no-op.
    await page.goto('/de');
    const html = page.locator('html');
    const toggle = page.getByRole('button', { name: /Darstellung wechseln/i });

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('has a working skip link', async ({ page }) => {
    await page.goto('/de');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('serves a sitemap listing both locales with alternates', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    const xml = await response!.text();
    expect(xml).toContain('/fa/courses');
    expect(xml).toContain('/de/courses');
    expect(xml).toContain('hreflang');
  });

  test('keeps the admin out of robots.txt', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    const text = await response!.text();
    expect(text).toContain('Disallow: /admin');
  });

  test('renders a friendly 404 rather than a stack trace', async ({ page }) => {
    const response = await page.goto('/de/gibt-es-nicht');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Diese Seite gibt es nicht',
    );
  });

  test('sends the security headers', async ({ page }) => {
    const response = await page.goto('/de');
    const headers = response!.headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('loads no third-party resources at all', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.hostname.includes('127.0.0.1') && !url.hostname.includes('localhost')) {
        external.push(request.url());
      }
    });

    await page.goto('/de');
    await page.waitForLoadState('networkidle');
    // No font CDN, no analytics, no embeds — which is what lets the privacy
    // policy say there is nothing to consent to.
    expect(external).toEqual([]);
  });
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const locale of ['fa', 'de'] as const) {
    test(`no horizontal overflow anywhere in ${locale}`, async ({ page }) => {
      for (const path of PUBLIC_PATHS) {
        await page.goto(`/${locale}${path}`);

        // A horizontal scrollbar on a phone is always a bug. German compounds
        // are the usual cause — one unbroken word in a card title widens the
        // whole page — so this walks every route rather than sampling.
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
        });
        expect(
          overflow.scrollWidth,
          `${locale}${path || '/'} scrolls sideways by ${overflow.scrollWidth - overflow.clientWidth}px`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      }
    });
  }

  test('the mobile drawer opens, navigates and returns focus', async ({ page }) => {
    await page.goto('/de');
    const opener = page.getByRole('button', { name: 'Menü öffnen' });
    await opener.click();

    const drawer = page.getByRole('dialog', { name: 'Menü' });
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    // A keyboard user must not be dropped at the top of the document.
    await expect(opener).toBeFocused();
  });
});
