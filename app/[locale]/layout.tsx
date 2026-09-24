import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { locales, localeDirection } from '@/lib/i18n/config';
import { readTheme } from '@/lib/preferences';
import { getSettings } from '@/lib/db/queries/content';
import { PrintPlates } from '@/components/site/print-plates';
import { PatternDefs } from '@/components/site/ornaments';
import { RiseObserver } from '@/components/site/rise';
import { Boot } from '@/components/site/boot';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Anything that is not one of the two locales is not a page. This alone does
 * not stop the render: the response 404s, but the page underneath has already
 * started its queries and asked Postgres for the locale "favicon.ico". The
 * guard that actually runs first is `requireLocale`, which every page and
 * layout in this segment puts its param through.
 */
export const dynamicParams = false;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f2f2' },
    { media: '(prefers-color-scheme: dark)', color: '#06211a' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'brand' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${t('name')} — ${t('sub')}`, template: `%s — ${t('name')}` },
    applicationName: t('name'),
    // Every page is reachable under both prefixes; `hreflang` says so, and
    // `x-default` points at the association's own first language.
    alternates: {
      canonical: `/${locale}`,
      languages: { fa: '/fa', de: '/de', 'x-default': '/fa' },
    },
    openGraph: {
      type: 'website',
      siteName: t('name'),
      locale: locale === 'fa' ? 'fa_IR' : 'de_AT',
      alternateLocale: locale === 'fa' ? 'de_AT' : 'fa_IR',
      url: `/${locale}`,
    },
    robots: { index: true, follow: true },
    icons: { icon: '/icon.png' },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Also enables static rendering: without the locale being set here the whole
  // subtree opts into dynamic rendering the moment anything reads it.
  const typed = requireLocale(locale);

  const settings = await getSettings();
  const theme = await readTheme(settings.defaultTheme);

  return (
    <html lang={typed} dir={localeDirection[typed]} data-theme={theme} suppressHydrationWarning>
      <head>
        {/*
          Turning the opening screen on, before the first paint.

          It has to be decided here rather than in the component: by the time
          React has hydrated the page is already on screen, and a loader that
          arrives after the content it is supposed to be covering is worse
          than none. This runs synchronously in the head, so the boot layer
          either paints from the first frame or never paints at all.

          It says no to a reader who has asked for less motion, and no to
          every page after the first in a session — three seconds of loader on
          each of sixteen pages is not a welcome, it is a toll. The timer is
          the safety net: if the bundle that clears this never arrives, the
          layer takes itself off anyway.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              "if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
              "if(sessionStorage.getItem('ham-boot'))return;" +
              "sessionStorage.setItem('ham-boot','1');" +
              "document.documentElement.dataset.boot='1';" +
              'setTimeout(function(){delete document.documentElement.dataset.boot},4000);' +
              '}catch(e){}})()',
          }}
        />
        {/*
          No font preload link here, on purpose.

          The faces are imported by the stylesheet and webpack emits them
          under `_next/static/media` with content hashes, so there is no
          stable path a hand-written <link> could name — and the absolute
          `/fonts/…` paths this used to carry were 404s the moment the files
          moved out of `public/`. The stylesheet is itself a render-blocking
          link in the head, so the browser starts fetching the face it needs
          as soon as it parses the @font-face rule: a few milliseconds later
          than a preload, and actually correct.
        */}
      </head>
      <body>
        <NextIntlClientProvider>
          <PrintPlates />
          <PatternDefs />
          {children}
          <RiseObserver />
          <Boot />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
