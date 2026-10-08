import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  ArrowSquareOut,
  EnvelopeSimple,
  InstagramLogo,
  MapPin,
  NavigationArrow,
  Phone,
} from '@phosphor-icons/react/dist/ssr';
import { requireLocale } from '@/lib/i18n/locale-param';
import {
  getPageHeader,
  getSettings,
  getCourses,
  getSports,
  getUpcomingEvents,
} from '@/lib/db/queries/content';
import { dayRange } from '@/components/site/house-info';
import {
  ContactMap,
  CopyAddress,
  HoursTable,
  OpenStatus,
  RouteLink,
} from '@/components/site/contact-visit';
import { DIRECTIONS, FACTS, OPENING_HOURS, houseMapUrl } from '@/lib/site-facts';
import { digits, timeRange } from '@/lib/i18n/format';
import { weekdayName } from '@/lib/schedule';
import { EditableText } from '@/components/editable/editable-text';
import { PatternPlate, Ring } from '@/components/site/ornaments';
import { ContactForm } from '@/components/site/contact-form';
import { JsonLd, contactJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
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
  const meta = await pageMetadata('contact', locale, '/contact');
  if (!isLocale(locale)) return meta;
  const t = await getTranslations({ locale, namespace: 'contact' });
  const title = t('metaTitle');
  return { ...meta, title: { absolute: title }, openGraph: { ...meta.openGraph, title } };
}

