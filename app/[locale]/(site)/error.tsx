'use client';

import { ErrorView } from '@/components/site/error-view';

/** A page that failed, shown inside the site's own header, footer and tab bar. */
export default function SiteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
