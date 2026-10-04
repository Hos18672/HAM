import type { Locale } from './i18n/config';
import type { EventEntry, SiteSettings, Course } from './db/queries/content';
import { ASSOCIATION } from './db/seed-data';
import { FACTS, OPENING_HOURS } from './site-facts';

/**
 * JSON-LD builders.
 *
 * Kept as plain objects rather than a schema library: the shapes are small,
 * and the value of a dependency here would be type names we can write once.
 */

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

/** Renders a JSON-LD block. The content is ours, not user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escaping `<` prevents a `</script>` inside a string from closing the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function placeJsonLd(settings: SiteSettings) {
  return {
    '@type': 'Place',
    name: ASSOCIATION.nameDe,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ASSOCIATION.street,
      postalCode: ASSOCIATION.postcode,
      addressLocality: ASSOCIATION.city,
      addressCountry: 'AT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: ASSOCIATION.latitude,
      longitude: ASSOCIATION.longitude,
    },
    ...(settings.mapUrl ? { hasMap: settings.mapUrl } : {}),
  };
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The opening hours as schema.org has them. Days by programme have no hours. */
export function openingHoursJsonLd() {
  return OPENING_HOURS.filter((w) => w.open && w.close).map((w) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: w.days.map((d) => `https://schema.org/${WEEKDAYS[d - 1]}`),
    opens: w.open,
    closes: w.close,
  }));
}

/**
 * The contact page's graph: the association, the house it opens and when,
 * and where the page sits — the breadcrumb the page no longer prints.
 */
export function contactJsonLd(
  locale: Locale,
  settings: SiteSettings,
  homeName: string,
  pageName: string,
) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...organizationJsonLd(locale, settings),
        '@context': undefined,
        sameAs: [`https://www.instagram.com/${FACTS.instagram}/`],
        location: { ...placeJsonLd(settings), openingHoursSpecification: openingHoursJsonLd() },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: homeName, item: `${siteUrl()}/${locale}` },
          {
            '@type': 'ListItem',
            position: 2,
            name: pageName,
            item: `${siteUrl()}/${locale}/contact`,
          },
        ],
      },
    ],
  };
}

export function organizationJsonLd(locale: Locale, settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: locale === 'fa' ? ASSOCIATION.nameFa : ASSOCIATION.nameDe,
    alternateName: locale === 'fa' ? ASSOCIATION.nameDe : ASSOCIATION.nameFa,
    url: `${siteUrl()}/${locale}`,
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: ASSOCIATION.street,
      postalCode: ASSOCIATION.postcode,
      addressLocality: ASSOCIATION.city,
      addressCountry: 'AT',
    },
    location: placeJsonLd(settings),
    nonprofitStatus: 'NonprofitType',
  };
}

export function eventJsonLd(event: EventEntry, locale: Locale, settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.body,
    startDate: event.startsAt.toISOString(),
    ...(event.endsAt ? { endDate: event.endsAt.toISOString() } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: { ...placeJsonLd(settings), name: event.location || ASSOCIATION.nameDe },
    organizer: {
      '@type': 'Organization',
      name: locale === 'fa' ? ASSOCIATION.nameFa : ASSOCIATION.nameDe,
      url: `${siteUrl()}/${locale}`,
    },
    url: `${siteUrl()}/${locale}/events#event-${event.slug}`,
    ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
  };
}

export function courseJsonLd(course: Course, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.body,
    url: `${siteUrl()}/${locale}/courses#course-${course.slug}`,
    provider: {
      '@type': 'Organization',
      name: locale === 'fa' ? ASSOCIATION.nameFa : ASSOCIATION.nameDe,
      url: `${siteUrl()}/${locale}`,
    },
    ...(course.level ? { educationalLevel: course.level } : {}),
    ...(course.targetGroup
      ? { audience: { '@type': 'Audience', audienceType: course.targetGroup } }
      : {}),
  };
}
