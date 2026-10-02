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
/** The mushaf this site uses: 604 pages, as the Medina printing has it. */
const QURAN_PAGES = 604;

/** The locales, read from the app rather than repeated here. */
async function readLocales() {
  const source = await readFile('lib/i18n/config.ts', 'utf8');
  const match = source.match(/export const locales = \[([^\]]+)\]/);
  if (!match) throw new Error('could not read the locale list from lib/i18n/config.ts');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/**
 * The du'as that have a page of their own, read from the texts themselves.
 *
 * They live under a nested dynamic segment, so the directory listing below
 * does not reach them: before this, every "read the full text" link on the
 * preview led to a 404, which is the whole du'a section unusable.
 */
async function readDuaSlugs() {
  const source = await readFile('lib/dua-texts/index.ts', 'utf8');
  const table = source.match(/const TEXTS: Record<string, DuaText> = \{([\s\S]*?)\n\};/);
  if (!table) throw new Error('could not read the du’a slugs from lib/dua-texts/index.ts');
  const slugs = [...table[1].matchAll(/^\s*'?([a-z0-9-]+)'?:/gm)].map((m) => m[1]);
  if (slugs.length === 0) throw new Error('no du’a slugs found in lib/dua-texts/index.ts');
  return slugs;
}

/** Every public page, read from the routes that exist. */
async function readRoutes() {
  const entries = await readdir('app/[locale]/(site)', { withFileTypes: true });
  const segments = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  segments.sort();
  // The Quran is read as a book of 604 pages, each at its own address under
  // /quran/page/ — nested, so the listing above does not reach them. On the
  // live site the reader turns pages by asking the server; here there is no
  // server, so every page has to be a file.
  const quranPages = Array.from({ length: QURAN_PAGES }, (_, i) => `/quran/page/${i + 1}`);
  const duas = (await readDuaSlugs()).map((slug) => `/duas/${slug}`);
  return ['', ...segments.map((segment) => `/${segment}`), ...duas, ...quranPages];
}

/**
 * The reader turns pages by asking `/api/quran/page/[page]`, and only the
 * book is drawn again — the whole screen, the chosen size and the reader's
 * place all survive a turn because nothing else renders.
 *
 * There is no API on a static host, so the same answers are written out as
 * files here and the reader fetches those instead (see `mushaf-reader`).
 * Without them a turn fell back to loading the entire site page afresh,
 * which is exactly what the reader was built not to do.
 */
async function writeQuranData(locales) {
  let written = 0;
  for (const locale of locales) {
    const numbers = Array.from({ length: QURAN_PAGES }, (_, i) => i + 1);
    // A few at a time: 604 pages at once is a thundering herd on a dev-sized
    // database, and one at a time takes minutes.
    const workers = Array.from({ length: 8 }, async () => {
      for (let n = numbers.shift(); n !== undefined; n = numbers.shift()) {
        const response = await fetch(`${ORIGIN}${BASE_PATH}/api/quran/page/${n}?locale=${locale}`);
        if (response.status !== 200) {
          throw new Error(`quran page ${n} (${locale}) returned ${response.status}`);
        }
        await writeFileAt(join(OUT, 'quran-data', locale, `${n}.json`), await response.text());
        written += 1;
      }
    });
    await Promise.all(workers);
  }
  return written;
}

/**
 * The same for the du'as, which the reader now turns the same way: it asks
 * `/api/duas/[slug]`, and on a static host there is nothing to ask. Thirteen
 * texts in two languages, so no need to go at them in parallel.
 */
async function writeDuaData(locales, slugs) {
  let written = 0;
  for (const locale of locales) {
    for (const slug of slugs) {
      const response = await fetch(`${ORIGIN}${BASE_PATH}/api/duas/${slug}?locale=${locale}`);
      if (response.status !== 200) {
        throw new Error(`du'a ${slug} (${locale}) returned ${response.status}`);
      }
      await writeFileAt(join(OUT, 'dua-data', locale, `${slug}.json`), await response.text());
      written += 1;
    }
  }
  return written;
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

  const quranData = await writeQuranData(locales);
  const duaData = await writeDuaData(locales, await readDuaSlugs());

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
  // middleware on a static host, so the root is a plain redirect instead —
  // one that honours a language the reader has already chosen, as the
  // middleware does. The meta refresh stays as the answer without script.
  const [defaultLocale] = locales;
  await writeFileAt(
    join(OUT, 'index.html'),
    `<!doctype html>
<html lang="${defaultLocale}">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <script>
      (function () {
        try {
          var m = document.cookie.match(/(?:^|; )NEXT_LOCALE=(${locales.join('|')})/);
          if (m && m[1] !== '${defaultLocale}') location.replace('./' + m[1] + '/');
        } catch (e) {}
      })();
    </script>
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

  console.log(
    `preview: ${pages} pages (${locales.length} locales × ${routes.length} routes), ` +
      `${quranData} mushaf pages and ${duaData} du'as as data`,
  );
}

await main();
