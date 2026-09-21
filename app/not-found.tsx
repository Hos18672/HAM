import Link from 'next/link';
import './globals.css';

/**
 * The root 404, reached only when the locale segment itself did not match —
 * so there is no message catalogue to read from and both languages are shown.
 */
export default function RootNotFound() {
  return (
    <html lang="de" dir="ltr">
      <body>
        <main className="page section-loose" id="main">
          <p className="kicker">404</p>
          <h1 style={{ fontSize: 'var(--text-4xl)', marginBlockStart: 'var(--space-2)' }}>
            Diese Seite gibt es nicht
          </h1>
          <p className="lead" style={{ marginBlockStart: 'var(--space-2)' }} lang="fa" dir="rtl">
            این صفحه وجود ندارد
          </p>
          <p style={{ marginBlockStart: 'var(--space-4)' }} className="flex gap-2">
            <Link href="/de" className="btn">
              Zur Startseite
            </Link>
            <Link href="/fa" className="btn btn-secondary">
              به صفحهٔ نخست
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
