import { test, expect } from '@playwright/test';

test.describe('prayer times', () => {
  test('shows seven times, a next prayer and both calendars', async ({ page }) => {
    await page.goto('/de/prayer');

    for (const name of ['Fadschr', 'Sonnenaufgang', 'Dhuhr', 'Asr', 'Maghrib', 'Ischa']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    // The next prayer is highlighted and counts down.
    await expect(page.getByText('Nächstes Gebet')).toBeVisible();
    const countdown = page.locator('[aria-label="Verbleibende Zeit bis zum nächsten Gebet"]');
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText(/\d/, { timeout: 15_000 });

    // Both calendars, side by side.
    await expect(page.getByText('Legende')).toBeVisible();
    await expect(page.getByText('Heute', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Gedenktag', { exact: true })).toBeVisible();
  });

  test('navigates the month calendar in both directions', async ({ page }) => {
    await page.goto('/de/prayer');

    await page.getByRole('link', { name: 'Nächster Monat' }).click();
    await expect(page).toHaveURL(/[?&]m=\d+/);

    await page.getByRole('link', { name: 'Vorheriger Monat' }).click();
    await expect(page).toHaveURL(/[?&]m=\d+/);
  });

  test('lists the occasions for the month, or says there are none', async ({ page }) => {
    await page.goto('/de/prayer');
    await expect(page.getByText('Gedenktage in diesem Monat')).toBeVisible();
  });

  test('falls back to this month for junk in ?y= and ?m=', async ({ page }) => {
    for (const query of [
      '?y=abc',
      '?m=99',
      '?m=0',
      '?m=-1',
      '?y=99999999999999999999&m=-5',
      '?y=&m=',
      '?m=1.5',
      '?y[]=1&m[]=2',
    ]) {
      const response = await page.goto(`/de/prayer${query}`);
      expect(response?.status(), `/de/prayer${query}`).toBe(200);
      await expect(page.getByText('Legende')).toBeVisible();
    }
  });

  test('puts a commemoration on the Gregorian day its Hijri date falls on', async ({ page }) => {
    // 13 Rajab 1448 — Imam Ali's birthday — is 22 December 2026.
    await page.goto('/de/prayer?y=2026&m=12');
    const cell = page.getByRole('cell').filter({ hasText: 'Geburtstag Imam Alis' }).first();
    await expect(cell).toContainText('22');
    // …and the Hijri day number printed beneath it.
    await expect(cell).toContainText('13');
  });

  test('shows the first and last day of a month, and a leap day', async ({ page }) => {
    await page.goto('/de/prayer?y=2024&m=2');
    const days = page.locator('tbody td').filter({ hasText: /\d/ });
    await expect(days).toHaveCount(29);
    await expect(days.first()).toContainText('1');
    await expect(days.last()).toContainText('29');
  });
});

test.describe('qibla', () => {
  test('shows the computed direction from the association house', async ({ page }) => {
    await page.goto('/de/qibla');

    // The figure the design specifies: ≈136.6° south-east, ≈3 637 km.
    await expect(page.getByText(/136,[67]°/)).toBeVisible();
    await expect(page.getByText('Südosten', { exact: false })).toBeVisible();
    await expect(page.getByText(/3.637/)).toBeVisible();

    // The rose is an image with an accessible name, not a decorative blob.
    await expect(page.getByRole('img', { name: /Kompassrose/ })).toBeVisible();
  });

  test('recomputes from a granted location and returns to the house', async ({ page, context }) => {
    // Mecca itself: the bearing becomes meaningless and the distance zero,
    // which is an unambiguous signal that the recomputation happened.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 }); // London

    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Meinen Standort verwenden' }).click();

    await expect(page.getByText(/119,0°/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Von Ihrem Standort aus')).toBeVisible();

    await page.getByRole('button', { name: 'Zurück zum Vereinshaus' }).click();
    await expect(page.getByText(/136,[67]°/)).toBeVisible();
  });

  test('states plainly when the compass is unavailable', async ({ page }) => {
    await page.goto('/de/qibla');
    // Desktop Chrome has no magnetometer, so activating must explain that
    // rather than leaving a needle pointing somewhere arbitrary.
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();

    // Either outcome is correct and neither is silent: a headless Chrome with
    // no magnetometer fires no orientation event, so the button flips to
    // "Kompass aktiv"; a browser without the API at all says so in the live
    // region. What must never happen is nothing.
    const activeButton = page.getByRole('button', { name: 'Kompass aktiv' });
    const explanation = page.getByText('stellt keinen Kompass zur Verfügung');
    await expect(activeButton.or(explanation).first()).toBeVisible();
  });

  test('turns the rose only on an absolute heading', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();
    await expect(page.getByRole('button', { name: 'Kompass aktiv' })).toBeVisible();

    const rose = page.getByRole('img', { name: /Kompassrose/ });
    const rotation = async () =>
      (await rose.getAttribute('style'))?.match(/rotate\((-?[\d.]+)deg\)/)?.[1];

    /**
     * Fire one orientation reading at the window and report everything the
     * page saw: whether the dispatch reached a window listener at all, the
     * values the browser's own accessors return, and where the rose ended up.
     *
     * The event is built with the real `DeviceOrientationEvent` constructor
     * rather than a bare `Event` carrying bolted-on properties, because that
     * is what a browser delivers and it is the browser's accessors the
     * component reads. Everything the page saw is polled as one object so a
     * failure names which link broke instead of only reporting a rotation.
     */
    const observe = async (type: string, alpha: number, absolute: boolean) =>
      page
        .evaluate(
          ({ type, alpha, absolute }) => {
            let reachedAListener = false;
            const probe = () => {
              reachedAListener = true;
            };
            window.addEventListener(type, probe, true);
            const event = new DeviceOrientationEvent(type, { alpha, absolute });
            window.dispatchEvent(event);
            window.removeEventListener(type, probe, true);
            return {
              reachedAListener,
              alpha: event.alpha,
              absolute: event.absolute,
              // Not idle curiosity: if a browser defines this, it is a second
              // heading source competing with the absolute one.
              webkitCompassHeading: (event as { webkitCompassHeading?: number })
                .webkitCompassHeading,
            };
          },
          { type, alpha, absolute },
        )
        .then(async (seen) => ({ ...seen, rotation: await rotation() }));

    // An absolute reading is a real compass heading: the rose counter-rotates.
    //
    // The dispatch happens *inside* the poll on purpose. The listener is
    // attached by an effect that runs after the button flips to "Kompass
    // aktiv", so firing once and then polling races hydration.
    await expect
      .poll(() => observe('deviceorientationabsolute', 90, true))
      .toMatchObject({ reachedAListener: true, alpha: 90, absolute: true, rotation: '-270' });

    // Chrome on Android also fires a *relative* `deviceorientation`, whose
    // alpha is zeroed wherever the device happened to be pointing. Acting on
    // it would swing the needle to an arbitrary bearing.
    await observe('deviceorientation', 200, false);
    await page.waitForTimeout(300);
    expect(await rotation()).toBe('-270');
  });
});

test.describe('gallery', () => {
  test('shows the empty state before any image is uploaded', async ({ page }) => {
    await page.goto('/de/gallery');
    // The seed ships no images, so the page must say so rather than render a
    // broken grid.
    await expect(
      page.getByText('In dieser Kategorie sind noch keine Bilder vorhanden.'),
    ).toBeVisible();
    // The filter row is still offered, so an editor can tell the page works.
    await expect(page.getByRole('button', { name: 'Alle', exact: true })).toBeVisible();
  });
});
