import { test, expect, type Page } from '@playwright/test';

/**
 * The du'a reader, built from the Quran reader's parts: the bar, the list
 * beside the text, line cards, the continuous view, sheets and presentation.
 * The Quran page itself needs an API this environment may not reach, so the
 * shared behaviour is also checked here, where the text is carried in the page.
 */

/** The dock is portalled in after mounting, so it says the effects have run. */
const hydrated = (page: Page) => expect(page.locator('.rd-dock')).toBeAttached();

const openDisplay = async (page: Page) => {
  await page.getByRole('button', { name: 'Darstellung' }).click();
  await expect(page.locator('.rd-pop')).toBeVisible();
};

test.describe('the du‘as', () => {
  test('lists them and opens one in full', async ({ page }) => {
    await page.goto('/de/duas');
    const cards = page.locator('article.dua');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('article.dua .card-link')).toHaveCount(count);

    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Faradsch');

    // The Basmala opens the du'a and is set apart; the thirteen that
    // follow are its lines, each the Arabic with the German under it.
    await expect(page.locator('.rd-surah .rd-bism')).toContainText('بِسْمِ');
    await expect(page.locator('.rd-bism-tr')).toContainText('Im Namen Gottes');
    const lines = page.locator('li.rd-verse');
    await expect(lines).toHaveCount(13);
    await expect(lines.first().locator('.rd-ar')).toContainText('إِلَهِ');
    await expect(lines.first().locator('.rd-medal-n')).toHaveText('1');

    await expect(page.getByText('Textgrundlage')).toBeVisible();
    // The site's own header and footer stand down for the reader.
    await expect(page.locator('.site-header')).toBeHidden();
  });

  test('reads in Persian too', async ({ page }) => {
    await page.goto('/fa/duas/faraj');
    await expect(page.locator('.rd-bism-tr')).toContainText('به نام خداوند');
  });

  test('hides and shows the translation', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    const translation = page.locator('.rd-tr').first();
    await expect(translation).toBeVisible();
    await openDisplay(page);
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(translation).toBeHidden();
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(page.locator('.rd-tr').first()).toBeVisible();
  });

  test('sets the text size, and remembers it', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    const size = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('.rd-ar')!).fontSize);
    const before = await size();
    await openDisplay(page);
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    await page.getByRole('button', { name: 'Schrift vergrößern' }).click();
    const bigger = await size();
    expect(parseFloat(bigger)).toBeGreaterThan(parseFloat(before));

    await page.reload();
    await expect.poll(size).toBe(bigger);
  });

  test('turns to the next du‘a without visiting the page again', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await page.evaluate(() => {
      (window as unknown as { __kept?: string }).__kept = 'here';
    });

    await page
      .locator('.rd-pagenav')
      .getByRole('button', { name: /Nächstes/ })
      .click();

    await expect(page).toHaveURL(/\/de\/duas\/jawshan-kabir$/);
    await expect(page.locator('.rd-dua-title')).toContainText('Dschauschan');
    await expect(page.locator('.rd-title-name')).toContainText('Dschauschan');
    expect(await page.evaluate(() => (window as unknown as { __kept?: string }).__kept)).toBe(
      'here',
    );

    // And back with the arrow key: German runs left to right, so back is ←.
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/de\/duas\/faraj$/);
  });

  test('picks a du‘a from the sidebar, and filters the list by kind', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    const rows = page.locator('.rd-side .rd-surah-row');
    const all = await rows.count();
    expect(all).toBeGreaterThan(8);

    await page.locator('.rd-side').getByRole('button', { name: 'Ziyarat', exact: true }).click();
    const some = await rows.count();
    expect(some).toBeLessThan(all);
    expect(some).toBeGreaterThan(0);

    await rows.first().click();
    await expect(page).toHaveURL(/\/de\/duas\/ziyarat-/);
    await expect(page.locator('.rd-dua-title')).toContainText('Ziyarat');
  });

  test('bookmarks a whole du‘a or one line, and goes back to either', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await page.getByRole('button', { name: 'Bittgebet als Lesezeichen setzen' }).click();
    await expect(page.locator('.rd-toast')).toHaveText('Lesezeichen gesetzt');
    const third = page.locator('li.rd-verse').nth(2);
    await third.getByRole('button', { name: 'Lesezeichen setzen' }).click();
    await expect(third.locator('.rd-flag')).toBeVisible();

    await page.goto('/de/duas/tawassul');
    await hydrated(page);
    const side = page.locator('.rd-side');
    await side.getByRole('button', { name: /Lesezeichen/ }).click();
    const marks = side.locator('.rd-surah-row');
    await expect(marks).toHaveCount(2);
    await expect(marks.first()).toContainText('Zeile 3');
    await expect(marks.nth(1)).toContainText('Ganzes Bittgebet');

    await marks.first().click();
    await expect(page).toHaveURL(/\/de\/duas\/faraj#line-3$/);
    await expect(page.locator('#line-3')).toHaveAttribute('aria-current', 'true');
    await expect(
      page.getByRole('button', { name: 'Lesezeichen für dieses Bittgebet entfernen' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('opens the du‘a from anywhere on its card', async ({ page }) => {
    await page.goto('/de/duas');
    const card = page.locator('.dua').first();
    const box = (await card.boundingBox())!;
    // Pressed well away from the words that say so — the whole card is the
    // way in. Through the locator, which scrolls to it first: at this width
    // the card starts below the fold.
    await card.click({ position: { x: box.width / 2, y: box.height * 0.4 } });
    await expect(page).toHaveURL(/\/de\/duas\/[a-z-]+$/);
  });

  test('the card has no empty band above its kicker', async ({ page }) => {
    // The ghosted Arabic title once pushed everything down; it has since
    // been removed altogether.
    await page.goto('/de/duas');
    const gap = await page.evaluate(() => {
      const card = document.querySelector('.dua')!;
      const kicker = card.querySelector('.kicker')!;
      return kicker.getBoundingClientRect().top - card.getBoundingClientRect().top;
    });
    expect(gap).toBeLessThan(40);
    // And the watermark itself is gone: 7% gold text read as unreadable copy.
    await expect(page.locator('.dua-ghost')).toHaveCount(0);
  });

  test('reads line by line or at a stretch, and remembers which', async ({ page }) => {
    await page.goto('/de/duas/kumail');
    await hydrated(page);
    await expect(page.locator('.rd-lines')).toBeVisible();

    await openDisplay(page);
    await page.locator('.rd-pop').getByRole('button', { name: 'Am Stück' }).click();
    await expect(page.locator('.rd-mushaf')).toBeVisible();
    await expect(page.locator('.rd-lines')).toHaveCount(0);
    // The Basmala stands over the passage, unnumbered; the first line after
    // it is one, in Arabic-Indic figures even on the German page.
    await expect(page.locator('.rd-surah .rd-bism')).not.toContainText('۝');
    await expect(page.locator('.rd-mushaf-text .rd-mark').first()).toContainText('۝١');
    await expect(page.locator('.rd-mushaf-tr')).toBeVisible();

    await page.reload();
    await hydrated(page);
    await expect(page.locator('.rd-mushaf')).toBeVisible();
    await openDisplay(page);
    await page.locator('.rd-pop').getByRole('button', { name: 'Zeile für Zeile' }).click();
    await expect(page.locator('.rd-lines')).toBeVisible();
  });

  test('presents a line at a time', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await openDisplay(page);
    await page.getByRole('button', { name: 'Präsentation starten' }).click();

    const overlay = page.locator('.rd-present');
    await expect(overlay).toBeVisible();
    expect(await overlay.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(7, 59, 41)',
    );
    const title = page.locator('.rd-present-title');
    await expect(title).toContainText('Eröffnung');
    await expect(page.locator('.rd-present-ar')).toContainText('بِسْمِ');
    await expect(page.locator('.rd-present-tr')).toContainText('Im Namen Gottes');

    await page.keyboard.press('ArrowRight');
    await expect(title).toContainText('Zeile 1 von 13');
    await page.keyboard.press('ArrowLeft');
    await expect(title).toContainText('Eröffnung');

    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
  });

  test('presents from the line that was asked for', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await page
      .locator('li.rd-verse')
      .nth(2)
      .getByRole('button', { name: 'Ab hier präsentieren' })
      .click();
    await expect(page.locator('.rd-present-title')).toContainText('Zeile 3 von 13');
  });

  test('lights the line a link names', async ({ page }) => {
    await page.goto('/de/duas/faraj#line-4');
    await hydrated(page);
    await expect(page.locator('#line-4')).toHaveAttribute('aria-current', 'true');
  });

  test('on a phone: a dock to turn, sheets for the rest, nothing cut off', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/de/duas/tawassul');
    await hydrated(page);

    for (const control of await page.locator('.rd-bar button, .rd-bar a, .rd-dock button').all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(390.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await page.locator('.rd-more').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // A swipe leftwards is onwards in German.
    const stage = page.locator('.rd-main');
    const box = (await stage.boundingBox())!;
    const y = box.y + 300;
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
    await expect(page).toHaveURL(/\/de\/duas\/nudba$/);
  });
});
