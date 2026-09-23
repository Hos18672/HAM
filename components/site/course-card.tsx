import { getTranslations } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Card, CardStar } from '../ui/card';
import { Tag } from '../ui/tag';
import { LinkButton } from '../ui/button';
import { Icon } from './icon';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { Course } from '@/lib/db/queries/content';

/**
 * The badge inside a course card's star.
 *
 * The design badges every course; the catalogue's categories are the only
 * thing on the row that can choose one, so they do. It is `aria-hidden`
 * ornament sitting beside the category's own written label — the icon never
 * carries the category on its own.
 */
const CATEGORY_ICONS: Record<string, string> = {
  language: 'Translate',
  religion: 'HandsPraying',
  children: 'Sparkle',
  adults: 'GraduationCap',
  integration: 'Compass',
  art: 'PaintBrush',
};

export async function CourseCard({ course, locale }: { course: Course; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'courses' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });

  // Fall back to the raw key when a category has been added in the admin that
  // the catalogue does not know a label for yet.
  const categoryLabel = t.has(`category.${course.category}`)
    ? t(`category.${course.category}`)
    : course.category;

  return (
    <Card as="article" id={`course-${course.slug}`} className="h-full" plate>
      {/* The design's card head: the badge at the start, the labels opposite. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardStar>
          <Icon name={CATEGORY_ICONS[course.category] ?? 'BookOpen'} size={26} />
        </CardStar>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{categoryLabel}</Tag>
          {course.level ? <Tag tone="accent-2">{course.level}</Tag> : null}
        </div>
      </div>

      <EditableText
        as="h3"
        entity="course"
        id={course.id}
        field="title"
        locale={locale}
        value={course.title}
        className="card-title"
        style={{ marginBlockStart: 'var(--space-2)' }}
        words="tight"
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
        rise
      />

      {/* Three facts in one column, ruled off — the design sets the labels in
          gold ink at a fixed measure so the values line up down the card. */}
      <dl className="fact-list">
        <div>
          <dt>{t('targetGroup')}</dt>
          <dd>
            <EditableText
              entity="course"
              id={course.id}
              field="targetGroup"
              locale={locale}
              value={course.targetGroup}
            />
          </dd>
        </div>
        <div>
          <dt>{t('schedule')}</dt>
          <dd>
            <EditableText
              entity="course"
              id={course.id}
              field="schedule"
              locale={locale}
              value={course.schedule}
            />
          </dd>
        </div>
        <div>
          <dt>{t('languages')}</dt>
          <dd>
            <EditableText
              entity="course"
              id={course.id}
              field="languages"
              locale={locale}
              value={course.languages}
            />
          </dd>
        </div>
      </dl>

      {/* The design closes every course card on a way in. The accessible name
          carries the course, so seven of these are not seven "Mehr erfahren". */}
      <LinkButton
        href={`/${locale}/contact`}
        variant="secondary"
        size="sm"
        aria-label={`${tActions('readMore')}: ${course.title}`}
        style={{ marginBlockStart: 'var(--space-4)', alignSelf: 'start' }}
      >
        <span>{tActions('readMore')}</span>
        <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
      </LinkButton>
    </Card>
  );
}
