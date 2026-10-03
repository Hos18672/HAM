import { test, expect, type Page } from '@playwright/test';

/**
 * The du'a reader, which is also the Quran's: the whole screen, the size of
 * the letters, and a swipe to the next text. The Quran page itself cannot be
 * exercised here — it is rendered from an API this environment cannot reach —
 * so the shared behaviour is checked where the text is carried in the page.
 */
/**
 * Wait until the reader's own effects have run: `.qr-fixed` is the portal
 * its fixed furniture mounts into, and it appears only after the client
 * has mounted. A click or a key that lands before that is dropped.
 */
const hydrated = (page: Page) => expect(page.locator('.qr-fixed')).toBeAttached();

test.describe('the du‘as', () => {
  test('lists them and opens one in full', async ({ page }) => {
    await page.goto('/de/duas');
    // Every card opens its text: the title is the link.
    const cards = page.locator('article.dua');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('article.dua .card-link')).toHaveCount(count);

    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Faradsch');

    // The Basmala opens the du'a and is set apart; the thirteen that
    // follow are its lines, each the Arabic with the German under it.
    await expect(page.locator('.dua-opening .dua-ar')).toContainText('بِسْمِ');
    await expect(page.locator('.dua-opening .dua-tr')).toContainText('Im Namen Gottes');
    const lines = page.locator('.dua-line');
    await expect(lines).toHaveCount(13);
    await expect(lines.first().locator('.dua-ar')).toContainText('إِلَهِ');

    // And the page says where the text and the translation come from.
    await expect(page.getByText('Textgrundlage')).toBeVisible();
  });

  test('reads in Persian too', async ({ page }) => {
    await page.goto('/fa/duas/faraj');
    await expect(page.locator('.dua-opening .dua-tr')).toContainText('به نام خداوند');
  });

  test('hides and shows the translation', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    const translation = page.locator('.dua-tr').first();
    await expect(translation).toBeVisible();
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(translation).toBeHidden();
    await page.getByRole('switch', { name: 'Übersetzung' }).click();
    await expect(translation).toBeVisible();
  });

  test('sets the text size, and remembers it', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
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

  test('turns to the next du‘a without visiting the page again', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    // Something only a fresh load of the whole page would clear.
    await page.evaluate(() => {
      (window as unknown as { __kept?: string }).__kept = 'here';
    });

    await page
      .getByRole('button', { name: /Nächstes/ })
      .first()
      .click();

    // The whole du'a is replaced — its band, its words and its facts — and
    // the address with it, but the page itself was never loaded again.
    await expect(page).toHaveURL(/\/de\/duas\/jawshan-kabir$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Dschauschan');
    await expect(page.locator('.qr-foot-title')).toHaveText('Dschauschan Kabir');
    expect(await page.evaluate(() => (window as unknown as { __kept?: string }).__kept)).toBe(
      'here',
    );
  });

  test('picks a du‘a from the bar, and filters the list by kind', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    // On a wide screen the controls are already out; the settings button
    // that folds them away belongs to a narrow one.
    const picker = page.locator('.qr-select select').first();
    await expect(picker).toBeVisible();
    const all = await picker.locator('option').count();
    expect(all).toBeGreaterThan(8);

    // The filter narrows what the picker offers, as the juz narrows the
    // mushaf's surahs.
    await page.locator('.qr-select select').nth(1).selectOption('ziyara');
    const some = await picker.locator('option').count();
    expect(some).toBeLessThan(all);
    expect(some).toBeGreaterThan(0);

    await picker.selectOption({ index: 0 });
    await expect(page).toHaveURL(/\/de\/duas\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ziyarat');
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

  test('sets the Basmala apart at the head of a du‘a', async ({ page }) => {
    await page.goto('/de/duas/kumail');
    await hydrated(page);
    await page.getByRole('button', { name: 'Am Stück' }).click();

    // On its own line and unnumbered, as it is at the head of a surah: it
    // opens the text rather than being the first thing said in it.
    const bism = page.locator('.dua-flow-bism');
    await expect(bism).toBeVisible();
    await expect(bism).toContainText('بِسْمِ');
    await expect(bism).not.toContainText('۝');
    // And the line after it is the first, not the second: the opening is
    // not one of the du'a's lines. The numeral inside the sign is
    // Arabic-Indic on the German page too — it belongs to the Arabic.
    await expect(page.locator('.dua-flow-ar .qr-mark').first()).toHaveText('۝١');

    // And the same line by line: the opening set apart, the prayer's first
    // line numbered one.
    await page.getByRole('button', { name: 'Zeile für Zeile' }).click();
    await expect(page.locator('.dua-opening')).toBeVisible();
    await expect(page.locator('.dua-line .qr-pill').first()).toHaveText('1');
  });

  test('reads line by line or at a stretch, as the mushaf does', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);

    // Line by line is what opens: numbered, each with its rendering under it.
    await expect(page.locator('.dua-lines')).toBeVisible();
    await expect(page.locator('.dua-flow')).toHaveCount(0);

    await page.getByRole('button', { name: 'Am Stück' }).click();
    await expect(page.locator('.dua-flow')).toBeVisible();
    await expect(page.locator('.dua-lines')).toHaveCount(0);
    // One passage, with the Basmala still standing over it, and the
    // translation gathered under it.
    await expect(page.locator('.dua-flow-bism')).toContainText('بِسْمِ');
    await expect(page.locator('.qr-mushaf-tr')).toContainText('Im Namen Gottes');

    // The choice is the reader's, not the page's: it survives a reload.
    await page.reload();
    await hydrated(page);
    await expect(page.locator('.dua-flow')).toBeVisible();

    await page.getByRole('button', { name: 'Zeile für Zeile' }).click();
    await expect(page.locator('.dua-lines')).toBeVisible();
  });

  test('fills the screen the way the Quran does', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
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
    await hydrated(page);
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
    await hydrated(page);
    await page.getByRole('button', { name: 'Präsentation', exact: true }).first().click();

    // The same overlay: the dark green ground, one line of the du'a on it,
    // and where in the du'a that line is.
    const overlay = page.locator('.qp');
    await expect(overlay).toBeVisible();
    expect(await overlay.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(6, 33, 26)',
    );
    // The Basmala opens the du'a and is named rather than numbered.
    await expect(page.locator('.qp-pos')).toHaveText('Eröffnung');
    await expect(page.locator('.qp-ar')).toContainText('بِسْمِ');
    await expect(page.locator('.qp-tr')).toContainText('Im Namen Gottes');

    // A clicker's keys step through it, and the end of one line is the
    // start of the next.
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 1 von 13');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.qp-pos')).toHaveText('Eröffnung');

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('presents from the line that was asked for', async ({ page }) => {
    await page.goto('/de/duas/faraj');
    await hydrated(page);
    await page.getByRole('button', { name: 'Ab hier präsentieren' }).nth(2).click();
    await expect(page.locator('.qp-pos')).toHaveText('Zeile 3 von 13');
  });

  test('a swipe turns to the next du‘a and stays in fullscreen', async ({ page }) => {
    await page.goto('/de/duas/tawassul');
    await hydrated(page);
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
