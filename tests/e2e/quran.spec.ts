import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The Quran reader: a bar that says where you are, the surahs and juz
 * beside the page, verse cards or the printed page, a dock that plays the
 * recitation, and presentation for a room.
 *
 * Underneath all of it: a turn must not be a visit — the page's data is
 * fetched and the address written without telling the router.
 *
 * The text comes from alquran.cloud, so where that cannot be reached the page
 * cannot render and there is nothing here to test. That is stated as a skip
 * rather than hidden: a silent pass would be a lie.
 */
const ENTRY = '/de/quran/page/2';

const mark = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __kept?: string }).__kept = 'here';
  });
const kept = (page: Page) =>
  page.evaluate(() => (window as unknown as { __kept?: string }).__kept ?? null);

/** The dock is portalled in after mounting, so it says the effects have run. */
const hydrated = (page: Page) => expect(page.locator('.rd-dock')).toBeAttached();

const openDisplay = async (page: Page) => {
  await page.getByRole('button', { name: 'Darstellung' }).click();
  await expect(page.locator('.rd-pop')).toBeVisible();
};

test.describe('the Quran reader', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(ENTRY);
    test.skip(
      !response || response.status() >= 500,
      'the Quran text service cannot be reached from here',
    );
    await expect(page.locator('.rd-bar')).toBeVisible();
    await hydrated(page);
  });

  test('is the whole screen: the site header and footer stand down', async ({ page }) => {
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.footer-city')).toBeHidden();
    await expect(page.locator('.rd-title-meta')).toContainText('Seite 2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  });

  test('opens verse by verse, each with its translation under it', async ({ page }) => {
    const verses = page.locator('article.rd-verse');
    const count = await verses.count();
    expect(count).toBeGreaterThan(0);
    expect(await page.locator('.rd-verse .rd-ar').count()).toBe(count);
    expect(await page.locator('.rd-verse .rd-tr').count()).toBe(count);
    // The star is the number; there is no second pill saying it again.
    await expect(page.locator('.qr-pill, .qr-from')).toHaveCount(0);
  });

  test('switches to the printed page, and remembers it', async ({ page }) => {
    await openDisplay(page);
    await page.locator('.rd-pop').getByRole('button', { name: 'Mushaf' }).click();
    await expect(page.locator('.rd-mushaf')).toBeVisible();
    await expect(page.locator('article.rd-verse')).toHaveCount(0);

    await page.reload();
    await hydrated(page);
    await expect(page.locator('.rd-mushaf')).toBeVisible();

    await openDisplay(page);
    await page.locator('.rd-pop').getByRole('button', { name: 'Vers für Vers' }).click();
    await expect(page.locator('article.rd-verse').first()).toBeVisible();
  });

  test('turns the page with the arrow keys, without loading the site again', async ({ page }) => {
    await mark(page);
    // German runs left to right, so onwards is →.
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/de\/quran\/page\/3$/);
    expect(await kept(page)).toBe('here');

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/de\/quran\/page\/2$/);
    expect(await kept(page)).toBe('here');
  });

  test('goes to a juz from the sidebar', async ({ page }) => {
    await mark(page);
    await page.locator('.rd-side').getByRole('button', { name: 'Juz', exact: true }).click();
    await page.locator('.rd-side .rd-juz-tile').nth(1).click();
    await expect(page).toHaveURL(/\/de\/quran\/page\/22$/);
    expect(await kept(page)).toBe('here');
  });

  test('sets the text size and remembers it', async ({ page }) => {
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.rd-ar')!).fontSize);
    const before = parseFloat(await size());
    await openDisplay(page);
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    const bigger = parseFloat(await size());
    expect(bigger).toBeGreaterThan(before);

    await page.reload();
    await hydrated(page);
    await expect.poll(async () => parseFloat(await size())).toBe(bigger);
  });

  test('keeps bookmarks across a reload', async ({ page }) => {
    const first = page.locator('article.rd-verse').first();
    await first.getByRole('button', { name: 'Lesezeichen setzen' }).click();
    await expect(page.locator('.rd-toast')).toHaveText('Lesezeichen gesetzt');
    await page.reload();
    await hydrated(page);
    await page
      .locator('.rd-side')
      .getByRole('button', { name: /Lesezeichen/ })
      .click();
    await expect(page.locator('.rd-side .rd-list li')).toHaveCount(1);
    await expect(page.locator('article.rd-verse').first().locator('.rd-flag')).toBeVisible();
  });

  test('lights the verse a deep link names', async ({ page }) => {
    const id = await page.locator('article.rd-verse').nth(2).getAttribute('id');
    const [, s, n] = /v-(\d+)-(\d+)/.exec(id!)!;
    await page.goto(`${ENTRY}#${s}:${n}`);
    await hydrated(page);
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-current', 'true');
  });

  test('presents one verse at a time, and crosses the page boundary', async ({ page }) => {
    await openDisplay(page);
    await page.getByRole('button', { name: 'Präsentation starten' }).click();
    const stage = page.locator('.rd-present');
    await expect(stage).toBeVisible();
    const where = page.locator('.rd-present-title');
    const first = await where.textContent();

    await page.keyboard.press('ArrowRight');
    await expect.poll(() => where.textContent()).not.toBe(first);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => where.textContent()).toBe(first);

    // Back from the first verse of this page opens the one before it — at
    // its last verse.
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/page\/1$/);
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/page\/2$/);

    await expect(page.locator('.rd-present-tr')).toHaveCount(1);
    await page.keyboard.press('t');
    await expect(page.locator('.rd-present-tr')).toHaveCount(0);
    await page.keyboard.press('t');
    await page.keyboard.press('Escape');
    await expect(stage).toHaveCount(0);
  });

  test('sets al-Fatiha’s Basmala on a line of its own', async ({ page }) => {
    await page.goto('/de/quran/page/1');
    await hydrated(page);
    await openDisplay(page);
    await page.locator('.rd-pop').getByRole('button', { name: 'Mushaf' }).click();
    const alone = page.locator('.rd-mushaf-alone');
    await expect(alone).toBeVisible();
    await expect(alone).toContainText('بِسْمِ');
    await expect(alone.locator('.rd-mark')).toContainText('۝١');
  });

  test('on a phone: the first verse without scrolling, and the dock never covers the last', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await hydrated(page);
    const verse = (await page.locator('article.rd-verse').first().boundingBox())!;
    expect(verse.y).toBeLessThan(844);

    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(300);
    const last = (await page.locator('.rd-credits').boundingBox())!;
    const dock = (await page.locator('.rd-dock').boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(dock.y);

    // The verse's actions open in a sheet.
    await page.locator('.rd-more').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('prints no markup from the tajweed edition, on any page of the book', async ({ page }) => {
    // Nothing in the Quran's text is written in Latin letters, figures or
    // brackets, so one of those on the page is markup that got through.
    for (const number of [1, 2, 132, 134, 255, 400, 604]) {
      await page.goto(`/de/quran/page/${number}`);
      await hydrated(page);
      const arabic = (await page.locator('.rd-ar').allInnerTexts()).join(' ');
      expect(arabic.match(/[A-Za-z0-9[\]:]/g) ?? [], `page ${number}`).toEqual([]);
    }
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

    await page
      .locator('article.rd-verse')
      .first()
      .getByRole('button', { name: 'Ab hier präsentieren' })
      .click();
    await expect(page.locator('.rd-present')).toBeVisible();
    const presenting = await audit();
    expect(presenting.violations, say(presenting)).toEqual([]);
  });
});
