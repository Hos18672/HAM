import { test, expect } from '@playwright/test';

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

test.describe('qibla', () => {
  test('shows the computed direction from the association house', async ({ page }) => {
    await page.goto('/de/qibla');

    // The figure the design specifies: ≈136.6° south-east, ≈3 637 km.
    //
    // Scoped to the facts row on purpose: the design also prints the reading
    // in the middle of the rose, so the bearing appears twice on the page —
    // once as a figure to read, once on the dial. The second is aria-hidden,
    // but it is still text, so an unscoped match is ambiguous.
    const bearing = page.locator('.fact-rule[data-lead="true"]');
    await expect(bearing.getByText(/136,[67]°/)).toBeVisible();
    await expect(bearing.getByText('Südosten', { exact: false })).toBeVisible();
    // Scoped for the same reason: the map prints distances of its own.
    await expect(page.locator('.fact-rule').getByText(/3.637/)).toBeVisible();

    // The rose is an image with an accessible name, not a decorative blob.
    await expect(page.getByRole('img', { name: /Kompassrose/ })).toBeVisible();
  });

  test('recomputes from a granted location and returns to the house', async ({ page, context }) => {
    // Mecca itself: the bearing becomes meaningless and the distance zero,
    // which is an unambiguous signal that the recomputation happened.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.5074, longitude: -0.1278 }); // London

    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Meinen Standort verwenden' }).click();

    // The facts row again — the rose repeats the reading, see above.
    const bearing = page.locator('.fact-rule[data-lead="true"]');
    await expect(bearing.getByText(/119,0°/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Von Ihrem Standort aus')).toBeVisible();

    await page.getByRole('button', { name: 'Zurück zum Vereinshaus' }).click();
    await expect(bearing.getByText(/136,[67]°/)).toBeVisible();
  });

  test('states plainly when the compass is unavailable', async ({ page }) => {
    await page.goto('/de/qibla');
    // A desktop runner has no magnetometer, so activating must say something
    // rather than leaving a needle pointing somewhere arbitrary.
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();

    // Three outcomes are legitimate and none of them is silent: a browser that
    // hands over the sensor flips the button to "Kompass aktiv"; one without
    // the API says so; one that gates it behind a permission and refuses says
    // that instead. What must never happen is nothing at all.
    //
    // `exact` is not optional here. Playwright matches an accessible name as a
    // case-insensitive *substring* by default, and "Kompass aktiv" is a
    // substring of "Kompass aktivieren" — so without it this passes on the
    // unclicked button and asserts nothing whatsoever.
    const activeButton = page.getByRole('button', { name: 'Kompass aktiv', exact: true });
    const unsupported = page.getByText('stellt keinen Kompass zur Verfügung');
    const denied = page.getByText('Ohne Freigabe kann der Kompass nicht gelesen werden');
    await expect(activeButton.or(unsupported).or(denied).first()).toBeVisible();
  });

  test('turns the rose only on an absolute heading', async ({ page }) => {
    /**
     * Put the page on the footing this feature is written for: a device whose
     * orientation sensor exists and has been allowed. Both ways a desktop
     * runner falls short of that are covered below, and a browser that already
     * hands the sensor over is left alone.
     */
    await page.addInitScript(() => {
      const existing = (
        window as unknown as {
          DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
        }
      ).DeviceOrientationEvent;

      // A browser that gates the sensor behind a permission refuses it on a
      // headless runner, and the component then correctly reports the compass
      // as denied and never subscribes — leaving nothing to test. Granting it
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

    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Kompass aktivieren' }).click();
    // `exact`, for the reason given in the test above: without it this matches
    // the unclicked button and the rest of the test runs against a compass
    // that was never activated.
    await expect(page.getByRole('button', { name: 'Kompass aktiv', exact: true })).toBeVisible();

    const rose = page.getByRole('img', { name: /Kompassrose/ });
    const rotation = async () =>
      (await rose.getAttribute('style'))?.match(/rotate\((-?[\d.]+)deg\)/)?.[1];

    // One orientation reading, built with the constructor a browser uses, and
    // everything the page saw of it reported together so a failure names which
    // link broke rather than only printing a rotation.
    const observe = async (type: string, alpha: number, absolute: boolean) =>
      page
        .evaluate(
          ({ type, alpha, absolute }) => {
            let reachedAListener = false;
            const probe = () => {
              reachedAListener = true;
            };
            window.addEventListener(type, probe, true);
            const event = new DeviceOrientationEvent(type, { alpha, absolute });
            window.dispatchEvent(event);
            window.removeEventListener(type, probe, true);
            return { reachedAListener, alpha: event.alpha, absolute: event.absolute };
          },
          { type, alpha, absolute },
        )
        .then(async (seen) => ({ ...seen, rotation: await rotation() }));

    // An absolute reading is a real compass heading: the rose counter-rotates.
    //
    // The dispatch happens *inside* the poll on purpose. The listener is
    // attached by an effect that runs after the button flips to "Kompass
    // aktiv", so firing once and then polling races hydration.
    await expect
      .poll(() => observe('deviceorientationabsolute', 90, true))
      .toMatchObject({ reachedAListener: true, alpha: 90, absolute: true, rotation: '-270' });

    // Chrome on Android also fires a *relative* `deviceorientation`, whose
    // alpha is zeroed wherever the device happened to be pointing. Acting on
    // it would swing the needle to an arbitrary bearing.
    await observe('deviceorientation', 200, false);
    await page.waitForTimeout(300);
    expect(await rotation()).toBe('-270');
  });
});

/**
 * The map that answers the question people actually arrive with: standing
 * here, which way do I turn? The reader is in the middle of it and the qibla
 * is a straight line out of them, which is true on this projection and on
 * almost no other.
 */
test.describe('the qibla from where you are', () => {
  test('opens on your own place, with the direction out of it', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Mein Standort' }).click();
    const map = page.locator('.qibla-map-svg');
    await map.scrollIntoViewIfNeeded();

    // You are in the middle, named.
    await expect(map.getByText('Vereinshaus')).toBeVisible();
    // And Mecca is on the map at the scale it opens at, so the line can be
    // seen to go somewhere.
    await expect.poll(() => map.getByText('Mekka').count(), { timeout: 10_000 }).toBe(1);

    // The arrow leaves the centre at the computed bearing. Vienna's qibla is
    // a little south of east, so the far end is right of and below the
    // middle — which is the one thing a wrong projection would get wrong.
    const ray = map.locator('line').last();
    const x2 = Number(await ray.getAttribute('x2'));
    const y2 = Number(await ray.getAttribute('y2'));
    expect(x2).toBeGreaterThan(0);
    expect(y2).toBeGreaterThan(0);
  });

  test('zooms down to the ground you are standing on', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Mein Standort' }).click();
    const map = page.locator('.qibla-map-svg');
    await map.scrollIntoViewIfNeeded();

    const scale = page.locator('.qibla-map .reader-size-value');
    await expect(scale).toHaveText(/km/);

    // In as far as it goes — counted by the button rather than by a number
    // here, so adding a step to the ladder does not break the test.
    const closer = page.getByRole('button', { name: 'Näher heran' });
    for (let i = 0; i < 40 && (await closer.isEnabled()); i += 1) await closer.click();
    await expect(closer).toBeDisabled();

    // All the way in, the rings are metres: a plan of the ground you are
    // standing on, not a map of anywhere.
    await expect(scale).toHaveText(/m$/);
    // Mecca is long gone, but the direction is not: the distance is written
    // at the end of the arrow instead.
    await expect(map.getByText(/nach Mekka/)).toBeVisible();
  });

  test('is drawn in the page, with nothing fetched from anywhere', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Mein Standort' }).click();
    await page.locator('.qibla-map-svg').waitFor();

    // Counted only from here: the street map opens first and fetches its
    // tiles, which is its business. What is being checked is that *this*
    // view asks for nothing — it is the one for a reader who would rather
    // nobody were told where they are.
    const outside: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.host !== '127.0.0.1:3100' && url.protocol !== 'data:') outside.push(request.url());
    });
    await page.locator('.qibla-map-svg').scrollIntoViewIfNeeded();
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: 'Weiter weg' }).click();
    }
    await page.waitForTimeout(1_500);
    expect(outside).toEqual([]);
  });
});

