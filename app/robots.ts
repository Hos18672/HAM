import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The editorial area and the API are not for crawlers. They are also
        // behind authentication — this is a courtesy, not the protection.
        disallow: ['/admin', '/login', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
