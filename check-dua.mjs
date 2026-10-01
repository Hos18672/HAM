import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:3111';
const out = '/tmp/claude-0/-home-user-HAM/1f8824d0-2c90-5695-8fd3-6e2647d3118b/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function open(path, { theme = 'light', locale = 'de', width = 430, height = 920 } = {}) {
  const page = await browser.newPage({
    viewport: { width, height },
    hasTouch: true,
    isMobile: width < 600,
    locale: locale === 'fa' ? 'fa-IR' : 'de-AT',
    timezoneId: 'Europe/Vienna',
  });
  page.on('pageerror', (e) => console.log(path, 'PAGE ERROR:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log(path, 'CONSOLE:', m.text()));
  await page
    .context()
    .addCookies([{ name: 'ham-theme', value: theme, domain: '127.0.0.1', path: '/' }]);
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return page;
}

const p = await open('/de/duas/faraj');
const info = await p.evaluate(() => ({
  lines: document.querySelectorAll('.dua-line').length,
  rubrics: document.querySelectorAll('.dua-rubric').length,
  firstAr: document.querySelector('.dua-ar')?.textContent?.slice(0, 48),
  firstTr: document.querySelector('.dua-tr')?.textContent?.slice(0, 60) ?? null,
  arFont: getComputedStyle(document.querySelector('.dua-ar')).fontSize,
}));
console.log('de/faraj', JSON.stringify(info));
await p.locator('.mushaf-stage').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${out}/d1-faraj-de.png` });

// Fullscreen, bigger, then swipe on to the next du'a.
await p.getByRole('button', { name: 'Schrift vergrößern' }).click();
await p.getByRole('button', { name: 'Vollbild', exact: true }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/d2-faraj-full.png` });

const box = await p.locator('.mushaf-stage').boundingBox();
const y = box.y + Math.min(box.height / 2, 400);
async function swipe(from, to) {
  for (const type of ['pointerdown', 'pointerup']) {
    await p.dispatchEvent('.mushaf-stage', type, {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: type === 'pointerdown' ? from : to,
      clientY: y,
      bubbles: true,
    });
  }
  await p.waitForTimeout(1200);
}
await swipe(320, 70);
console.log(
  'after swipe←',
  p.url(),
  JSON.stringify(
    await p.evaluate(() => ({
      full: document.querySelector('.reader-shell')?.getAttribute('data-full'),
      scale: getComputedStyle(document.querySelector('.reader-shell')).getPropertyValue(
        '--reader-scale',
      ),
      title: document.querySelector('.dua-foot-title')?.textContent,
    })),
  ),
);
await p.screenshot({ path: `${out}/d3-after-swipe.png` });

const fa = await open('/fa/duas/ziyarat-ashura', { theme: 'dark', locale: 'fa' });
await fa.locator('.mushaf-stage').scrollIntoViewIfNeeded();
await fa.waitForTimeout(400);
console.log(
  'fa/ashura',
  JSON.stringify(
    await fa.evaluate(() => ({
      lines: document.querySelectorAll('.dua-line').length,
      rubrics: document.querySelectorAll('.dua-rubric').length,
      firstTr: document.querySelector('.dua-tr')?.textContent?.slice(0, 50),
    })),
  ),
);
await fa.screenshot({ path: `${out}/d4-ashura-fa-dark.png` });

const list = await open('/de/duas', { width: 1280, height: 1000 });
await list.waitForTimeout(500);
console.log('list links', await list.locator('.dua-open').count());
await list.screenshot({ path: `${out}/d5-list.png` });

await browser.close();
