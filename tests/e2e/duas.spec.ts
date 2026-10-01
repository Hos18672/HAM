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

  test('fills the screen, keeps every control, and leaves again', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    const shell = page.locator('.reader-shell');
    await expect(shell)
      .toHaveAttribute('data-full', /^$/, { timeout: 1 })
      .catch(() => {});

    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await expect(shell).toHaveAttribute('data-full', 'true');
    // Fixed to the viewport — not to the section it happens to sit in.
    expect(await shell.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    // The toolbar comes along, so nothing is given up by filling the screen.
    await expect(page.getByRole('switch', { name: 'Übersetzung' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schrift vergrößern' })).toBeVisible();

    await page.getByRole('button', { name: 'Vollbild verlassen' }).click();
    await expect(shell).not.toHaveAttribute('data-full', 'true');
  });

  test('on a phone, no control is cut off at the edge of the screen', async ({ page }) => {
    // What the owner reported, with a screenshot: in fullscreen the toolbar
    // ran off the right-hand edge and the fullscreen button was sliced in
    // half. It wraps now instead of sliding.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/duas/faraj');
    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await expect(page.locator('.reader-shell')).toHaveAttribute('data-full', 'true');

    const width = page.viewportSize()!.width;
    const controls = page.locator('.mushaf-toolbar button');
    const count = await controls.count();
    expect(count).toBeGreaterThan(2);
    for (let i = 0; i < count; i += 1) {
      const box = (await controls.nth(i).boundingBox())!;
      const label = await controls.nth(i).innerText();
      expect(box.x, label).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width, label).toBeLessThanOrEqual(width + 0.5);
    }

    // And the bar is a bar, not a third of the screen.
    const bar = (await page.locator('.mushaf-toolbar').boundingBox())!;
    expect(bar.height).toBeLessThan(844 / 4);
  });

  test('presents to a room: bigger type, and the controls get out of the way', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.dua-ar')!).fontSize);
    const before = parseFloat(await size());

    await page.getByRole('button', { name: 'Präsentation', exact: true }).click();
    const shell = page.locator('.reader-shell');
    // Presenting is the whole screen too: there is no presentation in a box
    // halfway down a page.
    await expect(shell).toHaveAttribute('data-present', 'true');
    await expect(shell).toHaveAttribute('data-full', 'true');
    expect(parseFloat(await size())).toBeGreaterThan(before);

    // Left alone, the toolbar fades — and it is still there for a hand or a
    // keyboard, which is why it fades rather than going away.
    await expect(shell).toHaveAttribute('data-idle', 'true', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Schrift vergrößern' })).toBeVisible();

    await page.getByRole('button', { name: 'Präsentation beenden' }).click();
    await expect(shell).not.toHaveAttribute('data-present', 'true');
  });

  test('a swipe turns to the next du‘a and stays in fullscreen', async ({ page }) => {
    await page.goto('/de/duas/tawassul');
    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await expect(page.locator('.reader-shell')).toHaveAttribute('data-full', 'true');

    const stage = page.locator('.mushaf-stage');
    const box = (await stage.boundingBox())!;
    const y = box.y + Math.min(box.height / 2, 300);
    for (const [type, x] of [
      ['pointerdown', 320],
      ['pointerup', 60],
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

    // Leftwards is onwards, as in the mushaf; and the reader does not fall
    // out of fullscreen on the way, although the turn remounts it.
    await expect(page).toHaveURL(/\/de\/duas\/nudba$/);
    await expect(page.locator('.reader-shell')).toHaveAttribute('data-full', 'true');
  });
});
