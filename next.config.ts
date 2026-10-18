import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/**
 * Content Security Policy. Almost no third-party origins: fonts are
 * self-hosted, icons ship in the bundle, and there is no analytics anywhere.
 *
 * `img-src` allows the Supabase Storage origin, because uploaded media is
 * served from there, and Google's map tiles and logo for the qibla map where
 * the build has a Google key (`lib/google-tiles`); the tile session and the
 * copyright line for the view are two small JSON requests (`connect-src`).
 * Without a key the qibla map is Google's embed, like the house's map on the
 * home and contact pages (`frame-src`) — and every embed waits for the
 * visitor to agree to it (`lib/google-consent`).
 */
const GOOGLE_TILES_ORIGIN = 'https://tile.googleapis.com';
const GOOGLE_STATIC_ORIGIN = 'https://maps.gstatic.com';
const GOOGLE_MAPS_ORIGIN = 'https://www.google.com';
const supabaseOrigin = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : '';
  } catch {
    return '';
  }
})();

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required for them
  // in the absence of a per-request nonce on statically rendered pages. The dev
  // server additionally evaluates its HMR runtime from a string — without
  // 'unsafe-eval' there, the client bundle never hydrates and nothing responds.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GOOGLE_TILES_ORIGIN} ${GOOGLE_STATIC_ORIGIN}${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
  "font-src 'self'",
  // Google Maps, embedded on the home, contact and qibla pages — and only
  // once the visitor has agreed to it; until then no request goes to Google.
  `frame-src ${GOOGLE_MAPS_ORIGIN}`,
  `connect-src 'self' ${GOOGLE_TILES_ORIGIN}${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
  // The Quran's recitation, one file per verse — fetched only when somebody
  // presses play in the reader.
  "media-src 'self' https://cdn.islamic.network",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/**
 * GitHub Pages serves the preview snapshot from a sub-path (…/HAM), not from a
 * domain root, so every absolute asset URL the app emits has to carry that
 * prefix. `PREVIEW_BASE_PATH` supplies it for the snapshot build alone. Unset —
 * which is every real build, local or on Vercel — this is undefined and the app
 * is served from the root exactly as before.
 */
const previewBasePath = process.env.PREVIEW_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(previewBasePath ? { basePath: previewBasePath } : {}),
  /**
   * The same prefix, readable from the browser.
   *
   * `basePath` rewrites what the framework emits — `<Link>`, the chunks, the
   * router — but not a path this app writes itself: an `<img src="/logo.png">`
   * or a route test inside an inline script. Both of those exist, and under
   * the preview's sub-path both were wrong: the logo 404'd and the hero's
   * loader never recognised the home page. Inlined at build time, empty on
   * every real build.
   */
  env: { NEXT_PUBLIC_BASE_PATH: previewBasePath ?? '' },
  poweredByHeader: false,
  /**
   * Compiled down like the app's own code. Next leaves node_modules as they
   * ship, and the message formatter under next-intl ships class `static {}`
   * blocks, which Chromium before 94 cannot parse — on a TV or display
   * browser (a Samsung Flip runs Chromium 85 or 94) that one chunk failed,
   * and the page fell over into the error screen on the first client render.
   */
  transpilePackages: [
    'next-intl',
    'use-intl',
    'intl-messageformat',
    '@formatjs/fast-memoize',
    '@formatjs/icu-messageformat-parser',
    '@formatjs/icu-skeleton-parser',
    '@formatjs/intl-localematcher',
  ],
  /**
   * Self-hosted runs only (`next start`: the end-to-end tests, a local
   * production run). Next's default lets the browser keep a page for a year
   * under `stale-while-revalidate` with no `max-age`, so Chrome showed the
   * copy from the last visit and fetched the new one behind it — an edit
   * saved in the admin appeared one visit late. With the window no longer
   * than the pages' own hour there is no such header, and the browser asks
   * every time. Netlify rewrites the header itself (`max-age=0,
   * must-revalidate`) and keeps its edge serving stale while it rebuilds.
   */
  ...(process.env.NETLIFY ? {} : { expireTime: 3600 }),
  /**
   * The mushaf as files (`scripts/quran-data.ts`) goes with the server too,
   * which reads a page from disk rather than from the API (`lib/quran.ts`).
   * Not otherwise traced: nothing imports it, it is read by path.
   */
  outputFileTracingIncludes: {
    '/**': ['./public/quran-data/**/*'],
  },
  images: {
    remotePatterns: supabaseOrigin
      ? [{ protocol: 'https', hostname: new URL(supabaseOrigin).hostname }]
      : [],
  },
  // The Android app's Digital Asset Links, which must sit at this exact path.
  async rewrites() {
    return [{ source: '/.well-known/assetlinks.json', destination: '/api/assetlinks' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
