import { test, expect, type Page } from '@playwright/test';
import { login, EDITOR_EMAIL, EDITOR_PASSWORD } from './helpers';

/** The admin's toast region — the one place an outcome is announced. */
function toast(page: Page) {
  return page.getByRole('status').filter({ hasText: /./ });
}

async function save(page: Page) {
  await page
    .getByRole('region', { name: 'Ungespeicherte Änderungen' })
    .getByRole('button', { name: 'Speichern' })
    .click();
}

test.describe('events in the admin', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('keeps a start time in Vienna time through a save', async ({ page }) => {
    await page.goto('/admin/content/events');
    const entry = page.locator('li[id^="event-"]').first();
    const id = await entry.getAttribute('id');
    const start = page.locator(`li[id="${id}"]`).getByLabel('Beginn');
    const original = await start.inputValue();

    // Whatever zone the server runs in, what was typed is what comes back.
    await start.fill('2027-01-15T18:30');
    await save(page);
    await expect(toast(page)).toContainText(/gespeichert/);
    await page.reload();
    await expect(page.locator(`li[id="${id}"]`).getByLabel('Beginn')).toHaveValue(
      '2027-01-15T18:30',
    );

    await page.locator(`li[id="${id}"]`).getByLabel('Beginn').fill(original);
    await save(page);
    await expect(toast(page)).toContainText(/gespeichert/);
  });

  test('adds, fills and removes a programme item', async ({ page }) => {
    await page.goto('/admin/content/events');
    const id = await page.locator('li[id^="event-"]').first().getAttribute('id');
    const entry = () => page.locator(`li[id="${id}"]`);
    const programme = () => entry().getByRole('region', { name: 'Programm' });
    const before = await programme().getByRole('listitem').count();

    await programme().getByRole('button', { name: 'Programmpunkt hinzufügen' }).click();
    await expect(toast(page)).toContainText('Eintrag angelegt.');
    await expect(programme().getByRole('listitem')).toHaveCount(before + 1);

    const stamp = Date.now().toString(36);
    const item = programme().getByRole('listitem').last();
    await item.locator('input[lang="de"]').first().fill('19:00');
    await item.locator('input[lang="de"]').nth(1).fill(`Gemeinsames Essen ${stamp}`);
    await item.locator('input[lang="fa"]').nth(1).fill(`شام مشترک ${stamp}`);
    await save(page);
    await expect(toast(page)).toContainText(/gespeichert/);

    await page.reload();
    await expect(
      programme().getByRole('listitem').last().locator('input[lang="de"]').nth(1),
    ).toHaveValue(`Gemeinsames Essen ${stamp}`);

    await programme()
      .getByRole('listitem')
      .last()
      .getByRole('button', { name: 'Programmpunkt entfernen' })
      .click();
    await expect(toast(page)).toContainText('Eintrag gelöscht.');
    await expect(programme().getByRole('listitem')).toHaveCount(before);
  });

  test('offers the media library as the event image', async ({ page }) => {
    await page.goto('/admin/content/events');
    const picker = page.locator('li[id^="event-"]').first().getByLabel('Bild');
    await expect(picker).toBeVisible();
    await expect(picker.locator('option').first()).toHaveText('— kein Bild —');
  });
});

test.describe('opening hours', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('closes a day in the settings and shows it on the site', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByLabel('Samstag: Status').selectOption('closed');
    await expect(page.getByLabel('Samstag: geöffnet ab')).toBeDisabled();
    await save(page);
    await expect(toast(page)).toContainText('Einstellungen gespeichert.');

    await page.goto('/de/contact');
    const saturday = page.locator('.contact-hours .contact-dl-row').filter({ hasText: 'Samstag' });
    await expect(saturday).toContainText('geschlossen');

    // Back to the hours every other test expects.
    await page.goto('/admin/settings');
    await page.getByLabel('Samstag: Status').selectOption('open');
    await page.getByLabel('Samstag: geöffnet ab').fill('10:00');
    await page.getByLabel('Samstag: geöffnet bis').fill('18:00');
    await save(page);
    await expect(toast(page)).toContainText('Einstellungen gespeichert.');
    await page.goto('/de/contact');
    await expect(
      page.locator('.contact-hours .contact-dl-row').filter({ hasText: 'Samstag' }),
    ).not.toContainText('geschlossen');
  });

  test('refuses hours that end before they begin', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByLabel('Montag: geöffnet ab').fill('20:00');
    await page.getByLabel('Montag: geöffnet bis').fill('16:00');
    await save(page);
    await expect(page.locator('.field-error')).toContainText(/Ende der Öffnungszeit/);
  });
});

test.describe('own account', () => {
  test('any user can change their own name and password', async ({ page }) => {
    await login(page, EDITOR_EMAIL, EDITOR_PASSWORD);
    await page.getByRole('link', { name: 'Test Redakteur' }).click();
    await expect(page).toHaveURL(/\/admin\/account/);
    await expect(page.getByRole('heading', { name: 'Mein Konto' })).toBeVisible();

    // A wrong current password is refused.
    await page.getByLabel('Bisheriges Passwort').fill('nicht-das-passwort');
    await page.getByLabel('Neues Passwort', { exact: true }).fill('ein-neues-langes-passwort');
    await page.getByLabel('Neues Passwort wiederholen').fill('ein-neues-langes-passwort');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.locator('.field-error[role="alert"]')).toContainText(
      'bisherige Passwort stimmt nicht',
    );

    // The right one changes it; the new password signs in.
    await page.getByLabel('Bisheriges Passwort').fill(EDITOR_PASSWORD);
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(toast(page)).toContainText('Name und Passwort gespeichert.');

    await page.getByRole('button', { name: 'Abmelden' }).click();
    await page.waitForURL('**/login', { timeout: 20_000 });
    await login(page, EDITOR_EMAIL, 'ein-neues-langes-passwort');

    // A new name shows in the header at once, not at the next sign-in.
    await page.goto('/admin/account');
    await page.getByLabel('Name').fill('Test Redakteurin');
    await page.getByLabel('Bisheriges Passwort').fill('ein-neues-langes-passwort');
    await page.getByLabel('Neues Passwort', { exact: true }).fill(EDITOR_PASSWORD);
    await page.getByLabel('Neues Passwort wiederholen').fill(EDITOR_PASSWORD);
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(toast(page)).toContainText('Name und Passwort gespeichert.');
    await expect(page.getByRole('link', { name: 'Test Redakteurin' })).toBeVisible();

    await page.getByLabel('Name').fill('Test Redakteur');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('link', { name: 'Test Redakteur', exact: true })).toBeVisible();
  });
});
