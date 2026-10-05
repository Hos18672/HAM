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

/**
 * Wait until the reader's own effects have run.
 *
 * `.qr-fixed` is the portal the fixed furniture is mounted into, and it is
 * rendered only after the client has mounted — so its presence says the
 * key listener is attached. Without this a `keyboard.press` straight after
 * a reload can land before hydration and be dropped, which is exactly how
 * the full-screen test failed on CI and never here.
 */
const hydrated = (page: Page) => expect(page.locator('.qr-fixed')).toBeAttached();

test.describe('the Quran reader', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(ENTRY);
    test.skip(
      !response || response.status() >= 500,
      'the Quran text service cannot be reached from here',
    );
    await expect(page.locator('.qr-bar')).toBeVisible();
    await expect(page.locator('.qr-ar').first()).toBeVisible();
    await hydrated(page);
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
    await hydrated(page);
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

  test('turns like paper on a phone only', async ({ page }) => {
    await page.getByRole('button', { name: 'Mushaf' }).click();
    await expect(page.locator('.qr-sheet')).toBeVisible();

    // A wide screen simply changes the page: no leaf is ever drawn.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => {
      (window as unknown as { leafSeen: boolean }).leafSeen = false;
      new MutationObserver(() => {
        if (document.querySelector('.qr-leaf'))
          (window as unknown as { leafSeen: boolean }).leafSeen = true;
      }).observe(document.body, { childList: true, subtree: true });
    });
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/page\/3$/);
    expect(await page.evaluate(() => (window as unknown as { leafSeen: boolean }).leafSeen)).toBe(
      false,
    );

    // A phone turns the leaf.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.qr-leaf')).toBeAttached();
    await expect(page).toHaveURL(/\/page\/2$/);
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
    await hydrated(page);
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
    const header = page.locator('.site-header');
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

  test('names the surah where it begins, and not on every page of it', async ({ page }) => {
    // Page 2 opens al-Baqara; page 3 carries it on. A surah runs for pages
    // — al-Baqara for forty-eight — and the cartouche is an opening, not a
    // label to repeat at the head of each one.
    await page.locator('.qr-seg button').nth(1).click();
    await expect(page.locator('.qr-paper > .mushaf-head')).toBeVisible();

    await page.goto('/de/quran/page/3');
    await hydrated(page);
    await expect(page.locator('.qr-sheet, .qr-verses')).toBeVisible();
    await expect(page.locator('.qr-paper > .mushaf-head')).toHaveCount(0);
  });

  test('sets al-Fatiha’s Basmala on a line of its own', async ({ page }) => {
    // It *is* the first verse there, so it is not taken off and set apart
    // as it is in every other surah — and it ran on into al-Hamdu with the
    // opening of the Quran halfway along a justified line.
    await page.goto('/de/quran/page/1');
    await hydrated(page);
    await page.locator('.qr-seg button').nth(1).click();

    const alone = page.locator('.qr-sheet-alone');
    await expect(alone).toBeVisible();
    await expect(alone).toContainText('بِسْمِ');
    // And it keeps its number, which is what makes the verse after it two
    // rather than a page that starts counting at two.
    await expect(alone.locator('.qr-mark')).toHaveText('۝١');
    await expect(page.locator('.qr-sheet-alone + .qr-sheet-text .qr-mark').first()).toHaveText(
      '۝٢',
    );
    // And what follows it starts after it, not beside it.
    const [first, rest] = await page.evaluate(() => {
      const a = document.querySelector('.qr-sheet-alone')!.getBoundingClientRect();
      const b = document.querySelector('.qr-sheet-alone + .qr-sheet-text')!.getBoundingClientRect();
      return [a.bottom, b.top];
    });
    expect(rest).toBeGreaterThanOrEqual(first - 1);
  });

  test('gives the Quran the screen, and says each thing once', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await hydrated(page);
    await page.keyboard.press('f');
    await expect(page.locator('.page-head-band')).toBeHidden();

    // The bar is controls and nothing else. It used to name the surah, the
    // juz and the page — all three of which the page itself says, the
    // first two in its running head and the last on the page and under
    // the slider. (Its selects still hold every surah and juz as options,
    // so this asks for the title block itself, not for the words.)
    await expect(page.locator('.qr-head')).toHaveCount(0);
    await expect(page.locator('.qr-bar').getByRole('paragraph')).toHaveCount(0);
    // The page still says both, where a printed page says them.
    await expect(page.locator('.qr-paper .mushaf-foot')).toContainText('Teil');
    await expect(page.locator('.qr-paper > .mushaf-head')).not.toContainText('Teil');

    // And what is left of the screen is the Quran's.
    const room = await page.evaluate(() => {
      const bar = document.querySelector('.qr-bar')!.getBoundingClientRect().height;
      const foot = document.querySelector('.qr-foot')!.getBoundingClientRect().height;
      return (window.innerHeight - bar - foot) / window.innerHeight;
    });
    expect(room).toBeGreaterThan(0.85);
  });

  test('gives a phone a presentation bar it can hold', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await hydrated(page);
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
    await hydrated(page);
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

  /* These two run against whatever the edition actually sends, which is the
     only place the real markup exists — the stand-in used while building
     cannot be trusted to carry every shape of it. */

  test('prints no markup from the tajweed edition, on any page of the book', async ({ page }) => {
    // `[g]` was printed in the middle of a verse: a rule that carries no
    // text of its own, which the parser did not recognise. Nothing in the
    // Quran's text is written in Latin letters, figures or brackets, so one
    // of those on the page is markup that got through.
    for (const number of [1, 2, 132, 134, 255, 400, 604]) {
      await page.goto(`/de/quran/page/${number}`);
      await hydrated(page);
      const settings = page.getByRole('button', { name: 'Einstellungen' });
      if (await settings.isVisible()) await settings.click();
      await page.locator('.qr-seg button').nth(1).click();
      const arabic = await page.locator('.qr-sheet-text').first().innerText();
      expect(arabic.match(/[A-Za-z0-9[\]:]/g) ?? [], `page ${number}`).toEqual([]);
    }
  });

  test('sets the words an even space apart, at every reading size', async ({ page }) => {
    // Justified, a browser pulls the spaces apart to reach the margin, and
    // on a line of four long Arabic words it opened holes up to 2.45em
    // against a normal space of 0.27. The page is set flush to the right
    // instead, so every space is the one the font draws.
    await page.goto('/de/quran/page/132');
    await hydrated(page);
    const settings = page.getByRole('button', { name: 'Einstellungen' });
    if (await settings.isVisible()) await settings.click();
    await page.locator('.qr-seg button').nth(1).click();

    const widest = () =>
      page.evaluate(() => {
        const host = document.querySelector('.qr-sheet-text')!;
        const spaces: number[] = [];
        const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        for (let node = walk.nextNode(); node; node = walk.nextNode()) {
          const text = node.textContent ?? '';
          for (let i = 0; i < text.length; i += 1) {
            if (text[i] !== ' ') continue;
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const box = range.getBoundingClientRect();
            if (box.width > 0) spaces.push(box.width);
          }
        }
        return Math.max(...spaces) / parseFloat(getComputedStyle(host).fontSize);
      });

    const bigger = page.getByRole('button', { name: 'Größer' });
    for (let step = 0; step <= 4; step += 1) {
      if (step) await bigger.click();
      expect(await widest(), `at size +${step}`).toBeLessThan(0.4);
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

    await page.getByRole('button', { name: 'Präsentation', exact: true }).click();
    await expect(page.locator('.qp')).toBeVisible();
    const presenting = await audit();
    expect(presenting.violations, say(presenting)).toEqual([]);
  });
});
