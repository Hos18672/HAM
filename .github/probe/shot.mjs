// Temporary: photographs the live qibla map over Google's real embed.
import { chromium } from 'playwright';
const S = 'https://ansar-ham.netlify.app';
function dump(name, buf) {
  const b64 = buf.toString('base64');
  console.log(`IMG-BEGIN ${name} ${b64.length}`);
  for (let i = 0; i < b64.length; i += 2000) console.log(`IMG ${name} ${b64.slice(i, i + 2000)}`);
  console.log(`IMG-END ${name}`);
}
for (let i = 0; i < 60; i++) {
  const html = await (await fetch(`${S}/fa/qibla?probe=${i}`)).text();
  const js = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  let found = false;
  for (const src of js) {
    const code = await (await fetch(new URL(src, S))).text();
    if (code.includes('qibla-layer')) { found = true; break; }
  }
  if (found) { console.log('deployed after', i); break; }
  await new Promise((r) => setTimeout(r, 15000));
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 0.6 });
const p = await ctx.newPage();
await p.goto(`${S}/fa/qibla#map`);
await p.waitForTimeout(2000);
await p.getByRole('button', { name: /Google Maps/ }).first().click();
await p.waitForTimeout(7000);
dump('map', await p.locator('.qibla-street-frame').screenshot({ type: 'jpeg', quality: 45 }));
await p.locator('.qibla-layer').click();
await p.waitForTimeout(6000);
console.log('src', await p.locator('iframe.qibla-embed').getAttribute('src'));
dump('sat', await p.locator('.qibla-street-frame').screenshot({ type: 'jpeg', quality: 30 }));
await b.close();
