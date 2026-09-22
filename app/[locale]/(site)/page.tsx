import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import {
  getPageHeader,
  getBlocks,
  getOffers,
  getUpcomingEvents,
  getFeaturedEvent,
  getCourses,
  getSettings,
} from '@/lib/db/queries/content';
import { SectionHead } from '@/components/site/page-head';
import { EventCard, DayPlate } from '@/components/site/event-card';
import { CourseCard } from '@/components/site/course-card';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { LinkButton } from '@/components/ui/button';
import { Icon } from '@/components/site/icon';
import { ViennaSkyline, PatternPlate } from '@/components/site/ornaments';
import { formatDate, formatTime } from '@/lib/i18n/format';
import { organizationJsonLd, eventJsonLd, JsonLd } from '@/lib/seo';
import { isLocale, locales, type Locale } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // See lib/page-meta.ts: metadata runs before the layout can 404.
  if (!isLocale(locale)) return {};

  const header = await getPageHeader('home', locale);
  return {
    title: header?.title,
    description: header?.lead,
    alternates: { canonical: `/${locale}`, languages: { fa: '/fa', de: '/de' } },
    openGraph: { title: header?.title, description: header?.lead },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const typed = locale as Locale;

  const [header, blocks, offers, featured, upcoming, courses, settings] = await Promise.all([
    getPageHeader('home', typed),
    getBlocks('home', typed),
    getOffers(typed),
    getFeaturedEvent(typed),
    getUpcomingEvents(typed, 3),
    getCourses(typed, 3),
    getSettings(),
  ]);

  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tEvents = await getTranslations({ locale, namespace: 'events' });

  const showFeatured = settings.showOpeningEvent && featured;
  const chips = blocks.hero_chips?.items ?? [];

  return (
    <>
      <JsonLd data={organizationJsonLd(typed, settings)} />
      {showFeatured ? <JsonLd data={eventJsonLd(featured, typed, settings)} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────────
          The design opens on a band, not on paper: deep green under cream,
          the girih ground drifting across it, and a 460px circle hung off the
          top corner. The text sits beside a portrait frame rather than under
          a rail. */}
      <section
        style={{
          position: 'relative',
          background: 'var(--band)',
          color: 'var(--bandInk)',
          overflow: 'hidden',
          paddingBlock: 'clamp(var(--space-6), 6vw, var(--space-9))',
        }}
      >
        <PatternPlate drift opacity={0.75} />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInlineEnd: '-140px',
            insetBlockStart: '-160px',
            inlineSize: '460px',
            blockSize: '460px',
            border: 'var(--rule-hair) solid var(--patBand)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div className="page" style={{ position: 'relative' }}>
          <div
            style={{
              display: 'grid',
              gap: 'clamp(var(--space-5), 5vw, var(--space-8))',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div className="fade-in flex flex-wrap items-center gap-3">
                <EditableText
                  as="p"
                  entity="page"
                  id={header.id}
                  field="kicker"
                  locale={typed}
                  value={header.kicker}
                  className="kicker"
                  style={{ color: 'var(--gold)' }}
                />
                {blocks.hero_badge?.text ? (
                  <Tag tone="accent-2">
                    <EditableText
                      entity="block"
                      id={blocks.hero_badge.id}
                      field="text"
                      locale={typed}
                      value={blocks.hero_badge.text}
                    />
                  </Tag>
                ) : null}
              </div>

              <EditableText
                as="h1"
                entity="page"
                id={header.id}
                field="title"
                locale={typed}
                value={header.title}
                style={{
                  fontSize: 'clamp(35px, 5.2vw, 64px)',
                  lineHeight: 1.08,
                  color: 'var(--bandHead)',
                }}
                words="hero"
              />

              <EditableText
                as="p"
                entity="page"
                id={header.id}
                field="lead"
                locale={typed}
                value={header.lead}
                className="lead"
                multiline
                style={{ fontSize: 'var(--text-xl)', color: 'var(--bandDim)' }}
                words="lines"
              />

              <div className="flex flex-wrap items-center gap-2">
                <LinkButton href={`/${locale}/support`} size="lg" className="btn-gold">
                  {tNav('support')}
                  <ArrowRight size={17} weight="bold" aria-hidden="true" className="mirror" />
                </LinkButton>
                <LinkButton
                  href={`/${locale}/activities`}
                  size="lg"
                  variant="secondary"
                  className="btn-on-scrim"
                >
                  {tActions('readMore')}
                  <ArrowRight size={17} weight="bold" aria-hidden="true" className="mirror" />
                </LinkButton>
              </div>

              {chips.length > 0 ? (
                <ul
                  className="flex flex-wrap gap-2"
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    marginBlockStart: 'var(--space-2)',
                  }}
                >
                  {chips.map((chip) => (
                    <li key={chip}>
                      <Tag>{chip}</Tag>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* The portrait frame. The design fills it with a photograph of the
                house; until the association has uploaded one, it carries the
                site's own skyline rather than a grey placeholder. */}
            <div className="fade-in frame-wrap">
              <div
                className="frame tile"
                style={{ aspectRatio: '4 / 5', maxBlockSize: '640px', display: 'grid' }}
              >
                <ViennaSkyline />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intro statement ──────────────────────────────────────────────── */}
      <section className="section" data-rise>
        <div className="page">
          <div className="rail">
            <div />
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {blocks.intro_line ? (
                <EditableText
                  as="p"
                  entity="block"
                  id={blocks.intro_line.id}
                  field="text"
                  locale={typed}
                  value={blocks.intro_line.text}
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontStyle: 'italic',
                    maxInlineSize: 'var(--measure-narrow)',
                  }}
                />
              ) : null}
              {blocks.intro_body ? (
                <EditableText
                  as="p"
                  entity="block"
                  id={blocks.intro_body.id}
                  field="text"
                  locale={typed}
                  value={blocks.intro_body.text}
                  multiline
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── Offer cards ──────────────────────────────────────────────────── */}
      <section className="section" data-rise>
        <div className="page">
          <SectionHead kicker={t('offers')} title={tNav('activities')} />
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {offers.map((offer) => (
              <li key={offer.id} data-rise>
                <EditableEntry entity="offer" id={offer.id} isLast={offers.length <= 1}>
                  <Card as="article" className="h-full" plate>
                    <CardStar>
                      <Icon name={offer.icon} size={26} />
                    </CardStar>
                    <EditableText
                      as="h3"
                      entity="offer"
                      id={offer.id}
                      field="title"
                      locale={typed}
                      value={offer.title}
                      className="card-title"
                    />
                    <EditableText
                      as="p"
                      entity="offer"
                      id={offer.id}
                      field="body"
                      locale={typed}
                      value={offer.body}
                      className="card-body"
                      multiline
                    />
                  </Card>
                </EditableEntry>
              </li>
            ))}
          </ul>
          <div style={{ marginBlockStart: 'var(--space-4)' }}>
            <EditableAdd entity="offer" />
          </div>
        </div>
      </section>

      {/* ── Featured opening event ───────────────────────────────────────── */}
      {showFeatured ? (
        <section className="section" data-rise>
          <div className="page">
            <div className="rail">
              <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
                <p className="kicker">{t('openingEvent')}</p>
                <div style={{ marginBlockStart: 'var(--space-3)' }}>
                  <DayPlate date={featured.startsAt} locale={typed} />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <EditableText
                  as="h2"
                  entity="event"
                  id={featured.id}
                  field="title"
                  locale={typed}
                  value={featured.title}
                  style={{ fontSize: 'var(--text-3xl)' }}
                />

                <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                  <time dateTime={featured.startsAt.toISOString()}>
                    {formatDate(featured.startsAt, typed, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' · '}
                    {formatTime(featured.startsAt, typed)}
                    {featured.endsAt ? `–${formatTime(featured.endsAt, typed)}` : ''}
                  </time>
                  {featured.location ? (
                    <>
                      {' · '}
                      <EditableText
                        entity="event"
                        id={featured.id}
                        field="location"
                        locale={typed}
                        value={featured.location}
                      />
                    </>
                  ) : null}
                </p>

                <EditableText
                  as="p"
                  entity="event"
                  id={featured.id}
                  field="body"
                  locale={typed}
                  value={featured.body}
                  multiline
                />

                {featured.programme.length > 0 ? (
                  <div style={{ marginBlockStart: 'var(--space-2)' }}>
                    <p className="kicker" style={{ marginBlockEnd: 'var(--space-2)' }}>
                      {t('programme')}
                    </p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
                      {featured.programme.map((item) => (
                        <li
                          key={item.id}
                          style={{
                            display: 'flex',
                            gap: 'var(--space-3)',
                            paddingBlock: 'var(--space-2)',
                            borderBlockEnd: 'var(--rule-hair) solid var(--color-rule)',
                          }}
                        >
                          <EditableText
                            entity="programme"
                            id={item.id}
                            field="timeLabel"
                            locale={typed}
                            value={item.timeLabel}
                            className="tabular"
                            style={{
                              inlineSize: '4rem',
                              flexShrink: 0,
                              color: 'var(--color-accent-text)',
                              fontWeight: 'var(--weight-semibold)',
                            }}
                          />
                          <EditableText
                            entity="programme"
                            id={item.id}
                            field="title"
                            locale={typed}
                            value={item.title}
                          />
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginBlockStart: 'var(--space-3)' }}>
                      <EditableAdd entity="programme" parentId={featured.id} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Upcoming events ──────────────────────────────────────────────── */}
      {upcoming.length > 0 ? (
        <section className="section" data-rise>
          <div className="page">
            <SectionHead kicker={t('upcoming')} title={tNav('events')} />
            <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {upcoming.map((event) => (
                <li key={event.id} data-rise>
                  <EventCard event={event} locale={typed} />
                </li>
              ))}
            </ul>
            <p style={{ marginBlockStart: 'var(--space-4)' }}>
              <Link
                href="/events"
                className="flex items-center gap-1"
                style={{ width: 'fit-content' }}
              >
                {tActions('allEvents')}
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </p>
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="page">
            <p style={{ color: 'var(--color-ink-muted)' }}>{tEvents('none')}</p>
          </div>
        </section>
      )}

      {/* ── Courses preview ──────────────────────────────────────────────── */}
      {courses.length > 0 ? (
        <section className="section" data-rise>
          <div className="page">
            <SectionHead kicker={t('coursesPreview')} title={tNav('courses')} />
            <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {courses.map((course) => (
                <li key={course.id} data-rise>
                  <CourseCard course={course} locale={typed} />
                </li>
              ))}
            </ul>
            <p style={{ marginBlockStart: 'var(--space-4)' }}>
              <Link
                href="/courses"
                className="flex items-center gap-1"
                style={{ width: 'fit-content' }}
              >
                {tActions('allCourses')}
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Vienna & location ────────────────────────────────────────────── */}
      <section className="section-loose" data-rise>
        <div className="page">
          <div className="rail">
            <div className="head-rule" style={{ paddingBlockStart: 'var(--space-2)' }}>
              <p className="kicker">{t('vienna')}</p>
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {blocks.vienna_title ? (
                <EditableText
                  as="h2"
                  entity="block"
                  id={blocks.vienna_title.id}
                  field="text"
                  locale={typed}
                  value={blocks.vienna_title.text}
                  style={{ fontSize: 'var(--text-3xl)' }}
                />
              ) : null}
              {blocks.vienna_body ? (
                <EditableText
                  as="p"
                  entity="block"
                  id={blocks.vienna_body.id}
                  field="text"
                  locale={typed}
                  value={blocks.vienna_body.text}
                  multiline
                />
              ) : null}
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                <span className="ltr-island">{settings.address}</span>
              </p>
              <p>
                <LinkButton href={`/${locale}/contact`} variant="secondary">
                  {tActions('contact')}
                </LinkButton>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
