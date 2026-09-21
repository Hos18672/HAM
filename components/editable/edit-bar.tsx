import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { EditBarClient } from './edit-bar-client';

/**
 * The fixed bar along the bottom of the public site while edit mode is on:
 * status, last save, a link back to /admin, and Beenden.
 */
export async function EditBar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'edit' });

  return (
    <EditBarClient
      locale={locale}
      labels={{
        mode: t('mode'),
        lastSaved: t('lastSaved'),
        never: t('never'),
        saving: t('saving'),
        saved: t('saved'),
        failed: t('failed'),
        toAdmin: t('toAdmin'),
        exit: t('exit'),
        editing: t('editing', { locale: locale === 'fa' ? 'فارسی' : 'Deutsch' }),
      }}
    />
  );
}
