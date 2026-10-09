import { NextResponse } from 'next/server';

/**
 * Digital Asset Links, served at `/.well-known/assetlinks.json` (a rewrite in
 * next.config.ts). It names the Android app as belonging to this site, which is
 * what lets the app open the site full-screen, without Chrome's address bar.
 *
 * `ANDROID_CERT_SHA256` holds the SHA-256 fingerprint of the key the app is
 * signed with — the Android workflow prints it — or several, comma-separated
 * (Google Play re-signs with its own key, whose fingerprint the Play Console
 * shows). Unset, the list is empty and the app opens with the address bar.
 */
export const dynamic = 'force-static';

const PACKAGE = 'at.hausallermenschen.app';

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: PACKAGE,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];
  return NextResponse.json(body);
}
