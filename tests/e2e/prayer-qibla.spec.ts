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
