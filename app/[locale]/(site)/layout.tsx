import type { ReactNode } from 'react';

import { requireLocale } from '@/lib/i18n/locale-param';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { PageEnter } from '@/components/site/page-enter';
import { WanderingBirds } from '@/components/site/wandering-birds';
import { EditBar } from '@/components/editable/edit-bar';
import { EditStatusProvider } from '@/components/editable/edit-status';
import { isEditing } from '@/lib/preferences';
import { getSettings } from '@/lib/db/queries/content';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const settings = await getSettings();
  // The site's default, not the reader's cookie: reading a cookie here would
  // render every page on every request. The head script in the root layout
  // puts the reader's own theme on <html> before the first paint, and the
  // toggle takes its state from there.
  const theme = settings.defaultTheme;
  const editing = await isEditing();

  const page = (
    <>
      <Header locale={typed} />
      <main
        id="main"
        style={{ minBlockSize: '60vh', paddingBlockEnd: editing ? 'var(--space-8)' : undefined }}
      >
        <PageEnter>{children}</PageEnter>
      </main>
      <Footer locale={typed} theme={theme} />
      <WanderingBirds />
    </>
  );

  // In edit mode the whole page shares one save-status context, so each
  // editable region reports into the same bottom bar.
  if (!editing) return page;

  return (
    <EditStatusProvider>
      {page}
      <EditBar locale={typed} />
    </EditStatusProvider>
  );
}
