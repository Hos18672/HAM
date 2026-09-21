import { getTranslations } from 'next-intl/server';
import { Card, CardFoot, FactPair } from '../ui/card';
import { Tag } from '../ui/tag';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { Course } from '@/lib/db/queries/content';

export async function CourseCard({ course, locale }: { course: Course; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'courses' });

  // Fall back to the raw key when a category has been added in the admin that
  // the catalogue does not know a label for yet.
  const categoryLabel = t.has(`category.${course.category}`)
    ? t(`category.${course.category}`)
    : course.category;

  return (
    <Card as="article" id={`course-${course.slug}`} className="h-full">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{categoryLabel}</Tag>
        {course.level ? <Tag tone="accent-2">{course.level}</Tag> : null}
      </div>

      <EditableText
        as="h3"
        entity="course"
        id={course.id}
        field="title"
        locale={locale}
        value={course.title}
        className="card-title"
      />

      <EditableText
        as="p"
        entity="course"
        id={course.id}
        field="body"
        locale={locale}
        value={course.body}
        className="card-body"
        multiline
      />

      <CardFoot style={{ display: 'grid', gap: 'var(--space-2)', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))' }}>
        <FactPair
          label={t('targetGroup')}
          value={
            <EditableText
              entity="course"
              id={course.id}
              field="targetGroup"
              locale={locale}
              value={course.targetGroup}
            />
          }
        />
        <FactPair
          label={t('schedule')}
          value={
            <EditableText
              entity="course"
              id={course.id}
              field="schedule"
              locale={locale}
              value={course.schedule}
            />
          }
        />
        <FactPair
          label={t('languages')}
          value={
            <EditableText
              entity="course"
              id={course.id}
              field="languages"
              locale={locale}
              value={course.languages}
            />
          }
        />
      </CardFoot>
    </Card>
  );
}