/**
 * The street map, which is what the page opens on: the direction drawn over
 * the reader's own surroundings, because a bearing is only usable if you can
 * see it against the buildings in front of you.
 *
 * The tiles are stubbed with a single pixel. The run must not trouble
 * OpenStreetMap's servers, and whether their map is reachable from a CI
 * runner is not something this suite should depend on.
 */
test.describe('the qibla on the street', () => {
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  test('opens on the street, with tiles and the arrow over them', async ({ page }) => {
    const asked: string[] = [];
    await page.route('https://tile.openstreetmap.org/**', (route, request) => {
      asked.push(request.url());
      return route.fulfill({ contentType: 'image/png', body: PIXEL });
    });

    await page.goto('/de/qibla');
    const street = page.locator('.qibla-street');
    await street.scrollIntoViewIfNeeded();
    await expect(street).toBeVisible();

    // Tiles are asked for, and only from the one host the policy names.
    await expect.poll(() => asked.length, { timeout: 10_000 }).toBeGreaterThan(3);
    for (const url of asked) expect(url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\//);

    // The direction is drawn over them, and Vienna's qibla runs south-east:
    // the far end of the ray is right of and below the reader.
    const ray = street.locator('line').last();
    const [x1, y1, x2, y2] = await Promise.all(
      ['x1', 'y1', 'x2', 'y2'].map(async (a) => Number(await ray.getAttribute(a))),
    );
    expect(x2).toBeGreaterThan(x1);
    expect(y2).toBeGreaterThan(y1);

    // OpenStreetMap's licence asks for the credit, and it is there.
    await expect(street.getByText('© OpenStreetMap')).toBeVisible();
  });

  test('says so and draws it itself when the tiles cannot be had', async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());

    await page.goto('/de/qibla');
    await expect(page.locator('.qibla-fallback')).toBeVisible({ timeout: 10_000 });
    // Not a blank square and not a lie: it says the map is missing and then
    // gives the same direction, drawn from what the page carries.
    await expect(page.getByText(/Straßenkarte konnte nicht geladen werden/)).toBeVisible();
    await expect(page.locator('.qibla-map-svg')).toBeVisible();
  });

  test('moves under the hand and comes back', async ({ page }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: PIXEL }),
    );
    await page.goto('/de/qibla');
    const street = page.locator('.qibla-street');
    await street.scrollIntoViewIfNeeded();
    await expect(street).toBeVisible();

    const recentre = page.getByRole('button', { name: 'Zurück zu meinem Standort' });
    await expect(recentre).toBeDisabled();

    const box = (await street.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 60, { steps: 6 });
    await page.mouse.up();

    await expect(recentre).toBeEnabled();
    await recentre.click();
    await expect(recentre).toBeDisabled();
  });
});

