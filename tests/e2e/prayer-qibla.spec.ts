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
    // A desktop runner has no magnetometer, so activating must say something
    // rather than leaving a needle pointing somewhere arbitrary.
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();

    // Three outcomes are legitimate and none of them is silent: a browser that
    // hands over the sensor flips the button to "Kompass aktiv"; one without
    // the API says so; one that gates it behind a permission and refuses says
    // that instead. What must never happen is nothing at all.
    //
    // `exact` is not optional here. Playwright matches an accessible name as a
    // case-insensitive *substring* by default, and "Kompass aktiv" is a
    // substring of "Kompass aktivieren" — so without it this passes on the
    // unclicked button and asserts nothing whatsoever.
    const activeButton = page.getByRole('button', { name: 'Kompass aktiv', exact: true });
    const unsupported = page.getByText('stellt keinen Kompass zur Verfügung');
    const denied = page.getByText('Ohne Freigabe kann der Kompass nicht gelesen werden');
    await expect(activeButton.or(unsupported).or(denied).first()).toBeVisible();
  });

  test('turns the rose only on an absolute heading', async ({ page }) => {
    /**
     * Put the page on the footing this feature is written for: a device whose
     * orientation sensor exists and has been allowed. Both ways a desktop
     * runner falls short of that are covered below, and a browser that already
     * hands the sensor over is left alone.
     */
    await page.addInitScript(() => {
      const existing = (
        window as unknown as {
          DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
        }
      ).DeviceOrientationEvent;

      // A browser that gates the sensor behind a permission refuses it on a
      // headless runner, and the component then correctly reports the compass
      // as denied and never subscribes — leaving nothing to test. Granting it
      // stands in for the visitor tapping "allow".
      if (existing) {
        if (typeof existing.requestPermission === 'function') {
          Object.defineProperty(existing, 'requestPermission', {
            configurable: true,
            writable: true,
            value: () => Promise.resolve('granted'),
          });
        }
        return;
      }

      // And a browser with no orientation API at all gets one, because a
      // desktop browser is not the device this feature is for.
      class PolyfilledDeviceOrientationEvent extends Event {
        readonly alpha: number | null;
        readonly beta: number | null;
        readonly gamma: number | null;
        readonly absolute: boolean;
        constructor(type: string, init: DeviceOrientationEventInit = {}) {
          super(type, init);
          this.alpha = init.alpha ?? null;
          this.beta = init.beta ?? null;
          this.gamma = init.gamma ?? null;
          this.absolute = init.absolute ?? false;
        }
      }
      Object.defineProperty(window, 'DeviceOrientationEvent', {
        configurable: true,
        writable: true,
        value: PolyfilledDeviceOrientationEvent,
      });
    });

    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();
    // `exact`, for the reason given in the test above: without it this matches
    // the unclicked button and the rest of the test runs against a compass
    // that was never activated.
    await expect(page.getByRole('button', { name: 'Kompass aktiv', exact: true })).toBeVisible();

    const rose = page.getByRole('img', { name: /Kompassrose/ });
    const rotation = async () =>
      (await rose.getAttribute('style'))?.match(/rotate\((-?[\d.]+)deg\)/)?.[1];

    // One orientation reading, built with the constructor a browser uses, and
    // everything the page saw of it reported together so a failure names which
    // link broke rather than only printing a rotation.
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
            return { reachedAListener, alpha: event.alpha, absolute: event.absolute };
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
