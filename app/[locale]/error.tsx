'use client';

import { ErrorView } from '@/components/site/error-view';

/**
 * The localized error boundary of last resort, for an error thrown by the site
 * layout itself. Errors inside a page are caught by `(site)/error.tsx`, which
 * keeps the header and the tab bar around them.
 */
export default function LocaleError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView {...props} />;
}
