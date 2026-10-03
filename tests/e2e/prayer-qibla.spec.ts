import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('prayer times', () => {
  test('shows seven times, a next prayer and both calendars', async ({ page }) => {
    await page.goto('/de/prayer');

    for (const name of ['Fadschr', 'Sonnenaufgang', 'Dhuhr', 'Asr', 'Maghrib', 'Ischa']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    // The next prayer is highlighted and counts down.
    await expect(page.getByText('Nächstes Gebet')).toBeVisible();
    const countdown = page.locator('[aria-label="Verbleibende Zeit bis zum nächsten Gebet"]');
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText(/\d/, { timeout: 15_000 });

    // Both calendars, side by side.
    await expect(page.getByText('Legende')).toBeVisible();
    await expect(page.getByText('Heute', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Gedenktag', { exact: true })).toBeVisible();
  });

  test('moves the month without reloading the page', async ({ page }) => {
    await page.goto('/de/prayer');

    // A month is a change of view, not of page: the calendar builds the new
    // month in the browser. Mark the document, and the mark has to survive.
    await page.evaluate(() => {
      document.documentElement.dataset.marker = 'original';
    });
    // The month grid's own table: the month's prayer timetable under it is a
    // second table on the page.
    const heading = page.locator('table.cal-grid').locator('xpath=preceding::h2[1]');
    const first = await heading.textContent();

    await page.getByRole('button', { name: 'Nächster Monat' }).click();
    await expect(page).toHaveURL(/[?&]m=\d+/);
    await expect(heading).not.toHaveText(first ?? '');

    await page.getByRole('button', { name: 'Vorheriger Monat' }).click();
    await expect(heading).toHaveText(first ?? '');

    // Back where we started, so the query goes away again.
    await expect(page).toHaveURL(/\/de\/prayer$/);
    expect(await page.evaluate(() => document.documentElement.dataset.marker)).toBe('original');
  });

  test('a month linked directly still renders on the server', async ({ page }) => {
    // The month has to survive being shared, bookmarked or reloaded, and it
    // has to be in the first paint rather than appearing after hydration.
    await page.goto('/de/prayer?y=2026&m=3');
    // Twice: the grid's heading and the timetable's both name the month.
    await expect(page.getByRole('heading', { name: /März 2026/ })).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /März 2026/ }).first()).toBeVisible();
  });

  test('lists the occasions for the month, or says there are none', async ({ page }) => {
    await page.goto('/de/prayer');
    await expect(page.getByText('Gedenktage in diesem Monat')).toBeVisible();
  });

  test('falls back to this month for junk in ?y= and ?m=', async ({ page }) => {
    for (const query of [
      '?y=abc',
      '?m=99',
      '?m=0',
      '?m=-1',
      '?y=99999999999999999999&m=-5',
      '?y=&m=',
      '?m=1.5',
      '?y[]=1&m[]=2',
    ]) {
      const response = await page.goto(`/de/prayer${query}`);
      expect(response?.status(), `/de/prayer${query}`).toBe(200);
      await expect(page.getByText('Legende')).toBeVisible();
    }
  });

  test('puts a commemoration on the Gregorian day its Hijri date falls on', async ({ page }) => {
    // 13 Rajab 1448 — Imam Ali's birthday — is 23 December 2026: Wednesday
    // the 2nd of Dey 1405, as the Iranian calendar has it and as this site
    // reckons (`lib/hijri-iran`). Umm al-Qura, which ICU ships and which
    // this page used to read, puts it on the 22nd; that is the error, not
    // the fixture.
    await page.goto('/de/prayer?y=2026&m=12');
    const cell = page
      .locator('table.cal-grid')
      .getByRole('cell')
      .filter({ hasText: 'Geburtstag Imam Alis' })
      .first();
    await expect(cell).toContainText('23');
    // …and the Hijri day number printed beneath it.
    await expect(cell).toContainText('13');
  });

  test('shows the first and last day of a month, and a leap day', async ({ page }) => {
    await page.goto('/de/prayer?y=2024&m=2');
    const days = page.locator('table.cal-grid tbody td').filter({ hasText: /\d/ });
    await expect(days).toHaveCount(29);
    await expect(days.first()).toContainText('1');
    await expect(days.last()).toContainText('29');
  });
});

