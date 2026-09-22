import { test, expect } from '@playwright/test';
import { login, ensureEditor, ADMIN_EMAIL, EDITOR_EMAIL, EDITOR_PASSWORD } from './helpers';

/** The admin's toast region — the one place an outcome is announced. */
function toast(page: import('@playwright/test').Page) {
  return page.getByRole('status').filter({ hasText: /./ });
}

test.describe('admin authentication', () => {
  test('sends an anonymous visitor to the login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?from=%2Fadmin/);
  });

  test('refuses a wrong password without saying which part was wrong', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill(ADMIN_EMAIL);
    await page.getByLabel('Passwort').fill('definitiv-das-falsche-passwort');
    await page.getByRole('button', { name: 'Anmelden' }).click();

    await expect(page.getByText('E-Mail-Adresse oder Passwort stimmen nicht.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs a staff member in and out', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: /Guten Tag/ })).toBeVisible();

    await page.getByRole('button', { name: 'Abmelden' }).click();
    await page.waitForURL('**/login', { timeout: 20_000 });

    // The session is really gone, not merely navigated away from.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('admin dashboard', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('groups the area tiles and reaches every admin page', async ({ page }) => {
    for (const group of ['Website', 'Startseite', 'Programm', 'Verein']) {
      await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
    }

    for (const [label, url] of [
      ['Medien', /\/admin\/media/],
      ['Posteingang', /\/admin\/submissions/],
      ['Einstellungen', /\/admin\/settings/],
      ['Sicherung', /\/admin\/backup/],
      ['Protokoll', /\/admin\/audit/],
      ['Benutzer', /\/admin\/users/],
    ] as const) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test('searches across all content in both languages', async ({ page }) => {
    const search = page.getByLabel('Alle Inhalte durchsuchen');

    await search.fill('Volleyball');
    await expect(page.getByText(/Treffer/)).toBeVisible();
    await expect(page.getByRole('link').filter({ hasText: 'Volleyball' }).first()).toBeVisible();

    // The same entry, found by its Persian text.
    await search.fill('والیبال');
    await expect(page.getByRole('link').filter({ hasText: 'والیبال' }).first()).toBeVisible();
  });
});

