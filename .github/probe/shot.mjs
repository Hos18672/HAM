// Temporary: waits for the deploy of 80e34b9, then photographs the live maps.
import { chromium } from 'playwright';
const S = 'https://ansar-ham.netlify.app';
for (let i = 0; i < 60; i++) {
  const html = await (await fetch(`${S}/de/privacy?probe=${i}`)).text();
  if (html.includes('wieder ausblenden')) { console.log('deployed after', i); break; }
  await new Promise((r) => setTimeout(r, 15000));
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'de-AT' });
const p = await ctx.newPage();
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await p.goto(`${S}/fa/qibla#map`);
await p.waitForTimeout(2000);
await p.getByRole('button', { name: /Google Maps/ }).first().click();
await p.waitForTimeout(6000);
console.log('iframe src', await p.locator('iframe.qibla-embed').getAttribute('src'));
await p.screenshot({ path: '.github/probe/qibla-street.png' });
await p.getByRole('button', { name: 'تا مکه' }).click();
await p.waitForTimeout(6000);
await p.screenshot({ path: '.github/probe/qibla-mecca.png' });
await p.goto(`${S}/fa/contact`);
await p.waitForTimeout(6000);
await p.locator('iframe.map-embed').scrollIntoViewIfNeeded();
await p.waitForTimeout(3000);
await p.screenshot({ path: '.github/probe/contact.png' });
await b.close();
