import { test, expect } from '@playwright/test';

/**
 * The du'a reader, which is also the Quran's: the whole screen, the size of
 * the letters, and a swipe to the next text. The Quran page itself cannot be
 * exercised here — it is rendered from an API this environment cannot reach —
 * so the shared behaviour is checked where the text is carried in the page.
 */
test.describe('the du‘as', () => {
  test('lists them and opens one in full', async ({ page }) => {
    await page.goto('/de/duas');
    const open = page.getByRole('link', { name: 'Vollständigen Text lesen' });
    await expect(open.first()).toBeVisible();

    await page.goto('/de/duas/faraj');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Faradsch');

    // Every line is the Arabic with the German under it.
    const lines = page.locator('.dua-line');
    await expect(lines).toHaveCount(14);
    await expect(lines.first().locator('.dua-ar')).toContainText('بِسْمِ');
    await expect(lines.first().locator('.dua-tr')).toContainText('Im Namen Gottes');

    // And the page says where the text and the translation come from.
    await expect(page.getByText('Textgrundlage')).toBeVisible();
  });

  test('reads in Persian too', async ({ page }) => {
    await page.goto('/fa/duas/faraj');
    await expect(page.locator('.dua-line').first().locator('.dua-tr')).toContainText(
      'به نام خداوند',
    );
  });

  test('hides and shows the translation', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    const translation = page.locator('.dua-tr').first();
    await expect(translation).toBeVisible();
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(translation).toBeHidden();
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(translation).toBeVisible();
  });

  test('sets the text size, and remembers it', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.dua-ar')!).fontSize);
    const before = await size();

    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    const bigger = await size();
    expect(parseFloat(bigger)).toBeGreaterThan(parseFloat(before));

    // The choice is the reader's, not the page's: it survives a reload.
    // Polled, because the stored size is applied once the reader hydrates.
    await page.reload();
    await expect.poll(size).toBe(bigger);
  });

  test('fills the screen the way the Quran does', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    const band = page.locator('.page-head-band');
    await expect(band).toBeVisible();

    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    // The same root flag the Quran sets, and the same furniture standing
    // down: the site's header, the page's green band, its footer and the
    // du'a's own facts list.
    await expect(page.locator('html')).toHaveAttribute('data-reader-full', 'true');
    await expect(band).toBeHidden();
    await expect(page.locator('.dua-facts')).toBeHidden();
    await expect(page.locator('.footer-city')).toBeHidden();

    // The bar comes along, so nothing is given up by filling the screen.
    await expect(page.getByRole('switch', { name: 'Übersetzung' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schrift vergrößern' })).toBeVisible();

    await page.getByRole('button', { name: 'Vollbild verlassen' }).first().click();
    await expect(page.locator('html')).not.toHaveAttribute('data-reader-full', 'true');
    await expect(band).toBeVisible();
  });

  test('on a phone, no control is cut off at the edge of the screen', async ({ page }) => {
    // What the owner reported, with a screenshot: in fullscreen the toolbar
    // ran off the right-hand edge and the fullscreen button was sliced in
    // half. It is the Quran's bar now, which folds instead of sliding.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/duas/faraj');
    await page.locator('.qr-compact .qr-chip').nth(1).click();
    await expect(page.locator('html')).toHaveAttribute('data-reader-full', 'true');

    for (const control of await page.locator('.qr-bar button').all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(390.5);
    }

    // And the bar is a bar, not a quarter of the screen.
    const bar = (await page.locator('.qr-bar').boundingBox())!;
    expect(bar.height).toBeLessThan(844 / 8);
  });

  test('presents a line at a time, on the Quran’s overlay', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await page.getByRole('button', { name: 'Präsentation', exact: true }).first().click();

    // The same overlay: the dark green ground, one line of the du'a on it,
    // and where in the du'a that line is.
    const overlay = page.locator('.qp');
    await expect(overlay).toBeVisible();
    expect(await overlay.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(6, 33, 26)',
    );
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 1 von 14');
    await expect(page.locator('.qp-ar')).toContainText('بِسْمِ');
    await expect(page.locator('.qp-tr')).toContainText('Im Namen Gottes');

    // A clicker's keys step through it, and the end of one line is the
    // start of the next.
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 2 von 14');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 1 von 14');

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('presents from the line that was asked for', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await page.getByRole('button', { name: 'Ab hier präsentieren' }).nth(2).click();
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 3 von 14');
  });

  test('a swipe turns to the next du‘a and stays in fullscreen', async ({ page }) => {
    await page.goto('/de/duas/tawassul');
    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-reader-full', 'true');

    const stage = page.locator('.qr-main');
    const box = (await stage.boundingBox())!;
    const y = box.y + Math.min(box.height / 2, 300);
    for (const [type, x] of [
      ['pointerdown', 60],
      ['pointerup', 320],
    ] as const) {
      await stage.dispatchEvent(type, {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
      });
    }

    // Carried rightwards is onwards, as in the mushaf — these are bound on
    // the right, so the leaf you have finished goes over the spine. And the
    // reader does not fall out of fullscreen on the way, although the turn
    // remounts it.
    await expect(page).toHaveURL(/\/de\/duas\/nudba$/);
    await expect(page.locator('html')).toHaveAttribute('data-reader-full', 'true');
  });
});
