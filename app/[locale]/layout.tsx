import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, localeDirection, type Locale } from '@/lib/i18n/config';
import { readTheme } from '@/lib/preferences';
import { getSettings } from '@/lib/db/queries/content';
import { PrintPlates } from '@/components/site/print-plates';
import { PatternDefs } from '@/components/site/ornaments';
import { RiseObserver } from '@/components/site/rise';
// The Homecoming scene's own layout and page states, first so this app's
// tokens below can override its three variables.
import '@/lib/homecoming/homecoming.css';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Anything that is not one of the two locales is not a page. Without this the
 * segment still renders for, say, `/favicon.ico` — the layout calls
 * `notFound()`, but the page underneath has already started its queries and
 * asks Postgres for the locale "favicon.ico", which logs an error on every
 * such request. Refusing the param up front 404s before any of that runs.
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
    icons: { icon: '/icon.svg' },
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
  if (!hasLocale(locales, locale)) notFound();

  // Enables static rendering: without this the whole subtree opts into
  // dynamic rendering the moment anything reads the locale.
  setRequestLocale(locale);

  const settings = await getSettings();
  const theme = await readTheme(settings.defaultTheme);
  const typed = locale as Locale;

  return (
    <html lang={typed} dir={localeDirection[typed]} data-theme={theme} suppressHydrationWarning>
      <head>
        {/*
          The hero's loader, armed before the first paint.

          `data-hc="boot"` is what keeps the header and the hero copy hidden
          until the birds have finished; the scene then moves it to "loading"
          and "ready". It is set here, in the head, rather than in the page,
          because by the time a script in the body runs the header has already
          had a chance to paint.

          Only on the home page: the loader is the home hero, and the rest of
          the site has no business hiding its header. A client-side navigation
          never re-runs this, which is deliberate — arriving at the home page
          from inside the app shows the hero directly.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              "var p=location.pathname.replace(/\\/+$/,'');" +
              'if(!/^(\\/(fa|de))?$/.test(p))return;' +
              "document.documentElement.dataset.hc='boot';" +
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
