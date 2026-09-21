'use client';

import './globals.css';

/**
 * The last resort: an error thrown in the root layout itself, before any
 * locale or message catalogue exists. Both languages, no dependencies.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="de" dir="ltr">
      <body>
        <main className="page section-loose">
          <h1 style={{ fontSize: 'var(--text-3xl)' }}>Da ist etwas schiefgelaufen</h1>
          <p className="lead" lang="fa" dir="rtl" style={{ marginBlockStart: 'var(--space-2)' }}>
            مشکلی پیش آمد
          </p>
          <p style={{ marginBlockStart: 'var(--space-4)' }}>
            <button type="button" className="btn" onClick={reset}>
              Erneut versuchen
            </button>
          </p>
        </main>
      </body>
    </html>
  );
}
