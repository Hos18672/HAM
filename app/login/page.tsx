import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { readTheme } from '@/lib/preferences';
import { LoginForm } from './login-form';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Redaktion',
  robots: { index: false, follow: false },
};

/**
 * The editorial login. Outside the `[locale]` tree on purpose: the admin is
 * German-only, so it does not need the locale segment or the message
 * catalogues.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  // Already signed in: go where they were headed.
  const session = await auth();
  if (session?.user) redirect(from && from.startsWith('/admin') ? from : '/admin');

  // This route owns its own <html>, so it has to read the theme cookie itself
  // — without it the login screen is the one surface that ignores dark mode.
  const theme = await readTheme('light');

  return (
    <html lang="de" dir="ltr" data-theme={theme} suppressHydrationWarning>
      <body>
        <main className="page section-loose" id="main" style={{ maxInlineSize: '34rem' }}>
          <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
            <p className="kicker">Haus aller Menschen</p>
          </div>
          <h1 style={{ fontSize: 'var(--text-5xl)', marginBlockStart: 'var(--space-4)' }}>
            Redaktion
          </h1>
          <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }}>
            Melden Sie sich an, um die Inhalte der Website zu bearbeiten.
          </p>

          <div style={{ marginBlockStart: 'var(--space-6)' }}>
            <LoginForm
              redirectTo={from && from.startsWith('/admin') ? from : '/admin'}
              initialError={error}
            />
          </div>
        </main>
      </body>
    </html>
  );
}
