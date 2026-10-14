import { chromium } from 'playwright';
const SITE = 'https://ansar-ham.netlify.app';
const b = await chromium.launch();
// Every element's own text and attributes, in document order, as lines.
const dump = () => {
  const out = [];
  const walk = (el, path) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').replace(/\s+/g, ' ');
    const attrs = [...el.attributes].filter((a) => !/^(style|data-rise|data-in)$/.test(a.name)).map((a) => `${a.name}=${a.value.slice(0, 80)}`).join(' ');
    out.push(`${path} [${attrs}] ${own.slice(0, 120)}`);
    [...el.children].forEach((c, i) => { if (!/^(SCRIPT|svg|STYLE|LINK|META|NOSCRIPT|TEMPLATE)$/i.test(c.tagName)) walk(c, `${path}>${c.tagName.toLowerCase()}`); });
  };
  walk(document.documentElement, 'html');
  return out;
};
for (const path of ['/de', '/fa']) {
  const raw = await (await b.newContext({ javaScriptEnabled: false, viewport: { width: 1400, height: 900 } })).newPage();
  await raw.goto(SITE + path); const A = await raw.evaluate(dump);
  const live = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  live.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  await live.goto(SITE + path); await live.waitForTimeout(6000); const B = await live.evaluate(dump);
  console.log(`\n===== ${path}: server ${A.length} lines, client ${B.length} lines =====`);
  const setB = new Set(B), setA = new Set(A);
  A.filter((l) => !setB.has(l)).slice(0, 60).forEach((l) => console.log('- ' + l));
  B.filter((l) => !setA.has(l)).slice(0, 60).forEach((l) => console.log('+ ' + l));
}
await b.close();