test.describe('the qibla globe', () => {
  test('draws the world, both places and the way between them', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Weltkugel' }).click();
    const globe = page.locator('.qibla-globe');
    await globe.scrollIntoViewIfNeeded();

    // The outline is a separate chunk, fetched once the map is on screen.
    await expect.poll(() => globe.locator('path').count(), { timeout: 10_000 }).toBeGreaterThan(5);

    // The two ends of the arc are labelled, and the arc itself is drawn.
    await expect(globe.getByText('Vereinshaus')).toBeVisible();
    await expect(globe.getByText('Mekka')).toBeVisible();

    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll('.qibla-globe path')].map(
        (p) => (p.getAttribute('d') ?? '').length,
      ),
    );
    // Land, borders, graticule and the arc — none of them empty.
    expect(Math.max(...drawn)).toBeGreaterThan(5_000);
  });

  test('turns under the pointer and comes back', async ({ page }) => {
    await page.goto('/de/qibla');
    await page.getByRole('button', { name: 'Weltkugel' }).click();
    const globe = page.locator('.qibla-globe');
    await globe.scrollIntoViewIfNeeded();
    await expect.poll(() => globe.locator('path').count(), { timeout: 10_000 }).toBeGreaterThan(5);

    const arc = () =>
      page.evaluate(
        () => document.querySelectorAll('.qibla-globe path')[3]?.getAttribute('d') ?? '',
      );
    const before = await arc();

    const box = (await globe.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 6 });
    await page.mouse.up();
    await expect.poll(arc).not.toBe(before);

    await page.getByRole('button', { name: 'Ansicht zurücksetzen' }).click();
    await expect.poll(arc).toBe(before);
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
