import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The Quran reader, rebuilt to the design reference.
 *
 * Two ways to read, a bar that holds every choice, a foot that holds all 604
 * pages, and a presentation mode for a room. The one thing underneath all of
 * it: a turn must not be a visit — the page's data is fetched and the address
 * written without telling the router, so nothing else on the site renders.
 *
 * The text comes from alquran.cloud, so where that cannot be reached the page
 * cannot render and there is nothing here to test. That is stated as a skip
 * rather than hidden: a silent pass would be a lie.
 */
const ENTRY = '/de/quran/page/2';

/** Something only a fresh load of the whole page would clear. */
const mark = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __kept?: string }).__kept = 'here';
  });
const kept = (page: Page) =>
  page.evaluate(() => (window as unknown as { __kept?: string }).__kept ?? null);

test.describe('the Quran reader', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(ENTRY);
    test.skip(
      !response || response.status() >= 500,
      'the Quran text service cannot be reached from here',
    );
    await expect(page.locator('.qr-bar')).toBeVisible();
    await expect(page.locator('.qr-ar').first()).toBeVisible();
  });

  test('opens verse by verse, each with its translation under it', async ({ page }) => {
    const verses = page.locator('.qr-verse');
    await expect(verses.first()).toBeVisible();
    // Every verse carries its number, its Arabic and its rendering.
    const count = await verses.count();
    expect(count).toBeGreaterThan(0);
    expect(await page.locator('.qr-verse .qr-ar').count()).toBe(count);
    expect(await page.locator('.qr-verse .qr-tr').count()).toBe(count);
  });

  test('switches to the printed page and back', async ({ page }) => {
    await page.getByRole('button', { name: 'Mushaf' }).click();
    await expect(page.locator('.qr-sheet')).toBeVisible();
    // The printed page is continuous, not one block per verse.
    await expect(page.locator('.qr-verse')).toHaveCount(0);
    await expect(page.locator('.qr-sheet-text').first()).toBeVisible();

    // …and the choice is the reader's: it survives a reload.
    await page.reload();
    await expect(page.locator('.qr-sheet')).toBeVisible();

    await page.getByRole('button', { name: 'Vers für Vers' }).click();
    await expect(page.locator('.qr-verse').first()).toBeVisible();
  });

  test('turns the page with the arrow keys, without loading the site again', async ({ page }) => {
    await mark(page);
    // Onwards is leftwards: the next page of a mushaf lies to the left.
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/de\/quran\/page\/3$/);
    expect(await kept(page)).toBe('here');

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/de\/quran\/page\/2$/);
    expect(await kept(page)).toBe('here');
  });

  test('turns the page from the foot, and only when the slider is let go', async ({ page }) => {
    await mark(page);
    const slider = page.getByRole('slider');
    const box = (await slider.boundingBox())!;
    const y = box.y + box.height / 2;

    // Dragged but not released: the reading under the slider follows the
    // hand, and the page does not. Six hundred pages are not fetched on the
    // way past them.
    await page.mouse.move(box.x + box.width * 0.5, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
    const label = page.locator('.qr-slider-label');
    await expect.poll(() => label.textContent()).not.toContain('2 von');
    await expect(page).toHaveURL(/\/page\/2$/);

    // Letting go commits it, and still without loading the site again.
    await page.mouse.up();
    await expect(page).not.toHaveURL(/\/page\/2$/);
    expect(await kept(page)).toBe('here');
  });

  test('sets the text size and remembers it', async ({ page }) => {
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.qr-ar')!).fontSize);
    const before = parseFloat(await size());
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    const bigger = parseFloat(await size());
    expect(bigger).toBeGreaterThan(before);

    await page.reload();
    await expect.poll(async () => parseFloat(await size())).toBe(bigger);
  });

  test('presents one verse at a time, and crosses the page boundary', async ({ page }) => {
    await page.getByRole('button', { name: 'Präsentation', exact: true }).click();
    const stage = page.locator('.qp');
    await expect(stage).toBeVisible();
    const where = page.locator('.qp-pos');
    const first = await where.textContent();

    // Space and the page keys are what a presenter's clicker sends.
    await page.keyboard.press(' ');
    await expect.poll(() => where.textContent()).not.toBe(first);
    await page.keyboard.press('PageUp');
    await expect.poll(() => where.textContent()).toBe(first);

    // Back from the first verse of this page opens the one before it — at
    // its last verse, not its first.
    await page.keyboard.press('PageUp');
    await expect(page).toHaveURL(/\/page\/1$/);
    const back = (await where.textContent()) ?? '';
    const lastOfPageOne = back;
    await page.keyboard.press(' ');
    await expect.poll(() => where.textContent()).not.toBe(lastOfPageOne);
    // Forward from there crosses onwards again.
    await expect(page).toHaveURL(/\/page\/2$/);

    // T turns the translation off and on; Esc leaves.
    await expect(page.locator('.qp-tr')).toHaveCount(1);
    await page.keyboard.press('t');
    await expect(page.locator('.qp-tr')).toHaveCount(0);
    await page.keyboard.press('t');
    await expect(page.locator('.qp-tr')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(stage).toHaveCount(0);
  });

  test('presents from one verse when asked from that verse', async ({ page }) => {
    const buttons = page.getByRole('button', { name: 'Ab hier präsentieren' });
    const third = buttons.nth(2);
    await third.scrollIntoViewIfNeeded();
    await third.click();
    await expect(page.locator('.qp')).toBeVisible();
    // The third verse of the page, not the first.
    const shown = await page.locator('.qp-ar').textContent();
    const onPage = await page.locator('.qr-verse .qr-ar').nth(2).textContent();
    expect(shown?.replace(/\s+/g, '')).toContain((onPage ?? '').replace(/\s+/g, '').slice(0, 12));
  });

  test('fills the screen, and the site stands down while it does', async ({ page }) => {
    const header = page.locator('.hc-header');
    const band = page.locator('.page-head-band');
    await expect(header).toBeVisible();
    await expect(band).toBeVisible();

    await page.keyboard.press('f');
    await expect(header).toBeHidden();
    // The page's own green band goes too. Leaving it in meant the top of a
    // "full screen" phone was the title of the page, not the Quran.
    await expect(band).toBeHidden();
    await expect(page.locator('.qr-notes')).toBeHidden();
    await expect(page.locator('.footer-city')).toBeHidden();

    // The reader itself stays, bar and all — and the bar is opaque, because
    // the page scrolls directly under it.
    const bar = page.locator('.qr-bar');
    await expect(bar).toBeVisible();
    const glass = await bar.evaluate((el) => {
      const style = getComputedStyle(el);
      return { alpha: style.backgroundColor, blur: style.backdropFilter };
    });
    expect(glass.alpha).not.toMatch(/rgba\([^)]*,\s*0?\.\d+\s*\)/);
    expect(glass.blur).toBe('none');

    // Nothing above the reader to scroll back to.
    expect(
      await page.evaluate(() =>
        Math.round(document.querySelector('.qr-bar')!.getBoundingClientRect().top),
      ),
    ).toBeLessThanOrEqual(1);

    await page.keyboard.press('f');
    await expect(header).toBeVisible();
    await expect(band).toBeVisible();
  });

  test('gives a phone a presentation bar it can hold', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole('button', { name: 'Einstellungen' }).click();
    await page.getByRole('button', { name: 'Präsentation' }).first().click();
    await expect(page.locator('.qp')).toBeVisible();

    // The surah's name and the position get a line of their own, rather
    // than a column four characters wide with the tools beside it.
    const where = (await page.locator('.qp-where').boundingBox())!;
    expect(where.width).toBeGreaterThan(260);

    // Every control is on the screen and big enough for a thumb.
    for (const button of await page.locator('.qp button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(390.5);
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40);
    }
  });

  test('folds its controls away on a phone, and nothing is cut off', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await expect(page.locator('.qr-bar')).toBeVisible();

    // Only the three stay out; the rest are behind the first of them.
    await expect(page.locator('.qr-controls')).toBeHidden();
    await page.getByRole('button', { name: 'Einstellungen' }).click();
    await expect(page.locator('.qr-controls')).toBeVisible();

    const width = page.viewportSize()!.width;
    for (const control of await page.locator('.qr-bar button, .qr-bar select').all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    }
    // The arrows either side belong to a wide screen only.
    await expect(page.locator('.qr-side').first()).toBeHidden();
  });

  test('has no axe violations, reading or presenting', async ({ page }) => {
    const audit = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
    const say = (r: Awaited<ReturnType<typeof audit>>) =>
      r.violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n');

    const reading = await audit();
    expect(reading.violations, say(reading)).toEqual([]);

    await page.getByRole('button', { name: 'Präsentation', exact: true }).click();
    await expect(page.locator('.qp')).toBeVisible();
    const presenting = await audit();
    expect(presenting.violations, say(presenting)).toEqual([]);
  });
});
