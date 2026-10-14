import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { locales, localeDirection } from '@/lib/i18n/config';
import { readTheme } from '@/lib/preferences';
import { THEME_COOKIE } from '@/components/site/theme';
import { ThemeKeeper } from '@/components/site/theme-keeper';
import { PhoneLoader } from '@/components/app/phone-loader';
import { getSettings } from '@/lib/db/queries/content';
import { PrintPlates } from '@/components/site/print-plates';
import { PatternDefs } from '@/components/site/ornaments';
import { RiseObserver } from '@/components/site/rise';
import { ServiceWorker } from '@/components/site/service-worker';
// The Homecoming scene's own layout and page states, first so this app's
// tokens below can override its three variables.
import '../globals.css';
import '@/lib/homecoming/homecoming.css';

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

/**
 * For the head scripts below: `b`, the prefix the app is served under —
 * empty in production, /HAM on the preview. Without it a route test never
 * matched there and the loader simply never armed.
 */
const BASE_PATH_SCRIPT = `var b=${JSON.stringify(process.env.NEXT_PUBLIC_BASE_PATH ?? '')};`;

/**
 * For the head scripts below: returns early unless this load is a fresh
 * visit — anything but a link followed from another of the site's own pages.
 * A reload is fresh, and so is a page reached from the admin or the login.
 * Expects `b` (BASE_PATH_SCRIPT) in scope. Any error in here leaves the load
 * counted as fresh: the loader plays, which is the safe side to fail on.
 */
const FRESH_VISIT =
  'try{' +
  "var n=performance.getEntriesByType('navigation')[0];" +
  "if(!n||n.type!=='reload'){" +
  'var u=new URL(document.referrer);' +
  'if(u.origin===location.origin){' +
  'var r=u.pathname;' +
  'if(b&&r.indexOf(b)===0)r=r.slice(b.length);' +
  'if(!/^\\/(admin|login)(\\/|$)/.test(r))return;' +
  '}}}catch(e){}';

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
    icons: {
      icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/icon.png`,
      apple: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/icons/apple-touch-icon.png`,
    },
    // The manifest and the service worker in `public/` are what make the
    // site installable as an app; the same prefix applies to the manifest.
    manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: t('name'), statusBarStyle: 'default' },
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

  const tBrand = await getTranslations({ locale: typed, namespace: 'brand' });
  const settings = await getSettings();
  const theme = await readTheme(settings.defaultTheme);

  return (
    <html
      lang={typed}
      dir={localeDirection[typed]}
      data-theme={theme}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/*
          The reader's theme, before the first paint.

          The toggle writes a cookie and the server reads it on the next
          render, which is the whole story on a server-rendered host. On the
          static preview there is no next render: every page is HTML that was
          built once, carrying whatever the theme was at build time. So dark
          mode survived exactly as long as you stayed on the page you set it
          on, and the next click put the lights back on.

          Reading the cookie here settles it before anything paints, on both
          hosts. In production it agrees with what the server already wrote
          and changes nothing; on the preview it is the only thing that
          knows. `<html>` carries suppressHydrationWarning for this.

          With no choice made yet, a phone or the app follows the phone's own
          light or dark setting, and keeps following it while it changes —
          until the reader picks one in Settings or on "More". A wide screen
          keeps the site's default, as it always has.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              `var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(dark|light)/);` +
              'var r=document.documentElement;' +
              'if(m){r.dataset.theme=m[1];}' +
              'else if(matchMedia("(max-width: 1023.98px)").matches){' +
              'var q=matchMedia("(prefers-color-scheme: dark)");' +
              'var f=function(){if(!/(?:^|; )' +
              THEME_COOKIE +
              '=/.test(document.cookie))r.dataset.theme=q.matches?"dark":"light";};' +
              'f();q.addEventListener("change",f);}' +
              '}catch(e){}})()',
          }}
        />
        {/*
          The hero's loader, armed before the first paint — on a fresh visit.

          `data-hc="boot"` is what keeps the header and the hero copy hidden
          until the birds have finished; the scene then moves it to "loading"
          and "ready". It is set here, in the head, rather than in the page,
          because by the time a script in the body runs the header has already
          had a chance to paint.

          Only on the home page, and only on screens 1024px wide or wider (a
          phone opens on the app's home screen, which has no scene).

          A fresh visit is a load that did not come from a link on another of
          the site's own pages (`FRESH_VISIT`). Inside the app a client-side
          navigation never re-runs this at all; the test matters on the static
          preview, where every internal link is a full load — without it,
          coming home from the logo in the bar played the whole four seconds
          again. A reload counts as fresh, and so does arriving from the admin
          or the login page: someone who has just saved a change and opens the
          site expects to see it the way a visitor does.

          This used to be once per browsing session, kept in sessionStorage.
          That outlived far more than a visit: on the real host, where one tab
          stays open through a login, an hour of editing and every reload, the
          loader was seen once and then never again.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              BASE_PATH_SCRIPT +
              "var p=location.pathname.replace(/\\/+$/,'');" +
              'if(b&&p.indexOf(b)===0)p=p.slice(b.length);' +
              'if(!/^(\\/(fa|de))?$/.test(p))return;' +
              // Phones open on the app's home screen, which has no scene to build.
              "if(matchMedia('(max-width: 1023.98px)').matches)return;" +
              FRESH_VISIT +
              "document.documentElement.dataset.hc='boot';" +
              '}catch(e){}})()',
          }}
        />
        {/*
          The phone loader (`PhoneLoader`), armed the same way: before the
          first paint, below 1024px, on a fresh visit, on whichever page the
          app or the site was opened at.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{' +
              "if(!matchMedia('(max-width: 1023.98px)').matches)return;" +
              // Its fade-out is an animation, and reduced motion turns every
              // animation off: it would never leave. So it never comes.
              "if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
              // Not for automated browsers: the end-to-end tests drive the
              // pages themselves, on software WebGL where it runs for ages.
              'if(navigator.webdriver)return;' +
              BASE_PATH_SCRIPT +
              FRESH_VISIT +
              "document.documentElement.dataset.splash='1';" +
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
          <PhoneLoader captionTitle={tBrand('name')} captionSub={`${tBrand('sub')} · Wien`} />
          <ThemeKeeper />
          <PrintPlates />
          <PatternDefs />
          {children}
          <RiseObserver />
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