/**
 * The qibla page: one stage with three tabs, and the figures beside it.
 *
 * What the page promises, in order of how much it needs from the visitor:
 * the computed direction, which is always right and asks for nothing; their
 * own position, if they offer it; and a live heading, if the device has a
 * magnetometer. Each of the three is checked here, and so is what the page
 * says when one of them is not available.
 */
test.describe('the qibla', () => {
  /** A device whose orientation sensor exists and has been allowed. */
  const withSensor = (page: import('@playwright/test').Page) =>
    page.addInitScript(() => {
      const existing = (
        window as unknown as {
          DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
        }
      ).DeviceOrientationEvent;

      // A browser that gates the sensor behind a permission refuses it on a
      // headless runner, and the page then correctly reports the compass as
      // denied and never subscribes — leaving nothing to test. Granting it
      // stands in for the visitor tapping "allow".
      if (existing) {
        if (typeof existing.requestPermission === 'function') {
          Object.defineProperty(existing, 'requestPermission', {
            configurable: true,
            writable: true,
            value: () => Promise.resolve('granted'),
          });
        }
        return;
      }

      // And a browser with no orientation API at all gets one, because a
      // desktop browser is not the device this feature is for.
      class PolyfilledDeviceOrientationEvent extends Event {
        readonly alpha: number | null;
        readonly beta: number | null;
        readonly gamma: number | null;
        readonly absolute: boolean;
        constructor(type: string, init: DeviceOrientationEventInit = {}) {
          super(type, init);
          this.alpha = init.alpha ?? null;
          this.beta = init.beta ?? null;
          this.gamma = init.gamma ?? null;
          this.absolute = init.absolute ?? false;
        }
      }
      Object.defineProperty(window, 'DeviceOrientationEvent', {
        configurable: true,
        writable: true,
        value: PolyfilledDeviceOrientationEvent,
      });
    });

  /** One olive pixel, so the tile layer reports success without the network. */
  const stubTiles = (page: import('@playwright/test').Page) =>
    page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      }),
    );

  test('shows the computed direction from the association house', async ({ page }) => {
    await page.goto('/de/qibla');

    // 136.7° and about 3 637 km: the great-circle qibla from Hernals. It
    // needs no permission and no sensor, so it is on the page from the start.
    await expect(page.locator('.qibla-figure-value').first()).toHaveText('136,7°');
    await expect(page.locator('.qibla-figure-value').nth(1)).toHaveText(/3\s?637/);
    await expect(page.locator('.qibla-origin')).toContainText('Vereinshaus');
    await expect(page.locator('.qibla-deg')).toHaveText('136,7°');
  });

  test('opens on where the reader is, not on the house', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    // Graz: far enough from Vienna that the bearing is visibly different.
    await context.setGeolocation({ latitude: 47.0707, longitude: 15.4395 });
    await page.goto('/de/qibla');

    await expect(page.locator('.qibla-origin')).toContainText('Ihrem Standort');
    await expect(page.locator('.qibla-figure-value').first()).not.toHaveText('136,7°');
    await expect(page.getByRole('button', { name: 'Mein Standort' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('falls back to the house when the location is refused, and says so', async ({ page }) => {
    // Refused outright, rather than left to a headless runner's own
    // behaviour: cleared permissions there neither grant nor deny, so the
    // page sits in "locating" and the test would be measuring the timeout.
    await page.addInitScript(() => {
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
        configurable: true,
        value: (_ok: PositionCallback, fail?: PositionErrorCallback) =>
          fail?.({
            code: 1,
            message: 'denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError),
      });
    });
    await page.goto('/de/qibla');

    // The direction is still the house's, and the page says why.
    await expect(page.locator('.qibla-figure-value').first()).toHaveText('136,7°');
    await expect(page.locator('.qibla-geo-note')).toBeVisible();
    await expect(page.locator('.qibla-origin')).toContainText('Vereinshaus');
  });

  test('recomputes from a granted location and returns to the house', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 47.0707, longitude: 15.4395 });
    await page.goto('/de/qibla');
    await expect(page.locator('.qibla-origin')).toContainText('Ihrem Standort');

    await page.getByRole('button', { name: 'Vereinshaus' }).click();
    await expect(page.locator('.qibla-figure-value').first()).toHaveText('136,7°');
    await expect(page.locator('.qibla-origin')).toContainText('Vereinshaus');
  });

  test('states plainly when the compass is unavailable', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();

    // Three outcomes are legitimate and none of them is silent: a browser
    // that hands over the sensor swaps the button for live turn
    // instructions; one without the API, or one that gates it and refuses,
    // says so in the status under the dial or in the hint. What must never
    // happen is nothing at all.
    const active = page.locator('.qibla-status[data-live="yes"]');
    const noSensor = page.getByText('Kein Kompass-Sensor');
    const denied = page.getByText('Ohne Freigabe kann der Kompass nicht gelesen werden');
    await expect(active.or(noSensor).or(denied).first()).toBeVisible({ timeout: 10_000 });
  });

  test('turns the rose only on an absolute heading', async ({ page }) => {
    await withSensor(page);
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();
    await expect(page.locator('.qibla-status[data-live="yes"]')).toBeVisible();

    // The rose is the group inside the dial; the needle turns within it.
    const rose = page.locator('.qibla-svg > g').first();
    const rotation = async () =>
      (await rose.getAttribute('style'))?.match(/rotate\((-?[\d.]+)deg\)/)?.[1];

    const observe = async (type: string, alpha: number, absolute: boolean) =>
      page
        .evaluate(
          ({ type, alpha, absolute }) => {
            let reachedAListener = false;
            const probe = () => {
              reachedAListener = true;
            };
            window.addEventListener(type, probe, true);
            window.dispatchEvent(new DeviceOrientationEvent(type, { alpha, absolute }));
            window.removeEventListener(type, probe, true);
            return { reachedAListener };
          },
          { type, alpha, absolute },
        )
        .then(async (seen) => ({ ...seen, rotation: await rotation() }));

    // An absolute reading is a real compass heading: the rose counter-rotates.
    // The dispatch happens *inside* the poll on purpose — the listener is
    // attached by an effect, so firing once and then polling races it.
    await expect
      .poll(() => observe('deviceorientationabsolute', 90, true))
      .toMatchObject({ reachedAListener: true, rotation: '-270' });

    // Chrome on Android also fires a *relative* `deviceorientation`, whose
    // alpha is zeroed wherever the device happened to be pointing. Acting on
    // it would swing the rose to an arbitrary bearing.
    await observe('deviceorientation', 200, false);
    await page.waitForTimeout(300);
    expect(await rotation()).toBe('-270');
  });

  test('says which way to turn once the compass is live', async ({ page }) => {
    await withSensor(page);
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();
    await expect(page.locator('.qibla-status[data-live="yes"]')).toBeVisible();

    const status = page.locator('.qibla-status');
    // Facing north, with the qibla at 136.7°, the shorter way round is right.
    await expect
      .poll(async () => {
        await page.evaluate(() =>
          window.dispatchEvent(
            new DeviceOrientationEvent('deviceorientationabsolute', { alpha: 360, absolute: true }),
          ),
        );
        return status.textContent();
      })
      .toMatch(/Nach rechts drehen/);

    // And turned to the bearing itself, it says so and goes gold.
    await expect
      .poll(async () => {
        await page.evaluate(() =>
          window.dispatchEvent(
            new DeviceOrientationEvent('deviceorientationabsolute', {
              alpha: 360 - 136.7,
              absolute: true,
            }),
          ),
        );
        return status.textContent();
      })
      .toMatch(/Sie blicken zur Qibla/);
    await expect(status).toHaveAttribute('data-facing', 'yes');
  });

  test('moves between the three tabs, by pointer and by arrow key', async ({ page }) => {
    await page.goto('/de/qibla');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#qibla-panel-compass')).toBeVisible();

    await page.getByRole('tab', { name: 'Anleitung' }).click();
    await expect(page.locator('#qibla-panel-guide')).toBeVisible();
    await expect(page.locator('#qibla-panel-compass')).toBeHidden();
    // Three steps and the note about how the direction is worked out.
    await expect(page.locator('.qibla-step')).toHaveCount(3);

    // The choice is kept in the address, so a tab can be linked to.
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#guide');

    // And the arrows move along the row, as a tablist is expected to.
    await page.locator('#qibla-tab-guide').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#qibla-panel-compass')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#qibla-panel-guide')).toBeVisible();
  });

  test('lets the guide be read from its first step to its last', async ({ page }) => {
    // The guide is centred in the stage, and on a phone it is taller than
    // the stage. A flex column centred with `justify-content` puts half of
    // that overflow *above* the scroll origin, where `scrollTop` is already
    // zero: no scrolling, no keyboard and no scrollbar can reach it, and
    // the first step simply is not readable. Auto margins centre without
    // that. Both ends are checked, because the fix for one end is the kind
    // that loses the other.
    for (const [width, height] of [
      [360, 740],
      [375, 667],
      [412, 915],
      [924, 539],
      [1440, 900],
    ] as const) {
      for (const locale of ['de', 'fa'] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`/${locale}/qibla#guide`);
        await expect(page.locator('.qibla-panel-guide')).toBeVisible();

        const reach = await page.evaluate(() => {
          const panel = document.querySelector('.qibla-panel-guide')!;
          const first = document.querySelector('.qibla-step')!;
          const last = document.querySelector('.qibla-method')!;
          panel.scrollTop = 0;
          const top = first.getBoundingClientRect().top - panel.getBoundingClientRect().top;
          panel.scrollTop = panel.scrollHeight;
          const bottom = last.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom;
          return { top: Math.round(top), bottom: Math.round(bottom) };
        });
        const where = `${locale} ${width}x${height}`;
        expect(reach.top, `first step above the guide at ${where}`).toBeGreaterThanOrEqual(-1);
        expect(reach.bottom, `last line below the guide at ${where}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('opens the tab the address asks for', async ({ page }) => {
    await page.goto('/de/qibla#guide');
    await expect(page.locator('#qibla-panel-guide')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Anleitung' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('asks the tile server for nothing until the map tab is opened', async ({ page }) => {
    const tiles: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('tile.openstreetmap.org')) tiles.push(request.url());
    });
    await stubTiles(page);
    await page.goto('/de/qibla');
    await expect(page.locator('.qibla-dial')).toBeVisible();
    await page.waitForTimeout(600);
    expect(tiles, 'no tile is fetched while the compass is showing').toEqual([]);

    await page.getByRole('tab', { name: 'Karte' }).click();
    await expect.poll(() => tiles.length).toBeGreaterThan(0);
  });

  test('draws the street, then the whole way to Mecca', async ({ page }) => {
    await stubTiles(page);
    await page.goto('/de/qibla');
    await page.getByRole('tab', { name: 'Karte' }).click();
    await expect(page.locator('.qibla-street')).toBeVisible();

    // Close in, the straight ray out of the reader's feet is the honest
    // drawing: Mercator preserves angles at a point.
    await expect(page.locator('.qibla-route')).toHaveCount(0);

    await page.getByRole('button', { name: 'Bis Mekka' }).click();
    // Wide, it is not, and the great circle is drawn instead — never both.
    await expect(page.locator('.qibla-route')).toHaveCount(1);
    await expect(page.locator('#qibla-street-ray')).toHaveCount(0);

    await page.getByRole('button', { name: 'Straße', exact: true }).click();
    await expect(page.locator('.qibla-route')).toHaveCount(0);
  });

  test('keeps the map\u2019s furniture out of its own way, in both languages', async ({ page }) => {
    // Everything on the map floats over it, and the map is a hand across on
    // a phone. Two of these pieces take physical corners rather than logical
    // ones, because the map itself is never mirrored: Persian used to put
    // the zoom control on top of the north rose, and stretch the credit
    // across the whole width and under the buttons.
    await stubTiles(page);
    for (const [width, height] of [
      // 360 is where two Persian labels and the credit first stopped
      // fitting on one line, and it is the commonest Android width.
      [360, 740],
      [375, 667],
      [412, 915],
      [768, 1024],
      [1440, 900],
    ] as const) {
      for (const locale of ['de', 'fa'] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`/${locale}/qibla#map`);
        await expect(page.locator('.qibla-street')).toBeVisible();

        const clashes = await page.evaluate(() => {
          const names = [
            '.qibla-street-rose',
            '.reader-size',
            '.qibla-map-controls > button',
            '.qibla-street-who',
            '.qibla-span',
            '.qibla-attribution',
          ];
          const boxes = names
            .map((name) => {
              const el = document.querySelector(name);
              if (!el || getComputedStyle(el).display === 'none') return null;
              return { name, box: el.getBoundingClientRect() };
            })
            .filter((x): x is { name: string; box: DOMRect } => x !== null);

          const panel = document.querySelector('.qibla-panel-map')!.getBoundingClientRect();
          const out: string[] = [];
          for (let i = 0; i < boxes.length; i += 1) {
            const a = boxes[i]!;
            if (
              a.box.right > panel.right + 1 ||
              a.box.left < panel.left - 1 ||
              a.box.bottom > panel.bottom + 1 ||
              a.box.top < panel.top - 1
            )
              out.push(`${a.name} outside the map`);
            for (let j = i + 1; j < boxes.length; j += 1) {
              const b = boxes[j]!;
              if (
                a.box.left < b.box.right - 1 &&
                b.box.left < a.box.right - 1 &&
                a.box.top < b.box.bottom - 1 &&
                b.box.top < a.box.bottom - 1
              )
                out.push(`${a.name} over ${b.name}`);
            }
          }
          return out;
        });
        expect(clashes, `${locale} ${width}x${height}`).toEqual([]);

        // And the two spans stay side by side: stacked, they read as a
        // control that has come apart rather than a pair.
        const rows = await page.evaluate(
          () =>
            new Set(
              [...document.querySelectorAll('.qibla-span-btn')].map((e) =>
                Math.round(e.getBoundingClientRect().top),
              ),
            ).size,
        );
        expect(rows, `span buttons wrapped at ${locale} ${width}x${height}`).toBe(1);

        // On a phone the controls are a row along the top at a reduced
        // size. Measured rather than assumed: these overrides sit on bases
        // that set a `min-block-size` floor and are declared further down
        // the file, and a rule that loses either way is silently dead —
        // which is how the map came to carry full-size furniture.
        if (width < 500) {
          const sizes = await page.evaluate(() => {
            const h = (s: string) => {
              const el = document.querySelector(s);
              return el ? Math.round(el.getBoundingClientRect().height) : 0;
            };
            return {
              controlRow: h('.qibla-map-controls'),
              zoom: h('.reader-size'),
              recentre: h('.qibla-map-controls > button'),
              rose: h('.qibla-street-rose'),
              span: h('.qibla-span-btn'),
            };
          });
          expect(sizes, `control sizes at ${locale} ${width}`).toEqual({
            controlRow: 34,
            zoom: 34,
            recentre: 34,
            rose: 38,
            span: 34,
          });
        }
      }
    }
  });

  test('says so and draws it itself when the tiles cannot be had', async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto('/de/qibla');
    await page.getByRole('tab', { name: 'Karte' }).click();
    // The direction does not depend on anybody else's server.
    await expect(page.getByText('konnte nicht geladen werden')).toBeVisible();
    await expect(page.locator('.qibla-map-svg')).toBeVisible();
  });

  test('puts the stage and the figures on one screen, in both languages', async ({ page }) => {
    for (const [width, height] of [
      [375, 667],
      [768, 1024],
      [924, 539],
      [1440, 900],
    ] as const) {
      for (const locale of ['de', 'fa'] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`/${locale}/qibla`);
        await expect(page.locator('.qibla-stage')).toBeVisible();

        const fit = await page.evaluate(() => {
          const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
          const stage = box('.qibla-stage');
          return {
            stageBottom: stage.bottom,
            factsBottom: box('.qibla-figures').bottom,
            sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const where = `${locale} ${width}x${height}`;
        // The instrument is on the first screen everywhere.
        expect(fit.stageBottom, `stage at ${where}`).toBeLessThanOrEqual(height + 1);
        // And where there is room beside it, so are the figures.
        if (width >= 900) {
          expect(fit.factsBottom, `figures at ${where}`).toBeLessThanOrEqual(height + 1);
        }
        // Nothing is ever cut off at the edge.
        expect(fit.sideways, `sideways scroll at ${where}`).toBe(0);
      }
    }
  });

  test('has no axe violations, on each of the three tabs', async ({ page }) => {
    await stubTiles(page);
    await page.goto('/de/qibla');
    const audit = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
    const say = (r: Awaited<ReturnType<typeof audit>>) =>
      r.violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n');

    for (const name of ['Kompass', 'Karte', 'Anleitung']) {
      await page.getByRole('tab', { name }).click();
      await page.waitForTimeout(400);
      const result = await audit();
      expect(result.violations, `${name}\n${say(result)}`).toEqual([]);
    }
  });
});

test.describe('gallery', () => {
  test('shows the empty state before any image is uploaded', async ({ page }) => {
    await page.goto('/de/gallery');
    // The seed ships no images, so the page must say so rather than render a
    // broken grid.
    await expect(
      page.getByText('In dieser Kategorie sind noch keine Bilder vorhanden.'),
    ).toBeVisible();
    // The filter row is still offered, so an editor can tell the page works.
    await expect(page.getByRole('button', { name: 'Alle', exact: true })).toBeVisible();
  });
});
