import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageHeader, getCourses } from '@/lib/db/queries/content';
import { PageHead } from '@/components/site/page-head';
import { CourseCard } from '@/components/site/course-card';
import { FilterableList } from '@/components/site/filterable-list';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { JsonLd, courseJsonLd } from '@/lib/seo';
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
  return pageMetadata('courses', locale, '/courses');
}

export default async function CoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, courses] = await Promise.all([getPageHeader('courses', typed), getCourses(typed)]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'courses' });

  // Rendered on the server, then handed to the client filter as ready markup.
  const items = await Promise.all(
    courses.map(async (course) => ({
      key: course.id,
      category: course.category,
      node: (
        <EditableEntry entity="course" id={course.id} isLast={courses.length <= 1}>
          <CourseCard course={course} locale={typed} />
        </EditableEntry>
      ),
    })),
  );

  return (
    <>
      {courses.map((course) => (
        <JsonLd key={course.id} data={courseJsonLd(course, typed)} />
      ))}

      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page">
          <FilterableList
            items={items}
            label={t('filterByCategory')}
            labelNamespace="courses"
            emptyMessage={t('none')}
            className="columns-feature"
          />
          <div style={{ marginBlockStart: 'var(--space-5)' }}>
            <EditableAdd entity="course" />
          </div>
        </div>
      </section>
    </>
  );
}
