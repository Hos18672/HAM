import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { hasLocale } from 'next-intl';
import { routing } from './lib/i18n/navigation';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Two jobs, in order:
 *   1. `/admin/*` is gated. This is a convenience gate only — every admin
 *      server action re-checks the session itself, because a server action is
 *      an HTTP endpoint that middleware does not sit in front of.
 *   2. Everything else goes through next-intl, which adds the locale prefix
 *      and redirects `/` to the default locale.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    // Read the session cookie's presence only. Verifying the JWT needs the
    // Node crypto APIs that the edge runtime does not expose, and the real
    // check happens in the layout and in every action.
    const hasSession =
      request.cookies.has('authjs.session-token') ||
      request.cookies.has('__Secure-authjs.session-token');

    if (!hasSession) {
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // The bare root is the one address that carries no language, and
  // `localeDetection` is off on purpose: a first-time reader gets the
  // house's own Persian rather than whatever their browser asks for. But a
  // reader who has picked a language should not be sent back to Persian
  // every time they open the site without a path, so an explicit choice —
  // and only an explicit one, written by the switch in the bar — is
  // honoured here.
  if (pathname === '/') {
    const chosen = request.cookies.get('NEXT_LOCALE')?.value;
    if (chosen && chosen !== routing.defaultLocale && hasLocale(routing.locales, chosen)) {
      return NextResponse.redirect(new URL(`/${chosen}`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
