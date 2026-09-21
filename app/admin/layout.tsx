import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { readTheme } from '@/lib/preferences';
import { AdminNav } from '@/components/admin/admin-nav';
import { ToastProvider } from '@/components/admin/toast';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: 'Redaktion', template: '%s — Redaktion' },
  robots: { index: false, follow: false },
};

/**
 * The admin shell.
 *
 * Sits outside the `[locale]` tree: the interface is German-only. Content is
 * still edited in both languages — that happens inside the fields, not in the
 * chrome around them.
 *
 * The session is checked here as well as in middleware. Middleware only sees
 * whether a cookie exists; this reads the actual session.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?from=/admin');

  const theme = await readTheme('light');

  return (
    <html lang="de" dir="ltr" data-theme={theme} suppressHydrationWarning>
      <body>
        <ToastProvider>
          <a className="skip-link" href="#admin-main">
            Zum Inhalt springen
          </a>

          <header
            className="sticky top-0"
            style={{
              zIndex: 'var(--z-header)',
              background: 'var(--color-bg)',
              borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)',
            }}
          >
            <div
              className="page flex flex-wrap items-center gap-3"
              style={{ paddingBlock: 'var(--space-2)' }}
            >
              <Link
                href="/admin"
                style={{ textDecoration: 'none', color: 'var(--color-ink)', lineHeight: 1.1 }}
              >
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
                  Redaktion
                </span>
                <span className="kicker" style={{ display: 'block' }}>
                  Haus aller Menschen
                </span>
              </Link>

              <AdminNav
                role={session.user.role}
                userName={session.user.name ?? session.user.email ?? ''}
              />
            </div>
          </header>

          <main id="admin-main" className="page section-tight">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
