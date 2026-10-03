import { test, expect } from '@playwright/test';

/**
 * The link checker: every internal link on every public page resolves, in
 * both languages. It crawls from the two home pages and follows what it
 * finds, so a nav item or an inline link to a page that does not exist fails
 * the build.
 *
 * The Quran's own pages are left to `quran.spec.ts`: they are generated from
 * the text's data rather than written as links, there are 600 of them, and
 * they need the upstream text API — the index included.
 */
const SKIP = [/^\/(api|admin|login)\b/, /^\/(fa|de)\/quran(\/|$)/];

test('every internal link resolves', async ({ page, request, baseURL }) => {
  test.setTimeout(240_000);
  const queue = ['/fa', '/de'];
  const seen = new Set<string>(queue);
  const broken: string[] = [];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 400) {
      broken.push(`${path} → ${response?.status() ?? 'no response'}`);
      continue;
    }
    const hrefs = await page.$$eval('a[href]', (links) =>
      links.map((a) => (a as HTMLAnchorElement).href),
    );
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== new URL(baseURL!).origin) continue;
      const target = url.pathname.replace(/\/$/, '') || '/';
      if (seen.has(target) || SKIP.some((re) => re.test(target))) continue;
      seen.add(target);
      // Pages are crawled; anything else (a file, a feed) only has to exist.
      if (/\.\w+$/.test(target)) {
        const status = (await request.get(target)).status();
        if (status >= 400) broken.push(`${target} → ${status} (linked from ${path})`);
      } else {
        queue.push(target);
      }
    }
  }

  expect(broken, broken.join('\n')).toEqual([]);
  expect(seen.size).toBeGreaterThan(30);
});
