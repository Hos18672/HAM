import { test, expect } from '@playwright/test';

/**
 * Reading the Quran as a book.
 *
 * The one thing these are really for: a turn must not be a visit. The page's
 * data is fetched and only the sheet is drawn again — the address is
 * corrected with `replaceState`, which Next treats as a shallow update — so
 * the whole screen, the chosen size and everything else the reader set stay
 * exactly as they were. It used to load the site page afresh on every turn,
 * which lost all of it.
 *
 * The text comes from alquran.cloud, so where that cannot be reached the
 * page cannot render at all and there is nothing here to test. That is
 * stated as a skip rather than hidden: a silent pass would be a lie.
 */
const QURAN = '/de/quran/page/1';

test.describe('the mushaf', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(QURAN);
    test.skip(
      !response || response.status() >= 500,
      'the Quran text service cannot be reached from here',
    );
    await expect(page.locator('.mushaf-body')).toBeVisible();
  });

  /** Something only a fresh load of the page would clear. */
  const mark = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
      (window as unknown as { __kept?: string }).__kept = 'here';
      (window as unknown as { __leaf?: boolean }).__leaf = false;
      new MutationObserver(() => {
        if (document.querySelector('.mushaf-leaf')) {
          (window as unknown as { __leaf?: boolean }).__leaf = true;
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
  const kept = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { __kept?: string }).__kept);
  const sawLeaf = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { __leaf?: boolean }).__leaf);

  test('turns to the next page without loading the site again', async ({ page }) => {
    await mark(page);
    await page.keyboard.press('ArrowLeft');

    await expect(page).toHaveURL(/\/de\/quran\/page\/2$/);
    await expect(page.locator('.mushaf-folio')).toHaveText('2');
    // Nothing else rendered: the mark set before the turn is still there.
    expect(await kept(page)).toBe('here');

    // …and back again, the way an Arabic book turns.
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/de\/quran\/page\/1$/);
    expect(await kept(page)).toBe('here');
  });

  test('turns the sheet like paper', async ({ page }) => {
    await mark(page);
    await page.keyboard.press('ArrowLeft');
    // A sheet was in the air on the way: hung on the spine and swung about
    // it, rather than one page being swapped for another.
    await expect.poll(() => sawLeaf(page), { timeout: 5_000 }).toBe(true);
    await expect(page).toHaveURL(/\/quran\/page\/2$/);
    // And it is gone once the turn is over.
    await expect(page.locator('.mushaf-leaf')).toHaveCount(0);
  });

  test('a swipe turns the page too, and keeps the whole screen', async ({ page }) => {
    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    const shell = page.locator('.reader-shell');
    await expect(shell).toHaveAttribute('data-full', 'true');
    await mark(page);

    const stage = page.locator('.mushaf-stage');
    const box = (await stage.boundingBox())!;
    const y = box.y + Math.min(box.height / 2, 300);
    const send = (type: string, x: number) =>
      stage.dispatchEvent(type, {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: x,
        clientY: y,
        bubbles: true,
      });
    // Left to right: the finished leaf carried over the spine, which is
    // the hand a reader of a mushaf already has.
    await send('pointerdown', box.x + 40);
    await send('pointermove', box.x + 160);
    await send('pointermove', box.x + box.width - 40);
    await send('pointerup', box.x + box.width - 40);

    await expect(page).toHaveURL(/\/quran\/page\/2$/);
    // The reader asked for the whole screen and still has it — this is the
    // bug the paper turn was built around.
    await expect(shell).toHaveAttribute('data-full', 'true');
    expect(await kept(page)).toBe('here');
  });

  test('keeps the chosen text size across a turn', async ({ page }) => {
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.mushaf-body')!).fontSize);
    const before = await size();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    const bigger = await size();
    expect(parseFloat(bigger)).toBeGreaterThan(parseFloat(before));

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/quran\/page\/2$/);
    await expect.poll(size).toBe(bigger);
  });

  test('on a phone, no control is cut off in fullscreen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await expect(page.locator('.reader-shell')).toHaveAttribute('data-full', 'true');

    const width = page.viewportSize()!.width;
    const controls = page.locator('.mushaf-toolbar button');
    const count = await controls.count();
    for (let i = 0; i < count; i += 1) {
      const box = await controls.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    }
  });

  test('presents to a room', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const size = () =>
      page.evaluate(() =>
        parseFloat(getComputedStyle(document.querySelector('.mushaf-body')!).fontSize),
      );
    const before = await size();
    await page.getByRole('button', { name: 'Präsentation', exact: true }).click();
    const shell = page.locator('.reader-shell');
    await expect(shell).toHaveAttribute('data-present', 'true');
    expect(await size()).toBeGreaterThan(before);

    // The presenter's remote sends page down; so does the space bar.
    await page.keyboard.press('PageDown');
    await expect(page).toHaveURL(/\/quran\/page\/2$/);
    await expect(shell).toHaveAttribute('data-present', 'true');
  });
});
