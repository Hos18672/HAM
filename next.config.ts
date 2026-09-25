import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/**
 * Content Security Policy. No third-party origins at all: fonts are self-hosted,
 * icons ship in the bundle, and there is no analytics. `img-src` allows the
 * Supabase Storage origin because uploaded media is served from there.
 */
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
  `img-src 'self' data: blob:${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
  "font-src 'self'",
  `connect-src 'self'${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
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
  images: {
    remotePatterns: supabaseOrigin
      ? [{ protocol: 'https', hostname: new URL(supabaseOrigin).hostname }]
      : [],
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
