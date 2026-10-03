import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { MapPin, Phone, EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react/dist/ssr';
import {
  getPageHeader,
  getSettings,
  getCourses,
  getSports,
  getUpcomingEvents,
} from '@/lib/db/queries/content';
import { OpeningHours, Directions, HouseMap } from '@/components/site/house-info';
import { OpenNow } from '@/components/site/open-now';
import { FACTS } from '@/lib/site-facts';
import { PageHead } from '@/components/site/page-head';
import { ContactForm } from '@/components/site/contact-form';
import { JsonLd, placeJsonLd } from '@/lib/seo';
import { pageMetadata } from '@/lib/page-meta';
import { locales } from '@/lib/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('contact', locale, '/contact');
}

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

  // What a `?topic=…&id=…` link can name, so the form can fill it in.
  const subjects = {
    course: Object.fromEntries(courses.map((c) => [c.slug, c.title])),
    sport: Object.fromEntries(sports.map((s) => [s.id, s.activity])),
    event: Object.fromEntries(events.map((e) => [e.slug, e.title])),
  };

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', ...placeJsonLd(settings) }} />

      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page contact-layout">
          {/* Where, when, how to get here and how to reach us — in the order a
              visitor on a phone needs them. The house's name is in the page
              head already; it is not repeated here. */}
          <div className="contact-info">
            <div className="contact-block">
              <p className="contact-address">
                <MapPin size={22} weight="duotone" aria-hidden="true" />
                <span className="ltr-island">{settings.address}</span>
              </p>
              <div className="contact-hours-head">
                <h2 className="contact-h">{tHouse('hours')}</h2>
                <OpenNow />
              </div>
              <OpeningHours locale={typed} />
            </div>

            <HouseMap locale={typed} mapUrl={settings.mapUrl || FACTS.mapUrl} />

            <div className="contact-block">
              <h2 className="contact-h">{tHouse('directionsTitle')}</h2>
              <Directions locale={typed} />
            </div>

            <div className="contact-block">
              <h2 className="contact-h">{tHouse('reach')}</h2>
              <ul className="contact-links">
                {settings.phone ? (
                  <li>
                    <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>
                      <Phone size={20} weight="duotone" aria-hidden="true" />
                      <span className="ltr-island">{settings.phone}</span>
                    </a>
                  </li>
                ) : null}
                {settings.contactEmail ? (
                  <li>
                    <a href={`mailto:${settings.contactEmail}`}>
                      <EnvelopeSimple size={20} weight="duotone" aria-hidden="true" />
                      <span className="ltr-island">{settings.contactEmail}</span>
                    </a>
                  </li>
                ) : null}
                <li>
                  <a
                    href={`https://www.instagram.com/${FACTS.instagram}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <InstagramLogo size={20} weight="duotone" aria-hidden="true" />
                    <span className="ltr-island">@{FACTS.instagram}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="contact-form-col">
            <h2 style={{ fontSize: 'clamp(25px, 3vw, 34px)' }}>{t('formTitle')}</h2>
            <div style={{ marginBlockStart: 'var(--space-4)' }}>
              <ContactForm locale={typed} subjects={subjects} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