test.describe('bilingual content editing', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('edits a field in both languages and shows it on the live site', async ({ page }) => {
    const stamp = Date.now().toString(36);
    const germanTitle = `Volleyball Frauen ${stamp}`;
    const persianTitle = `والیبال زنان ${stamp}`;

    await page.goto('/admin/content/sports');

    // Both languages are shown side by side by default.
    await expect(page.getByRole('button', { name: 'Beide Sprachen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const germanInputs = page.locator('input[lang="de"]');
    const persianInputs = page.locator('input[lang="fa"]');
    await expect(persianInputs.first()).toHaveAttribute('dir', 'rtl');

    await germanInputs.first().fill(germanTitle);
    await persianInputs.first().fill(persianTitle);

    // The save bar appears only once something has actually changed.
    const saveBar = page.getByRole('region', { name: 'Ungespeicherte Änderungen' });
    await expect(saveBar).toBeVisible();
    await saveBar.getByRole('button', { name: 'Speichern' }).click();
    await expect(toast(page)).toContainText(/gespeichert/);

    // …and disappears once there is nothing left to save.
    await expect(saveBar).toBeHidden();

    // Both locales of the public site now carry the new text.
    await page.goto('/de/sport');
    await expect(page.getByText(germanTitle)).toBeVisible();

    await page.goto('/fa/sport');
    await expect(page.getByText(persianTitle)).toBeVisible();
  });

  test('discards unsaved changes on request', async ({ page }) => {
    await page.goto('/admin/content/values');
    const first = page.locator('input[lang="de"]').first();
    const original = await first.inputValue();

    await first.fill('Ein Text, der nie gespeichert wird');
    const saveBar = page.getByRole('region', { name: 'Ungespeicherte Änderungen' });
    await expect(saveBar).toBeVisible();

    await saveBar.getByRole('button', { name: 'Verwerfen' }).click();
    await expect(saveBar).toBeHidden();
    await expect(first).toHaveValue(original);
  });

  test('saves with Ctrl+S', async ({ page }) => {
    await page.goto('/admin/content/values');
    const stamp = Date.now().toString(36);
    await page.locator('input[lang="de"]').first().fill(`Offene Tür ${stamp}`);

    await page.keyboard.press('Control+s');
    await expect(toast(page)).toContainText(/gespeichert/, { timeout: 15_000 });
  });

  test('switches the language view', async ({ page }) => {
    await page.goto('/admin/content/culture');

    await page.getByRole('button', { name: 'Nur Deutsch' }).click();
    await expect(page.locator('input[lang="fa"]')).toHaveCount(0);
    await expect(page.locator('input[lang="de"]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Nur فارسی' }).click();
    await expect(page.locator('input[lang="de"]')).toHaveCount(0);
    await expect(page.locator('input[lang="fa"]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Beide Sprachen' }).click();
    await expect(page.locator('input[lang="de"]').first()).toBeVisible();
    await expect(page.locator('input[lang="fa"]').first()).toBeVisible();
  });

  test('adds, duplicates and deletes an entry in both languages at once', async ({ page }) => {
    await page.goto('/admin/content/culture');
    const entries = page.locator('ul > li > .card');
    const before = await entries.count();

    // Add — the new row exists in both languages from the moment it is made.
    await page.getByRole('button', { name: 'Neuer Eintrag' }).click();
    await expect(toast(page)).toContainText('Eintrag angelegt.');
    await expect(entries).toHaveCount(before + 1);

    const stamp = Date.now().toString(36);
    const last = entries.last();
    await last.locator('input[lang="de"]').first().fill(`Testkarte ${stamp}`);
    await last.locator('input[lang="fa"]').first().fill(`کارت آزمایشی ${stamp}`);
    await page
      .getByRole('region', { name: 'Ungespeicherte Änderungen' })
      .getByRole('button', { name: 'Speichern' })
      .click();
    await expect(toast(page)).toContainText(/gespeichert/);

    // Duplicate.
    await entries.last().getByRole('button', { name: 'Duplizieren' }).click();
    await expect(toast(page)).toContainText('Eintrag dupliziert.');
    await expect(entries).toHaveCount(before + 2);

    // Delete both, confirming each time.
    for (let i = 0; i < 2; i += 1) {
      await entries.last().getByRole('button', { name: 'Löschen' }).click();
      await entries.last().getByRole('button', { name: 'Wirklich löschen?' }).click();
      await expect(toast(page)).toContainText('Eintrag gelöscht.');
    }
    await expect(entries).toHaveCount(before);
  });

  test('reorders entries', async ({ page }) => {
    await page.goto('/admin/content/values');
    const headings = page.locator('ul > li > .card button[aria-expanded] span');

    const firstBefore = await headings.first().innerText();
    const secondBefore = await headings.nth(1).innerText();

    await page
      .locator('ul > li > .card')
      .first()
      .getByRole('button', { name: 'Nach unten' })
      .click();
    await expect(toast(page)).toContainText('Reihenfolge geändert.');

    await expect(headings.first()).toHaveText(secondBefore);
    await expect(headings.nth(1)).toHaveText(firstBefore);

    // Put it back, so the suite can run twice.
    await page
      .locator('ul > li > .card')
      .first()
      .getByRole('button', { name: 'Nach unten' })
      .click();
    await expect(toast(page)).toContainText('Reihenfolge geändert.');
  });
});

test.describe('admin settings and inbox', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('saves a setting and shows it on the site', async ({ page }) => {
    const phone = `+43 1 ${Date.now().toString().slice(-6)}`;

    await page.goto('/admin/settings');
    await page.getByLabel('Telefon').fill(phone);
    await page
      .getByRole('region', { name: 'Ungespeicherte Änderungen' })
      .getByRole('button', { name: 'Speichern' })
      .click();
    await expect(toast(page)).toContainText('Einstellungen gespeichert.');

    // The number appears in the contact block and again in the footer — both
    // read it from settings, so both must have picked up the change.
    await page.goto('/de/contact');
    await expect(page.getByText(phone).first()).toBeVisible();
    expect(await page.getByText(phone).count()).toBeGreaterThanOrEqual(2);
  });

  test('rejects an IBAN that is not shaped like one', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByLabel('IBAN').fill('12345');
    await page
      .getByRole('region', { name: 'Ungespeicherte Änderungen' })
      .getByRole('button', { name: 'Speichern' })
      .click();
    // Reported twice on purpose: inline next to the field, and in the toast.
    await expect(page.locator('.field-error')).toContainText(/IBAN sieht nicht richtig aus/);
    await expect(toast(page)).toContainText(/IBAN sieht nicht richtig aus/);
  });

  test('shows the inbox and its filters', async ({ page }) => {
    await page.goto('/admin/submissions');
    await expect(page.getByRole('heading', { name: 'Posteingang' })).toBeVisible();
    for (const filter of ['Alle', 'Neu', 'Gelesen', 'Archiviert']) {
      await expect(page.getByRole('button', { name: filter, exact: true })).toBeVisible();
    }
  });

  test('records every change in the audit log', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: 'Protokoll' })).toBeVisible();
    // The edits made above must be in here.
    await expect(page.getByText('Redaktion').first()).toBeVisible();
  });

  test('exports a backup an admin can download', async ({ page }) => {
    await page.goto('/admin/backup');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Sicherung herunterladen' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^inhalte-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

test.describe('role boundaries', () => {
  test.beforeEach(async ({ page }) => ensureEditor(page));

  test('an editor is told why, not handed a server error', async ({ page }) => {
    await login(page, EDITOR_EMAIL, EDITOR_PASSWORD);

    // The area is refused — but as an explanation a non-technical member of
    // staff can act on, not as a 500.
    const response = await page.goto('/admin/users');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Keine Berechtigung' })).toBeVisible();
    await expect(page.getByText(/nur Administratorinnen und Administratoren/)).toBeVisible();
  });

  test('an editor is not offered what they cannot do', async ({ page }) => {
    await login(page, EDITOR_EMAIL, EDITOR_PASSWORD);

    // No link to user management anywhere in the chrome.
    await expect(page.getByRole('link', { name: 'Benutzer', exact: true })).toHaveCount(0);

    // Backup: download is offered, restore is not.
    await page.goto('/admin/backup');
    await expect(page.getByRole('button', { name: /Sicherung herunterladen/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Datei auswählen' })).toHaveCount(0);
    await expect(page.getByText(/Nur Administratoren/)).toBeVisible();
  });

  test('an editor can still do the whole content job', async ({ page }) => {
    await login(page, EDITOR_EMAIL, EDITOR_PASSWORD);

    // The role exists to restrict user management and restores — not content.
    for (const path of [
      '/admin/content/courses',
      '/admin/media',
      '/admin/submissions',
      '/admin/settings',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }

    const stamp = Date.now().toString(36);
    await page.goto('/admin/content/values');
    await page.locator('input[lang="de"]').first().fill(`Offene Tür ${stamp}`);
    await page
      .getByRole('region', { name: 'Ungespeicherte Änderungen' })
      .getByRole('button', { name: 'Speichern' })
      .click();
    await expect(toast(page)).toContainText(/gespeichert/);
  });
});
