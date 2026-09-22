import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { locales, localeDirection, type Locale } from '@/lib/i18n/config';
import { readTheme } from '@/lib/preferences';
import { getSettings } from '@/lib/db/queries/content';
import { PrintPlates } from '@/components/site/print-plates';
import { RiseObserver } from '@/components/site/rise';
import { PageWipe } from '@/components/site/page-wipe';
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
          Preload only the face this locale actually renders body text in.
          Preloading both would push ~140 KB the reader does not need onto the
          critical path, which is worse than the swap it would avoid.
        */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
          href={
            typed === 'fa'
              ? '/fonts/noto-naskh-arabic-arabic-wght-normal.woff2'
              : '/fonts/source-serif-4-latin-wght-normal.woff2'
          }
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <PrintPlates />
          {children}
          <RiseObserver />
          <PageWipe />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
