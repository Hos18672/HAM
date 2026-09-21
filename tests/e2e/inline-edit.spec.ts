import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

/**
 * In-place editing is a first-class feature, so it gets a first-class test:
 * the full round trip from the dashboard toggle, through an edit on the live
 * page, to the text appearing for an ordinary visitor.
 *
 * Note the locale. Entering edit mode lands on the site's *default* language,
 * which is Persian — so the bar reads «حالت ویرایش» there and
 * «Bearbeitungsmodus» only after switching to German.
 */

const BAR = { fa: 'حالت ویرایش', de: 'Bearbeitungsmodus' } as const;
const SAVED = { fa: 'ذخیره شد', de: 'Gespeichert' } as const;

/** The edit bar — a live region, so assertions scope to it rather than to
 *  loose text that also appears in the page body. */
function editBar(page: Page) {
  return page
    .getByRole('status')
    .filter({ hasText: new RegExp(`${BAR.fa}|${BAR.de}|${SAVED.fa}|${SAVED.de}`) });
}

/** Sign in and open the public site with an edit session active. */
async function enterEditMode(page: Page) {
  await login(page);
  await page.getByRole('button', { name: 'Website direkt bearbeiten' }).click();
  await page.waitForURL(/\/(fa|de)$/);
  await expect(editBar(page)).toBeVisible();
}

test.describe('in-place editing', () => {
  test('is not available to an anonymous visitor', async ({ page }) => {
    await page.goto('/de/about');
    // No editable regions, no edit bar — edit mode rides a signed httpOnly
    // cookie, so it cannot be switched on from the browser.
    await expect(page.locator('.editable')).toHaveCount(0);
    await expect(page.getByText(BAR.de)).toBeHidden();
  });

  test('cannot be forged by setting the cookie', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ham-edit',
        value: 'someone.9999999999999.not-a-real-signature',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    await page.goto('/de/about');
    await expect(page.locator('.editable')).toHaveCount(0);
  });

  test('opens from the dashboard onto the default locale', async ({ page }) => {
    await enterEditMode(page);

    // The default language is Persian, so that is where editing begins.
    await expect(page).toHaveURL(/\/fa$/);
    await expect(editBar(page)).toContainText(BAR.fa);
    await expect(page.getByRole('link', { name: 'به بخش مدیریت' })).toBeVisible();

    // Managed text is marked, and marked by explicit attributes rather than by
    // matching rendered strings against content.
    const editable = page.locator('.editable');
    expect(await editable.count()).toBeGreaterThan(0);
    await expect(editable.first()).toHaveAttribute(
      'data-field',
      /^[a-z]+\.[0-9a-f-]{36}\.[a-zA-Z]+$/,
    );
  });

  test('edits German text in place and a visitor sees it', async ({ page, context }) => {
    await enterEditMode(page);
    await page.goto('/de/about');
    await expect(editBar(page)).toContainText(BAR.de);

    const stamp = Date.now().toString(36);
    const newText = `Wer wir sind ${stamp}`;

    // Click, type, blur — exactly what a member of staff would do.
    const heading = page.locator('h1.editable').first();
    await heading.click();
    await heading.fill(newText);
    await page.locator('footer').click({ position: { x: 5, y: 5 } });

    await expect(editBar(page)).toContainText(SAVED.de, { timeout: 15_000 });

    // A visitor with no session sees the change — and no editing affordances.
    const visitorContext = await context.browser()!.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto('/de/about');
    await expect(visitor.getByRole('heading', { level: 1 })).toContainText(newText);
    await expect(visitor.locator('.editable')).toHaveCount(0);
    await visitorContext.close();
  });

  test('edits the Persian side without touching the German one', async ({ page }) => {
    await enterEditMode(page);

    await page.goto('/de/about');
    const germanBefore = await page.getByRole('heading', { level: 1 }).innerText();

    await page.goto('/fa/about');
    const stamp = Date.now().toString(36);
    const persianText = `ما که هستیم ${stamp}`;

    const heading = page.locator('h1.editable').first();
    await heading.click();
    await heading.fill(persianText);
    await page.locator('footer').click({ position: { x: 5, y: 5 } });
    await expect(editBar(page)).toContainText(SAVED.fa, { timeout: 15_000 });

    // The two languages are separate rows: nothing is auto-translated, and the
    // German heading is exactly as it was.
    await page.goto('/de/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(germanBefore);
  });

  test('adds and deletes a list entry from the live page', async ({ page }) => {
    await enterEditMode(page);
    await page.goto('/de/activities');

    const cards = page.locator('ul.columns-feature > li');
    const before = await cards.count();
    expect(before).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Eintrag hinzufügen' }).last().click();
    await expect(cards).toHaveCount(before + 1, { timeout: 20_000 });

    // Adding applies to both languages at once, so the Persian page grew too.
    await page.goto('/fa/activities');
    await expect(page.locator('ul.columns-feature > li')).toHaveCount(before + 1);

    // Delete it again, confirming as the toolbar requires.
    await page.goto('/de/activities');
    const toolbar = page.locator('ul.columns-feature > li').last().locator('.editable-toolbar');
    await toolbar.getByRole('button', { name: 'Eintrag löschen' }).click();
    await toolbar.getByRole('button', { name: /Wirklich löschen/ }).click();
    await expect(page.locator('ul.columns-feature > li')).toHaveCount(before, { timeout: 20_000 });
  });

  test('leaves edit mode cleanly', async ({ page }) => {
    await enterEditMode(page);

    await page.getByRole('button', { name: 'پایان' }).click();
    await expect(editBar(page)).toBeHidden({ timeout: 20_000 });
    await expect(page.locator('.editable')).toHaveCount(0);
  });
});
