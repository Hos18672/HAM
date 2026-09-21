import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { EditBar } from '@/components/editable/edit-bar';
import { EditStatusProvider } from '@/components/editable/edit-status';
import { readTheme, readEditSession } from '@/lib/preferences';
import { getSettings } from '@/lib/db/queries/content';
import type { Locale } from '@/lib/i18n/config';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const settings = await getSettings();
  const theme = await readTheme(settings.defaultTheme);
  const editing = (await readEditSession()) !== null;
  const typed = locale as Locale;

  const page = (
    <>
      <Header theme={theme} locale={typed} />
      <main
        id="main"
        className="page-enter"
        style={{ minBlockSize: '60vh', paddingBlockEnd: editing ? 'var(--space-8)' : undefined }}
      >
        {children}
      </main>
      <Footer locale={typed} />
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
