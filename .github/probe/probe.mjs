import { chromium } from 'playwright';
const SITE = 'https://ansar-ham.netlify.app';
const b = await chromium.launch();
// Every element in document order: tag path + sorted attributes (minus the
// ones effects add later) + own text. Scripts included, contents trimmed.
const dump = () => {
  const skip = /^(data-rise.*|data-in|data-hc|data-splash|data-live|style|data-state|role|aria-live|data-measured|data-engine|width|height)$/;
  const out = [];
  const walk = (el, path) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').replace(/\s+/g, ' ');
    const attrs = [...el.attributes].filter((a) => !skip.test(a.name)).map((a) => `${a.name}=${a.value.slice(0, 60)}`).sort().join(' ');
    out.push(`${path} [${attrs}] ${el.tagName === 'SCRIPT' || el.tagName === 'STYLE' ? own.slice(0, 50) : own.slice(0, 80)}`);
    [...el.children].forEach((c) => walk(c, `${path}>${c.tagName.toLowerCase()}`));
  };
  walk(document.documentElement, 'html');
  return out;
};
for (const path of ['/de']) {
  const raw = await (await b.newContext({ javaScriptEnabled: false, viewport: { width: 1400, height: 900 } })).newPage();
  await raw.goto(SITE + path); const A = await raw.evaluate(dump);
  const live = await (await b.newContext({ viewport: { width: 1400, height: 900 }, timezoneId: 'Europe/Vienna', locale: 'de-AT' })).newPage();
  live.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 120)));
  await live.goto(SITE + path); await live.waitForTimeout(1500); const B = await live.evaluate(dump);
  console.log(`\n===== ${path}: server ${A.length}, client ${B.length} =====`);
  const count = (arr) => arr.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map());
  const cA = count(A), cB = count(B);
  for (const [l, n] of cA) if ((cB.get(l) || 0) < n) console.log(`- (${n - (cB.get(l) || 0)}) ${l}`);
  for (const [l, n] of cB) if ((cA.get(l) || 0) < n) console.log(`+ (${n - (cA.get(l) || 0)}) ${l}`);
  // The head, as the server sent it, for reference.
  console.log('\n--- server head ---'); A.filter((l) => l.startsWith('html>head')).forEach((l) => console.log(l));
}
await b.close();
