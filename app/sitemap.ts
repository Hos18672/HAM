import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';
import { NAV, LEGAL_NAV } from '@/components/site/nav-links';

/**
 * Every page in both languages, each listing the other as its `hreflang`
 * alternate — which is what tells a crawler the two are the same page rather
 * than duplicate content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = new Date();

  const paths = [...NAV, ...LEGAL_NAV].map((entry) => (entry.href === '/' ? '' : entry.href));

  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === '' || path === '/events' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((other) => [other, `${base}/${other}${path}`]),
        ),
      },
    })),
  );
}
