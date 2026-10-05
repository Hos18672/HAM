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

/**
 * Prayer times change every day, so this page is revalidated hourly rather
 * than being built once. The times themselves come from the Aladhan API,
 * cached for a day, with the local calculation behind it (`lib/aladhan`). The calendar below it accepts ?y= and ?m=, which
 * makes the route dynamic on those requests only.
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

export default async function PrayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { locale } = await params;
  const { y, m } = await searchParams;
  const typed = requireLocale(locale);

  const header = await getPageHeader('prayer', typed);
  if (!header) notFound();

  const now = new Date();
  const day = await getPrayerDay(now);

  // Fall back to the current month for anything that is not a sane year/month.
  // "Current" is read in Vienna, not in whatever timezone the server runs in:
  // otherwise, for the first hour or two of the 1st of a month, the calendar
  // opens on the previous month while the cell marked "today" is in this one.
  const [viennaYear, viennaMonth] = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIENNA.timeZone,
    year: 'numeric',
    month: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number) as [number, number];

  const year =
    Number.isInteger(Number(y)) && Number(y) > 1900 && Number(y) < 2200 ? Number(y) : viennaYear;
  const month =
    Number.isInteger(Number(m)) && Number(m) >= 1 && Number(m) <= 12 ? Number(m) : viennaMonth;

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
      <PageHead header={header} locale={typed} />

      {/* One grid: the next prayer and today's times beside the month's
          calendar, and the month's table across both. */}
      <section className="section">
        <div className="page prayer-layout">
          <PrayerList day={day} locale={typed} />
          <HijriCalendar
            initialMonth={calendar}
            initialTimetable={timetable}
            currentMonth={{ year: viennaYear, month: viennaMonth }}
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
