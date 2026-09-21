import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('error');

  return (
    <div className="page section-loose">
      <div className="rail">
        <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
          <p className="kicker">404</p>
        </div>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--text-4xl)' }}>{t('notFoundTitle')}</h1>
          <p className="lead">{t('notFoundBody')}</p>
          <p>
            <Link href="/" className="btn" style={{ width: 'fit-content' }}>
              {t('backHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
