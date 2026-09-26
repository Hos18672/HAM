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
// The Homecoming scene's own layout and page states, first so this app's
// tokens below can override its three variables.
import '@/lib/homecoming/homecoming.css';
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
    // Next does not put `basePath` on a metadata icon, so the prefix is
    // written in: without it the preview asks the domain root for the
    // favicon and gets a 404.
    icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/icon.png` },
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
          The hero's loader, armed before the first paint — once per visit.

          `data-hc="boot"` is what keeps the header and the hero copy hidden
          until the birds have finished; the scene then moves it to "loading"
          and "ready". It is set here, in the head, rather than in the page,
          because by the time a script in the body runs the header has already
          had a chance to paint.

          Only on the home page, and only the first time this browsing session
          reaches it. Inside the app a client-side navigation never re-runs
          this at all, so the flag matters most on the static preview, where
          every internal link falls back to a full load: without it, coming
          home from the logo in the bar played the whole four seconds again.
          `sessionStorage` is the right shelf for it — the loader is worth
          seeing once each time someone comes to the site, and not once ever.

          The mark is set the moment the loader is armed rather than when it
          finishes: a reload halfway through is still a visit that has seen
          it, and nothing later in the page has to be trusted to record it.

          Reading the shelf is its own try/catch. Where storage throws — a
          locked-down private window — the loader simply plays, which is what
          it did before any of this.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              // The prefix the app is served under: empty in production, /HAM
              // on the preview. Without it this test never matched there and
              // the loader simply never armed.
              `var b=${JSON.stringify(process.env.NEXT_PUBLIC_BASE_PATH ?? '')};` +
              "var p=location.pathname.replace(/\\/+$/,'');" +
              'if(b&&p.indexOf(b)===0)p=p.slice(b.length);' +
              'if(!/^(\\/(fa|de))?$/.test(p))return;' +
              "try{if(sessionStorage.getItem('ham:hc')==='1')return;" +
              "sessionStorage.setItem('ham:hc','1')}catch(e){}" +
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