/** Rendered by `scripts/contact-map.mjs`; until it exists the frame waits for a click. */
const HAS_MAP_IMAGE = existsSync(path.join(process.cwd(), 'public', 'map-contact@1x.webp'));

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const [header, settings, courses, sports, events] = await Promise.all([
    getPageHeader('contact', typed),
    getSettings(),
    getCourses(typed),
    getSports(typed),
    getUpcomingEvents(typed),
  ]);
  if (!header) notFound();

  const t = await getTranslations({ locale, namespace: 'contact' });
  const tHouse = await getTranslations({ locale, namespace: 'house' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // What a `?topic=…&id=…` link can name, so the form can fill it in.
  const subjects = {
    course: Object.fromEntries(courses.map((c) => [c.slug, c.title])),
    sport: Object.fromEntries(sports.map((s) => [s.id, s.activity])),
    event: Object.fromEntries(events.map((e) => [e.slug, e.title])),
  };

  // "Sautergasse 34–38, 1170 Wien" → two lines.
  const address = settings.address || `${FACTS.street}, ${FACTS.postcode} ${FACTS.city}`;
  const [street = address, ...rest] = address.split(',').map((part) => part.trim());
  const cityLine = rest.join(', ');

  const hours = OPENING_HOURS.map((window) => ({
    days: window.days,
    label: dayRange(window.days, typed),
    time: window.open && window.close ? timeRange(window.open, window.close, typed) : null,
  }));
  const dayNames = [1, 2, 3, 4, 5, 6, 7].map((day) => weekdayName(day, typed));
  const clocks = Object.fromEntries(
    OPENING_HOURS.flatMap((w) => [w.open, w.close])
      .filter((clock): clock is string => Boolean(clock))
      .map((clock) => [clock, digits(clock, typed)]),
  );
  const directions = (['tram', 'train', 'access'] as const)
    .map((key) => [key, DIRECTIONS[typed][key]] as const)
    .filter(([, text]) => text);

  const email = settings.contactEmail;
  const phone = settings.phone;
  const external = <span className="visually-hidden"> ({tA11y('externalLink')})</span>;

  return (
    <div className="contact-page">
      <JsonLd data={contactJsonLd(typed, settings, tNav('home'), tNav('contact'))} />

      {/* The title, and whether the door is open, first — on the green band
          every page opens on, without the breadcrumb. */}
      <header className="contact-head-band">
        {/* The same green band every page opens on. */}
        <PatternPlate tiling="shesh" drift opacity={0.7} />
        <Ring />
        <div className="page contact-head">
          <div className="contact-head-text">
            {header.kicker ? <p className="contact-kicker">{header.kicker}</p> : null}
            <EditableText
              as="h1"
              entity="page"
              id={header.id}
              field="title"
              locale={typed}
              value={header.title}
              className="contact-title"
            />
            <EditableText
              as="p"
              entity="page"
              id={header.id}
              field="lead"
              locale={typed}
              value={header.lead}
              className="contact-lead"
              multiline
            />
          </div>
          <OpenStatus dayNames={dayNames} clocks={clocks} />
        </div>
      </header>

      <section className="page contact-visit" aria-label={tHouse('reach')}>
        {/* On a phone, the two things a visitor came for, before anything else. */}
        <div className="contact-quick">
          <RouteLink className="btn">
            <NavigationArrow size={20} weight="duotone" aria-hidden="true" className="mirror" />
            {t('route')}
          </RouteLink>
          {email ? (
            <a className="btn btn-secondary" href={`mailto:${email}`}>
              <EnvelopeSimple size={20} weight="duotone" aria-hidden="true" />
              {t('emailAction')}
            </a>
          ) : null}
        </div>

        <div className="contact-addr">
          <h2 className="visually-hidden">{t('address')}</h2>
          <address>
            <span className="ltr-island">{street}</span>
            {cityLine ? <span className="ltr-island">{cityLine}</span> : null}
          </address>
          <CopyAddress value={cityLine ? `${street}, ${cityLine}` : street} />
        </div>

        <div className="contact-hours-block">
          <h2 className="contact-label">{tHouse('hours')}</h2>
          <HoursTable rows={hours} byProgramme={tHouse('byProgramme')} />
        </div>

        <figure className="contact-map" id="map">
          <ContactMap label={tHouse('mapLabel')} hasImage={HAS_MAP_IMAGE}>
            <RouteLink className="btn">
              <NavigationArrow size={20} weight="duotone" aria-hidden="true" className="mirror" />
              {t('route')}
            </RouteLink>
            <a
              href={houseMapUrl(settings.mapUrl)}
              className="contact-text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openGoogle')}
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
              {external}
            </a>
          </ContactMap>
          <figcaption className="contact-map-credit">{t('osmCredit')}</figcaption>
        </figure>

        {directions.length > 0 ? (
          <div className="contact-trans">
            <h2 className="contact-label">{tHouse('directionsTitle')}</h2>
            <dl className="contact-dl">
              {directions.map(([key, text]) => (
                <div key={key} className="contact-dl-row">
                  <dt>{tHouse(`directions.${key}`)}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      <section className="page contact-channels" aria-labelledby="contact-channels-h">
        <h2 id="contact-channels-h" className="visually-hidden">
          {t('channelsTitle')}
        </h2>
        <ul className="contact-tiles">
          {email ? (
            <li>
              <a className="contact-tile" href={`mailto:${email}`}>
                <EnvelopeSimple size={28} weight="duotone" aria-hidden="true" />
                <span className="contact-tile-title">{t('channels.email')}</span>
                <span className="contact-tile-detail ltr-island">{email}</span>
              </a>
            </li>
          ) : null}
          {/* TODO(phone): shown only once a real number is entered in the admin
              settings — never a placeholder. */}
          {phone ? (
            <li>
              <a className="contact-tile" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                <Phone size={28} weight="duotone" aria-hidden="true" />
                <span className="contact-tile-title">{t('channels.phone')}</span>
                <span className="contact-tile-detail ltr-island">{phone}</span>
              </a>
            </li>
          ) : null}
          <li>
            <a
              className="contact-tile"
              href={`https://www.instagram.com/${FACTS.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramLogo size={28} weight="duotone" aria-hidden="true" />
              <span className="contact-tile-title">
                {t('channels.instagram')}
                <ArrowSquareOut size={15} weight="bold" aria-hidden="true" />
              </span>
              <span className="contact-tile-detail ltr-island">@{FACTS.instagram}</span>
              {external}
            </a>
          </li>
          <li>
            <a className="contact-tile" href="#map">
              <MapPin size={28} weight="duotone" aria-hidden="true" />
              <span className="contact-tile-title">{t('channels.visit')}</span>
              <span className="contact-tile-detail">{t('channels.visitDetail')}</span>
            </a>
          </li>
        </ul>
      </section>

      <section className="page contact-write" aria-labelledby="contact-write-h">
        <div className="contact-write-intro">
          <h2 id="contact-write-h">{t('formTitle')}</h2>
          <p>{t('formIntro')}</p>
          {/* TODO(content): a reply time ("Wir antworten in der Regel innerhalb
              von 2 Werktagen.") once the association commits to one. */}
          <p>{t('formInPerson')}</p>
        </div>
        <div className="contact-form-card">
          <ContactForm locale={typed} subjects={subjects} />
        </div>
      </section>
    </div>
  );
}
