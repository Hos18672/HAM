import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireLocale } from '@/lib/i18n/locale-param';
import { locales } from '@/lib/i18n/config';
import { getOccasions, getPastEvents, getUpcomingEvents } from '@/lib/db/queries/content';
import { viennaIso } from '@/lib/prayer-page';
import { CalendarMobile } from '@/components/app/calendar-mobile';

/** Today moves, and with it the cell marked today: rebuilt hourly. */
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
  const t = await getTranslations({ locale, namespace: 'app' });
  return { title: t('calendarTitle'), description: t('calendarLead') };
}

/**
 * The calendar, on a page of its own: the Islamic commemorations, Iran's and
 * Austria's public holidays and the house's events, month by month. The
 * months are built in the browser from the occasions list, as on the prayer
 * page, so nothing is fetched to move between them.
 */
export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const typed = requireLocale(locale);
  const [upcoming, past, occasions] = await Promise.all([
    getUpcomingEvents(typed, 100),
    getPastEvents(typed, 40),
    getOccasions(typed),
  ]);

  return (
    <div className="cal-page">
      <CalendarMobile
        events={[...past, ...upcoming]}
        occasions={occasions}
        todayIso={viennaIso(new Date())}
        locale={typed}
      />
    </div>
  );
}
