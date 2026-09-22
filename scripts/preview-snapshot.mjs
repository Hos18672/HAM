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
 * output of the genuine app, with everything interactive necessarily inert —
 * hence the banner this injects on every page, so nobody mistakes the preview
 * for the association's live site.
 *
 * Usage (the server must already be running):
 *   PREVIEW_BASE_PATH=/HAM node scripts/preview-snapshot.mjs
 */
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORIGIN = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:3100';
const BASE_PATH = process.env.PREVIEW_BASE_PATH ?? '';
const OUT = process.env.PREVIEW_OUT ?? 'preview';
const REPO_URL = process.env.PREVIEW_REPO_URL ?? 'https://github.com/Hos18672/HAM';

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
 * The preview banner.
 *
 * Added by a script on `load` rather than baked into the markup on purpose:
 * an extra element in the server HTML would not match what React expects when
 * it hydrates. Appending it afterwards leaves hydration untouched, and if the
 * script never runs the page is simply the page.
 */
function bannerScript() {
  const de =
    'Vorschau der Gestaltung — nicht die Live-Website des Vereins. ' +
    'Anmeldung, Verwaltung, Formulare und Suche brauchen einen Server und sind hier ohne Funktion.';
  const fa =
    'پیش‌نمایش طراحی — وب‌سایت زندهٔ انجمن نیست. ' +
    'ورود، بخش مدیریت، فرم‌ها و جست‌وجو به سرور نیاز دارند و اینجا کار نمی‌کنند.';

  return `<script>(function () {
  function mount() {
    if (document.getElementById('ham-preview-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'ham-preview-banner';
    bar.setAttribute('role', 'note');
    bar.style.cssText =
      'position:sticky;top:0;z-index:2147483647;background:#1c1917;color:#fafaf9;' +
      'font:500 13px/1.5 system-ui,sans-serif;padding:8px 16px;text-align:center;' +
      'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;align-items:center';
    var de = document.createElement('span');
    de.lang = 'de';
    de.dir = 'ltr';
    de.textContent = ${JSON.stringify(de)};
    var fa = document.createElement('span');
    fa.lang = 'fa';
    fa.dir = 'rtl';
    fa.textContent = ${JSON.stringify(fa)};
    fa.style.opacity = '0.75';
    var link = document.createElement('a');
    link.href = ${JSON.stringify(REPO_URL)};
    link.textContent = 'Quellcode';
    link.style.cssText = 'color:#fafaf9;text-underline-offset:3px';
    bar.appendChild(de);
    bar.appendChild(fa);
    bar.appendChild(link);
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.readyState === 'complete') setTimeout(mount, 0);
  else window.addEventListener('load', function () { setTimeout(mount, 0); });
})();</script>`;
}

/**
 * A preview must never outrank the real site once it exists, so every page
 * carries `noindex` and robots.txt refuses the lot.
 */
function transform(html) {
  const noindex = '<meta name="robots" content="noindex, nofollow" />';
  let out = html.replace(/<head([^>]*)>/i, (match, attrs) => `<head${attrs}>${noindex}`);
  out = out.replace(/<\/body>/i, `${bannerScript()}</body>`);
  return out;
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

  // The icon, which is a route rather than a file in public/.
  const icon = await fetchPage('/icon.svg');
  if (icon.status === 200) await writeFileAt(join(OUT, 'icon.svg'), icon.body);

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
