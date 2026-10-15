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

        // Exactly one h1 per page — the document outline depends on it. A
        // page with a phone view carries one in each view, one of them hidden.
        await expect(page.locator('h1:visible'), `${locale}${path} h1 count`).toHaveCount(1);

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
    // .first(): the calendar and the timetable under it both name the month.
    await expect(page.getByRole('heading', { name: /März 2026/ }).first()).toBeVisible();

    await page.getByRole('link', { name: 'فارسی' }).first().click();
    await expect(page).toHaveURL(/\/fa\/prayer\?y=2026&m=3$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('theme toggle switches and survives a reload', async ({ page }) => {
    await page.goto('/de');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page
      .locator('footer')
      .getByRole('button', { name: /Darstellung wechseln/i })
      .click();
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
    const toggle = page.locator('footer').getByRole('button', { name: /Darstellung wechseln/i });

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('the home hero plays its loader, then hands over', async ({ page }) => {
    await page.goto('/de');

    // While the birds build the mark: the page cannot scroll and neither the
    // header nor the hero copy is on screen.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.hc))
      .toBe('loading');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('.hc-header')!).opacity),
    ).toBe('0');

    // And afterwards: unlocked, with everything visible.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.hc), { timeout: 45_000 })
      .toBe('ready');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the loader belongs to the home page alone', async ({ page }) => {
    // Every other page must render its header from the first paint: the
    // page-state attribute is what hides it, so it must never be set here.
    await page.goto('/de/about');
    expect(await page.evaluate(() => document.documentElement.dataset.hc)).toBeUndefined();
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('.hc-header')!).opacity),
    ).toBe('1');
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

  test('asks no other server, anywhere', async ({ page }) => {
    const external: { path: string; url: string }[] = [];
    let where = '';
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.hostname.includes('127.0.0.1') && !url.hostname.includes('localhost')) {
        external.push({ path: where, url: request.url() });
      }
    });

    for (const path of PUBLIC_PATHS) {
      where = path;
      await page.goto(`/de${path}`);
      await page.waitForLoadState('networkidle');
    }

    // No font CDN, no analytics, no embeds, anywhere. Every map is Google's,
    // and every one of them waits for the visitor to agree to it: the home
    // and contact pages show a picture of the street from our own server
    // until then, the qibla map the direction drawn on its own. If anything
    // appears here, the privacy policy has stopped being true.
    expect(external).toEqual([]);
  });

  test('loads Google Maps only when asked to', async ({ page }) => {
    const google: string[] = [];
    await page.route('https://www.google.com/**', (route) => {
      google.push(route.request().url());
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>map</title>' });
    });

    await page.goto('/de/contact');
    await page.waitForLoadState('networkidle');
    expect(google).toEqual([]);

    await page.getByRole('button', { name: /Google Maps laden/ }).click();
    const map = page.locator('iframe.map-embed');
    await expect(map).toHaveAttribute('src', /google\.com\/maps\?q=Sautergasse/);
    await expect.poll(() => google.length).toBeGreaterThan(0);
    // The agreement is remembered, for every map of the site.
    await page.goto('/de');
    await expect(page.locator('iframe.map-embed')).toBeVisible();
    await page.getByRole('button', { name: 'Google Maps wieder ausblenden' }).click();
    await expect(page.locator('iframe.map-embed')).toHaveCount(0);
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

  test('a phone opens straight on the app home screen, without the loader', async ({ page }) => {
    await page.goto('/de');
    // The scene belongs to wide screens: on a phone the head script never arms it.
    expect(await page.evaluate(() => document.documentElement.dataset.hc)).toBeUndefined();
    await expect(page.getByRole('link', { name: /Nächstes Gebet/ })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => getComputedStyle(document.querySelector('.tab-bar')!).opacity),
      )
      .toBe('1');
  });

  test('"Mehr" leads to every other page and the back button returns', async ({ page }) => {
    await page.goto('/de');
    const tabs = page.getByRole('navigation', { name: 'Schnellzugriff' });
    await tabs.getByRole('link', { name: 'Mehr' }).click();
    await expect(page).toHaveURL(/\/de\/more$/);
    await expect(tabs.getByRole('link', { name: 'Mehr' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: 'Über uns' }).click();
    await expect(page).toHaveURL(/\/de\/about$/);
    // Any page that is not a tab is reached from "Mehr", and marks it.
    await expect(tabs.getByRole('link', { name: 'Mehr' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(/\/de\/more$/);
  });

  test('back returns to the page it came from, not to "Mehr"', async ({ page }) => {
    await page.goto('/de');
    await page.locator('.a-quick').getByRole('link', { name: 'Bittgebete' }).click();
    await expect(page).toHaveURL(/\/de\/duas$/);
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(/\/de$/);
  });

  test('the calendar has a page of its own, with Iran and Austria in it', async ({ page }) => {
    await page.goto('/de/more');
    await page.getByRole('link', { name: 'Kalender' }).click();
    await expect(page).toHaveURL(/\/de\/calendar$/);
    // October 2026 is reached from any month: the Day of Hafez (Iran) and
    // Austria's National Day, a day off, are both in it.
    const title = page.locator('.a-month [role="group"]');
    const target = 'Oktober 2026';
    const [y, m] = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year: 'numeric',
      month: '2-digit',
    })
      .format(new Date())
      .split('-')
      .map(Number) as [number, number];
    const steps = (2026 - y) * 12 + (10 - m);
    const button = page.getByRole('button', {
      name: steps > 0 ? 'Nächster Monat' : 'Vorheriger Monat',
    });
    for (let i = 0; i < Math.abs(steps); i += 1) await button.click();
    await expect(title).toHaveAttribute('aria-label', target);
    const month = page.locator('.cal-m-list');
    await expect(month.getByText('Tag des Hafis')).toBeVisible();
    await expect(month.getByText('Nationalfeiertag')).toBeVisible();

    // The chip narrows the month to one kind.
    await page.getByRole('button', { name: 'Iran' }).click();
    await expect(month.getByText('Nationalfeiertag')).toBeHidden();
    await expect(month.getByText('Tag des Hafis')).toBeVisible();
  });

  test('the prayer page on a phone keeps to prayer', async ({ page }) => {
    await page.goto('/de/prayer');
    await expect(page.locator('.prayer-cal')).toBeHidden();
  });
});
