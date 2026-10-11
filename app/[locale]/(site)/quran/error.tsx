'use client';

import { useTranslations } from 'next-intl';
import { ErrorView } from '@/components/site/error-view';

/**
 * The Quran text comes from an upstream service. When it is down the reader
 * says so in plain words and offers the way back to the list of surahs.
 */
export default function QuranError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('quran');
  return (
    <ErrorView
      {...props}
      title={t('unavailableTitle')}
      body={t('unavailable')}
      back={{ href: '/quran', label: t('allSurahs') }}
    />
  );
}
