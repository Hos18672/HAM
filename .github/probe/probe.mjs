import { chromium } from 'playwright';
const SITE = 'https://ansar-ham.netlify.app';
const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, attr] of [[1400, 'hc'], [390, 'splash']]) {
  console.log(`\n===== width ${w} =====`);
  const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
  const p = await ctx.newPage();
  p.on('console', (m) => console.log('console', m.type(), m.text().slice(0, 400)));
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 400)));
  p.on('requestfailed', (r) => console.log('requestfailed', r.url(), r.failure()?.errorText));
  p.on('response', (r) => { if (r.status() >= 400 || /\.js($|\?)/.test(r.url()) && r.url().includes('chunks')) console.log('resp', r.status(), r.headers()['content-type'], r.url()); });
  const t0 = Date.now();
  const res = await p.goto(SITE + '/de', { waitUntil: 'commit' });
  console.log('status', res.status(), 'ttfb ms', Date.now() - t0);
  console.log('headers', JSON.stringify(res.headers(), null, 1));
  for (let i = 0; i < 28; i++) {
    await p.waitForTimeout(500);
    const s = await p.evaluate((a) => ({ v: document.documentElement.dataset[a] ?? '(none)', canvas: document.querySelectorAll('canvas').length, ready: document.readyState, gl2: !!document.createElement('canvas').getContext('webgl2') }), attr).catch((e) => e.message);
    console.log(`${(i + 1) * 500}ms`, JSON.stringify(s));
  }
  await p.screenshot({ path: `shot-${w}.png` });
  await ctx.close();
}
await b.close();
