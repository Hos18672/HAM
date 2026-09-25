import type { Metadata } from 'next';
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
import { EventCard } from '@/components/site/event-card';
import { CourseCard } from '@/components/site/course-card';
import { EditableText } from '@/components/editable/editable-text';
import { EditableEntry, EditableAdd } from '@/components/editable/editable-list';
import { Card, CardStar } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { LinkButton } from '@/components/ui/button';
import { Icon } from '@/components/site/icon';
import { HomecomingHero } from '@/components/site/homecoming-hero';
import { delay } from '@/components/site/motion';
import { ViennaPanorama, PatternPlate, Eye } from '@/components/site/ornaments';
import { organizationJsonLd, JsonLd } from '@/lib/seo';
import { readTheme } from '@/lib/preferences';
import { isLocale, locales } from '@/lib/i18n/config';

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

  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tEvents = await getTranslations({ locale, namespace: 'events' });

  const chips = blocks.hero_chips?.items ?? [];
  const tBrand = await getTranslations({ locale, namespace: 'brand' });
  // The scene starts in the theme the page is rendered in, rather than
  // gliding into it after the first frame.
  const theme = await readTheme(settings.defaultTheme);

  return (
    <>
      <JsonLd data={organizationJsonLd(typed, settings)} />

      {/* ── Hero ──────────────────────────────────────────────────────────
          The band, and the loader that builds it.

          The design opens on deep green under cream with the girih ground
          drifting across it, the rings and the corners. All of that is still
          here, underneath: the Homecoming canvas is transparent and the birds
          fly over it. Where the portrait frame used to be there is now the
          square the mark lands in at the hand-over.

          The copy is rendered here, on the server, and handed to the client
          shell as children — so the headline, the lead and the buttons are in
          the HTML whether or not the canvas ever runs. */}
      <HomecomingHero
        theme={theme}
        captionTitle={tBrand('name')}
        captionSub={`${tBrand('sub')} · Wien`}
      >
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div className="fade-in flex flex-wrap items-center gap-3">
            <Eye />
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
                <li key={chip} data-rise>
                  <span className="chip-word">{chip}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </HomecomingHero>

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
                      words="tight"
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
                      rise
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
                <ArrowRight size={16} weight="bold" aria-hidden="true" className="rtl:rotate-180" />
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

              <div
                data-rise
                style={{ ...delay(210), marginBlockStart: '30px' }}
                className="flex flex-wrap gap-8"
              >
                <div>
                  <p className="kicker">{t('address')}</p>
                  <p
                    style={{
                      marginBlockStart: 'var(--space-2)',
                      fontSize: 'var(--text-base)',
                      lineHeight: 1.65,
                      fontWeight: 'var(--weight-semibold)',
                    }}
                  >
                    <span className="ltr-island">{settings.address}</span>
                  </p>
                </div>
              </div>

              <p data-rise style={{ ...delay(280), marginBlockStart: '32px' }}>
                <LinkButton href={`/${locale}/contact`}>
                  {tActions('contact')}
                  <ArrowRight
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                    className="rtl:rotate-180"
                  />
                </LinkButton>
              </p>
            </div>

            <div
              className="surf"
              data-rise
              style={{
                position: 'relative',
                background: 'var(--card2)',
                border: 'var(--rule-hair) solid var(--line)',
                padding: '30px 26px',
              }}
            >
              <PatternPlate opacity={0.4} />
              <ViennaPanorama />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
