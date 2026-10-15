import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { locales } from '@/lib/i18n/config';
import { getSettings } from '@/lib/db/queries/content';
import { SettingsScreen } from '@/components/app/settings-screen';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('settings'), robots: { index: false } };
}

/** The app's settings: kept on the device, reached from "More". */
export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  requireLocale(locale);
  const t = await getTranslations({ locale, namespace: 'nav' });
  // The default; the toggle reads the reader's own theme off <html>.
  const theme = (await getSettings()).defaultTheme;
  return (
    <>
      <h1 className="visually-hidden app-page-title">{t('settings')}</h1>
      <SettingsScreen theme={theme} />
    </>
  );
}
