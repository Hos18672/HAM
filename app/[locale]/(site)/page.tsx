import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import {
  getPageHeader,
  getBlocks,
  getOffers,
  getUpcomingEvents,
  getCourses,
  getSettings,
} from '@/lib/db/queries/content';
import { SectionHead } from '@/components/site/page-head';
import { EventRow } from '@/components/site/event-row';
import { NextPrayerCard, PrayerStrip } from '@/components/ui/next-prayer';
import { PatternPlate, Ring, Corner, Eye } from '@/components/site/ornaments';
import { OpeningHours, Directions, HouseMap } from '@/components/site/house-info';
import { OpenNow } from '@/components/site/open-now';
import { getPrayerDay } from '@/lib/prayer-page';
import { FACTS } from '@/lib/site-facts';
import { CourseCard } from '@/components/site/course-card';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { LinkButton } from '@/components/ui/button';
import { Icon } from '@/components/site/icon';
import { delay } from '@/components/site/motion';
import { organizationJsonLd, JsonLd } from '@/lib/seo';
import { isLocale, locales } from '@/lib/i18n/config';

/** The next-prayer strip is rendered with the page; the browser keeps it current. */
export const revalidate = 3600;

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
  const typed = requireLocale(locale);

  const [header, blocks, offers, upcoming, courses, settings] = await Promise.all([
    getPageHeader('home', typed),
    getBlocks('home', typed),
    getOffers(typed),
    getUpcomingEvents(typed, 3),
    getCourses(typed, 3),
    getSettings(),
  ]);
  const prayerDay = await getPrayerDay(new Date());

  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tEvents = await getTranslations({ locale, namespace: 'events' });
  const tHouse = await getTranslations({ locale, namespace: 'house' });

  return (
    <>
      <JsonLd data={organizationJsonLd(typed, settings)} />

      {/* ── Hero ──────────────────────────────────────────────────────────
          On the deep green band: the kicker, the title, the lead and the two
          ways in, beside the house's seal. Each piece rises into place
          once, a beat after the one before. On a phone the next prayer sits
          under the buttons; wide screens get the day's six times below. The
          copy is server-rendered and editable in place, as before. */}
      <section className="home-hero-band">
        {/* The band's own ground, as it always was: the girih drifting
            behind the deep green, the rings and the gold corners. */}
        <PatternPlate tiling="shesh" drift opacity={0.75} />
        <Ring />
        <Ring size={340} top={-100} />
        <Corner place="start" />
        <Corner place="end" />
        <div className="page home-hero">
          <div className="home-hero-copy">
            <div className="home-hero-kicker hero-in" style={{ '--d': '0ms' } as CSSProperties}>
              <Eye />
              <EditableText
                as="p"
                entity="page"
                id={header.id}
                field="kicker"
                locale={typed}
                value={header.kicker}
                className="kicker"
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
              className="home-hero-title hero-in"
              style={{ '--d': '80ms' } as CSSProperties}
            />

            <EditableText
              as="p"
              entity="page"
              id={header.id}
              field="lead"
              locale={typed}
              value={header.lead}
              className="home-hero-lead hero-in"
              style={{ '--d': '180ms' } as CSSProperties}
              multiline
            />

            <div className="home-hero-actions hero-in" style={{ '--d': '280ms' } as CSSProperties}>
              <LinkButton href={`/${locale}/about`} size="lg" className="btn-gold">
                {t('heroAbout')}
                <ArrowRight size={17} weight="bold" aria-hidden="true" className="mirror" />
              </LinkButton>
              <LinkButton
                href={`/${locale}/activities`}
                size="lg"
                variant="secondary"
                className="btn-on-scrim"
              >
                {t('heroActivities')}
              </LinkButton>
            </div>

            <NextPrayerCard day={prayerDay} locale={typed} className="home-hero-prayer" />
          </div>

          <figure
            className="home-hero-media hero-in"
            style={{ '--d': '200ms' } as CSSProperties}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- the seal, at a known size */}
            <img
              className="home-hero-seal"
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo-512.webp`}
              srcSet={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo-160.webp 160w, ${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo-512.webp 512w`}
              sizes="(min-width: 1100px) 300px, 240px"
              alt=""
              width={512}
              height={512}
              fetchPriority="high"
            />
          </figure>
        </div>
      </section>

      <div className="page home-strip">
        <PrayerStrip day={prayerDay} locale={typed} />
      </div>

      {/* ── Intro statement ──────────────────────────────────────────────── */}
      <section className="section section-alt" data-rise>
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
                  rise
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
          {/* Each area goes to the page that holds it: the whole card is the
              link, and the arrow says so. */}
          <ul className="columns-feature" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {offers.map((offer) => (
              <li key={offer.id} data-rise>
                <EditableEntry entity="offer" id={offer.id} isLast={offers.length <= 1}>
                  <Card as="article" className="card-linked h-full">
                    <CardStar>
                      <Icon name={offer.icon} size={26} />
                    </CardStar>
                    <h3 className="card-title">
                      {offer.href ? (
                        <Link href={offer.href} className="card-link">
                          <EditableText
                            entity="offer"
                            id={offer.id}
                            field="title"
                            locale={typed}
                            value={offer.title}
                          />
                        </Link>
                      ) : (
                        <EditableText
                          entity="offer"
                          id={offer.id}
                          field="title"
                          locale={typed}
                          value={offer.title}
                        />
                      )}
                    </h3>
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
                    {offer.href ? (
                      <span className="card-go" aria-hidden="true">
                        {tActions('readMore')}
                        <ArrowRight size={16} weight="bold" className="mirror" />
                      </span>
                    ) : null}
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

      {/* ── Upcoming events ──────────────────────────────────────────────── */}
      {upcoming.length > 0 ? (
        <section className="section" data-rise>
          <div className="page">
            <SectionHead kicker={t('upcoming')} title={tNav('events')} />
            <ul className="event-list">
              {upcoming.map((event) => (
                <li key={event.id} data-rise>
                  <EventRow event={event} locale={typed} />
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
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
              </Link>
            </p>
          </div>
        </section>
      ) : (
        <section className="section" data-rise>
          <div className="page">
            <p style={{ color: 'var(--color-ink-muted)' }}>{tEvents('none')}</p>
          </div>
        </section>
      )}

      {/* ── Courses preview ──────────────────────────────────────────────── */}
      {courses.length > 0 ? (
        <section className="section section-alt" data-rise>
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
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Vienna & location ──────────────────────────────────────────────
          The design closes the page on the city itself: the text on one side,
          a drawing of Vienna in a single gold line on the other, both on
          paper rather than on the band. */}
      <section className="section-loose">
        <div className="page">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 'clamp(34px, 4vw, 72px)',
              alignItems: 'center',
            }}
          >
            <div>
              <div className="flex items-center gap-3" data-rise>
                <span
                  aria-hidden="true"
                  style={{ inlineSize: '26px', blockSize: '1px', background: 'var(--gold)' }}
                />
                <p className="kicker">{t('vienna')}</p>
              </div>

              {blocks.vienna_title ? (
                <EditableText
                  as="h2"
                  entity="block"
                  id={blocks.vienna_title.id}
                  field="text"
                  locale={typed}
                  value={blocks.vienna_title.text}
                  style={{
                    ...delay(80),
                    marginBlockStart: '18px',
                    fontSize: 'clamp(28px, 3.6vw, 44px)',
                    lineHeight: 1.12,
                  }}
                  words
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
                  rise
                  style={{
                    ...delay(150),
                    marginBlockStart: '20px',
                    fontSize: 'var(--text-lg)',
                    lineHeight: 1.9,
                    maxInlineSize: '36em',
                  }}
                />
              ) : null}

              <div data-rise style={{ ...delay(210) }} className="home-visit">
                <p className="contact-address">
                  <span className="ltr-island">{settings.address}</span>
                </p>
                <div className="contact-hours-head">
                  <h3 className="contact-h">{tHouse('hours')}</h3>
                  <OpenNow />
                </div>
                <OpeningHours locale={typed} />
                <h3 className="contact-h" style={{ marginBlockStart: 'var(--space-3)' }}>
                  {tHouse('directionsTitle')}
                </h3>
                <Directions locale={typed} />
              </div>

              <p data-rise style={{ ...delay(280), marginBlockStart: '32px' }}>
                <LinkButton href={`/${locale}/contact`}>
                  {tActions('contact')}
                  <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
                </LinkButton>
              </p>
            </div>

            <div data-rise>
              <HouseMap locale={typed} mapUrl={settings.mapUrl || FACTS.mapUrl} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
