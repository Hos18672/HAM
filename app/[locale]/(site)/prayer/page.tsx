import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getPageHeader } from '@/lib/db/queries/content';
import { getPrayerDay, getCalendarMonth } from '@/lib/prayer-page';
import { PageHead } from '@/components/site/page-head';
import { PrayerList } from '@/components/site/prayer-list';
import { HijriCalendar } from '@/components/site/hijri-calendar';
import { pageMetadata } from '@/lib/page-meta';
import { VIENNA } from '@/lib/prayer-times';
import { type Locale } from '@/lib/i18n/config';

/**
 * Prayer times change every day, so this page is revalidated hourly rather
 * than being built once. The calendar below it accepts ?y= and ?m=, which
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
  setRequestLocale(locale);
  const typed = locale as Locale;

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

  const calendar = await getCalendarMonth(year, month, typed, now);

  return (
    <>
      <PageHead header={header} locale={typed} />

      <section className="section">
        <div className="page">
          <PrayerList day={day} locale={typed} />
        </div>
      </section>

      <section className="section section-alt" data-rise>
        <div className="page" style={{ maxInlineSize: '56rem' }}>
          <HijriCalendar month={calendar} locale={typed} basePath="/prayer" />
        </div>
      </section>
    </>
  );
}
