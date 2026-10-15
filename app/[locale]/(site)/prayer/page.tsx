import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { requireLocale } from '@/lib/i18n/locale-param';
import { getPageHeader, getOccasions } from '@/lib/db/queries/content';
import { getPrayerDay, getCalendarMonth, getTimetable, viennaIso } from '@/lib/prayer-page';
import { PageHead } from '@/components/site/page-head';
import { PrayerList, PrayerPlaceNote } from '@/components/site/prayer-list';
import { HijriCalendar } from '@/components/site/hijri-calendar';
import { pageMetadata } from '@/lib/page-meta';
import { VIENNA } from '@/lib/prayer-times';
import { PrayerMobile } from '@/components/app/prayer-mobile';

/**
 * Prayer times change every day, so this page is revalidated hourly rather
 * than being built once. The times themselves come from the Aladhan API,
 * cached for a day, with the local calculation behind it (`lib/aladhan`).
 *
 * The page always opens on the current month. A shared `?y=&m=` link is
 * honoured by the calendar itself, in the browser: reading the query here
 * would make the route render on every request instead of coming from the
 * host's cache.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata('prayer', locale, '/prayer');
}

export default async function PrayerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);

  const header = await getPageHeader('prayer', typed);
  if (!header) notFound();

  const now = new Date();
  const day = await getPrayerDay(now);

  // "Current" is read in Vienna, not in whatever timezone the server runs in:
  // otherwise, for the first hour or two of the 1st of a month, the calendar
  // opens on the previous month while the cell marked "today" is in this one.
  const [year, month] = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA.timeZone,
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number) as [number, number];

  const [calendar, timetable] = await Promise.all([
    getCalendarMonth(year, month, typed, now),
    getTimetable(year, month),
  ]);
  // The occasions are matched on the Hijri date, so one list serves every
  // month; handing it to the calendar lets the browser build the months it
  // moves to without coming back here.
  const occasions = await getOccasions(typed);

  return (
    <>
      <div className="d-view">
        <PageHead header={header} locale={typed} />
      </div>
      {/* Phones and the app: the design's prayer screen. The month's
          calendar and table below are shared with the wide layout. */}
      <div className="m-view">
        <PrayerMobile day={day} locale={typed} />
      </div>

      {/* One grid: the next prayer and today's times beside the month's
          calendar, and the month's table across both. */}
      <section className="section">
        <div className="page prayer-layout">
          <div className="d-view">
            <PrayerList day={day} locale={typed} />
          </div>
          <HijriCalendar
            initialMonth={calendar}
            initialTimetable={timetable}
            currentMonth={{ year, month }}
            occasions={occasions}
            todayIso={viennaIso(now)}
            locale={typed}
            basePath={`/${typed}/prayer`}
          />
          {/* The source and the method, once, for everything above. */}
          <PrayerPlaceNote locale={typed} />
        </div>
      </section>
    </>
  );
}
