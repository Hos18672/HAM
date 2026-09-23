import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getDuas } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { DuaCard } from '@/components/site/dua-card';
import { FilterableList } from '@/components/site/filterable-list';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { pageMetadata } from '@/lib/page-meta';
import { locales, type Locale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('duas', locale, '/duas');
}

export default async function DuasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, duas] = await Promise.all([getPageHeader('duas', typed), getDuas(typed)]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'duas' });

  const items = await Promise.all(
    duas.map(async (dua) => ({
      key: dua.id,
      category: dua.category,
      node: (
        <EditableEntry entity="dua" id={dua.id} isLast={duas.length <= 1}>
          <DuaCard dua={dua} locale={typed} />
        </EditableEntry>
      ),
    })),
  );

  return (
    <>
      <PageHead header={header} locale={typed} />
      <section className="section" data-rise>
        <div className="page">
          <FilterableList
            items={items}
            label={t('filterByCategory')}
            labelNamespace="duas"
            emptyMessage={t('none')}
            className="columns-feature"
          />
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="dua" />
          </div>
          {/* The design closes the page on where the full texts actually are. */}
          <p
            className="text-sm"
            style={{
              marginBlockStart: 'clamp(26px, 3vw, 40px)',
              color: 'var(--color-ink-muted)',
              maxInlineSize: '68ch',
            }}
          >
            {t('note')}
          </p>
        </div>
      </section>
    </>
  );
}
