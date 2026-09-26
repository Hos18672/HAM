#!/usr/bin/env node
/**
 * Freezes the public site into a folder of static files for GitHub Pages.
 *
 * Why a snapshot rather than a static export: this app is a server
 * application. Middleware routes the locales, six server-action modules carry
 * the forms and every admin save, three API routes handle auth, uploads and
 * revalidation, and all content lives in Postgres. `output: 'export'` cannot
 * carry any of that, and bending the app until it could would mean deleting
 * the half of it that matters.
 *
 * So instead this runs the real production build against a real seeded
 * database and keeps what it renders. What lands on Pages is the genuine
 * output of the genuine app, with everything interactive necessarily inert.
 *
 * There used to be a black bar across the top of every page saying so. It is
 * gone at the owner's request: it sat above the hero, pushed the whole page
 * down and covered the loader. What keeps the preview from being taken for
 * the real site is now `noindex` on every page and a robots.txt that refuses
 * the lot — neither of which is visible, and neither of which was removed.
 *
 * Usage (the server must already be running):
 *   PREVIEW_BASE_PATH=/HAM node scripts/preview-snapshot.mjs
 */
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { dirname, join } from 'node:path';

const ORIGIN = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:3100';
const BASE_PATH = process.env.PREVIEW_BASE_PATH ?? '';
const OUT = process.env.PREVIEW_OUT ?? 'preview';

/** The locales, read from the app rather than repeated here. */
async function readLocales() {
  const source = await readFile('lib/i18n/config.ts', 'utf8');
  const match = source.match(/export const locales = \[([^\]]+)\]/);
  if (!match) throw new Error('could not read the locale list from lib/i18n/config.ts');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Every public page, read from the routes that exist. */
async function readRoutes() {
  const entries = await readdir('app/[locale]/(site)', { withFileTypes: true });
  const segments = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  segments.sort();
  return ['', ...segments.map((segment) => `/${segment}`)];
}

/**
 * A preview must never outrank the real site once it exists, so every page
 * carries `noindex` and robots.txt refuses the lot.
 */
function transform(html) {
  const noindex = '<meta name="robots" content="noindex, nofollow" />';
  return html.replace(/<head([^>]*)>/i, (match, attrs) => `<head${attrs}>${noindex}`);
}

async function fetchPage(path) {
  const response = await fetch(`${ORIGIN}${BASE_PATH}${path}`);
  const body = await response.text();
  return { status: response.status, body };
}

async function writeFileAt(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf8');
}

async function main() {
  const [locales, routes] = await Promise.all([readLocales(), readRoutes()]);
  await mkdir(OUT, { recursive: true });

  // The build's own static assets and everything in public/. Copied rather
  // than crawled: the build already knows exactly what it emitted.
  await cp('.next/static', join(OUT, '_next', 'static'), { recursive: true });
  // public/ may not exist at all: the fonts moved into the bundle, and git does
  // not carry an empty directory, so a fresh clone has none.
  try {
    await cp('public', OUT, { recursive: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  let pages = 0;
  for (const locale of locales) {
    for (const route of routes) {
      const path = `/${locale}${route}`;
      const { status, body } = await fetchPage(path);
      if (status !== 200) throw new Error(`${path} returned ${status}`);
      await writeFileAt(join(OUT, locale, route, 'index.html'), transform(body));
      pages += 1;
    }
  }

  // The icons, which are routes built from `app/icon.*` rather than files in
  // public/. Fetched as bytes, not text: one of them is a PNG, and reading a
  // PNG as UTF-8 turns it into something that is no longer a PNG.
  for (const name of ['icon.svg', 'icon.png']) {
    const response = await fetch(`${ORIGIN}${BASE_PATH}/${name}`);
    if (response.status !== 200) continue;
    await mkdir(OUT, { recursive: true });
    await writeFile(join(OUT, name), Buffer.from(await response.arrayBuffer()));
  }

  // Pages serves 404.html for anything missing, so give it the real one.
  const missing = await fetchPage(`/${locales[0]}/gibt-es-nicht`);
  await writeFileAt(join(OUT, '404.html'), transform(missing.body));

  // Middleware normally redirects the root to the default locale. There is no
  // middleware on a static host, so the root is a plain redirect instead.
  const [defaultLocale] = locales;
  await writeFileAt(
    join(OUT, 'index.html'),
    `<!doctype html>
<html lang="${defaultLocale}">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta http-equiv="refresh" content="0; url=./${defaultLocale}/" />
    <link rel="canonical" href="./${defaultLocale}/" />
    <title>Haus aller Menschen</title>
  </head>
  <body>
    <p><a href="./${defaultLocale}/">Haus aller Menschen</a></p>
  </body>
</html>
`,
  );

  await writeFileAt(join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  // Pages would otherwise run the artefact through Jekyll, which drops
  // directories beginning with an underscore — _next among them.
  await writeFileAt(join(OUT, '.nojekyll'), '');

  console.log(`preview: ${pages} pages (${locales.length} locales × ${routes.length} routes)`);
}

await main();
