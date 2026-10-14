import { chromium } from 'playwright';
const b = await chromium.launch();
const pages = ['/de', '/fa', '/de/about', '/de/contact', '/de/prayer', '/de/gallery', '/de/events', '/de/support', '/de/imprint', '/de/duas', '/de/more'];
for (const site of ['https://ansar-ham.netlify.app', 'https://hos18672.github.io/HAM']) {
  for (const w of [1400, 390]) for (const path of pages) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: 'Europe/Vienna' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 40)));
    const r = await p.goto(site + path).catch((e) => ({ status: () => e.message.slice(0, 40) }));
    await p.waitForTimeout(1200);
    const hc = await p.evaluate(() => document.documentElement.dataset.hc ?? '-').catch(() => '?');
    console.log(site.slice(8, 20), w, path, r.status(), 'hc=' + hc, errs.length ? errs.join(' | ') : 'ok');
    await ctx.close();
  }
}
await b.close();
