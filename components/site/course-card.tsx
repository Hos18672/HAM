import { getTranslations } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Card, CardStar } from '../ui/card';
import { Tag } from '../ui/tag';
import { LinkButton } from '../ui/button';
import { Icon } from './icon';
import { EditableText } from '@/components/editable/editable-text';
import type { Locale } from '@/lib/i18n/config';
import type { Course } from '@/lib/db/queries/content';
import { formatTiming } from '@/lib/schedule';
import { contactHref } from '@/lib/topics';

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

  const when = formatTiming(course, locale) || course.schedule;
  const signUp = tActions('signUp');

  return (
    <Card as="article" id={`course-${course.slug}`} className="course-card h-full">
      {/* The card head: the badge, then one tag naming the area and level
          together — "Sprache · A1" — rather than two tags run into one. */}
      <div className="flex items-center gap-3">
        <CardStar>
          <Icon name={CATEGORY_ICONS[course.category] ?? 'BookOpen'} size={26} />
        </CardStar>
        <Tag>
          {categoryLabel}
          {course.level ? (
            <>
              {' · '}
              <span className="ltr-island">{course.level}</span>
            </>
          ) : null}
        </Tag>
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
      />

      <EditableText
        as="p"
        entity="course"
        id={course.id}
        field="body"
        locale={locale}
        value={course.body}
        className="card-body clamp-2"
        multiline
      />

      {/* The practicals as a compact grid: who, when, in which language, and
          what it costs. A row with nothing in it is left out. */}
      <dl className="meta-grid">
        {course.targetGroup ? (
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
        ) : null}
        {when ? (
          <div>
            <dt>{t('schedule')}</dt>
            <dd>{when}</dd>
          </div>
        ) : null}
        {course.languages ? (
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
        ) : null}
        {course.fee ? (
          <div>
            <dt>{t('fee')}</dt>
            <dd>
              <EditableText
                entity="course"
                id={course.id}
                field="fee"
                locale={locale}
                value={course.fee}
              />
            </dd>
          </div>
        ) : null}
      </dl>

      {/* The way in: straight to the contact form, with the course already
          filled in. The accessible name carries the course. */}
      <LinkButton
        href={contactHref(locale, 'course', course.slug)}
        size="sm"
        aria-label={`${signUp}: ${course.title}`}
        style={{ marginBlockStart: 'auto', alignSelf: 'start' }}
      >
        <span>{signUp}</span>
        <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
      </LinkButton>
    </Card>
  );
}
