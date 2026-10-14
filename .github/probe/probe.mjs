import { chromium } from 'playwright';
const SITE = 'https://ansar-ham.netlify.app';
// Wait for the deploy that carries the fix.
for (let i = 0; i < 60; i++) {
  const html = await (await fetch(SITE + '/de?probe=' + i)).text().catch(() => '');
  if (html.includes('nodeType===3')) { console.log('new deploy is live after', i * 20, 's'); break; }
  await new Promise((r) => setTimeout(r, 20000));
}
const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const w of [1400, 390]) for (const path of ['/de', '/fa', '/de/about', '/de/prayer']) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: 'Europe/Vienna' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 40)));
  await p.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(2500);
  const s = await p.evaluate(() => `hc=${document.documentElement.dataset.hc ?? '-'} splash=${document.documentElement.dataset.splash ?? '-'} canvases=${document.querySelectorAll('canvas').length}`);
  console.log(w, path, s, errs.length ? errs.join(' | ') : 'no errors');
  if (path === '/de') await p.screenshot({ path: `shot-${w}.png` });
  await ctx.close();
}
await b.close();
