import { getTranslations } from 'next-intl/server';
import {
  BookOpenText,
  ChalkboardTeacher,
  Compass,
  HandsPraying,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { formatDayPlate, formatDay, formatTime } from '@/lib/i18n/format';
import type { EventEntry } from '@/lib/db/queries/content';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { PrayerHero } from './prayer-hero';
import { QuranContinueCard, type SurahName } from './quran-continue-card';
import { EventCover } from './event-cover';

const QUICK = [
  { href: '/quran', key: 'tabQuran', icon: BookOpenText },
  { href: '/qibla', key: 'qibla', icon: Compass },
  { href: '/duas', key: 'duasShort', icon: HandsPraying },
  { href: '/courses', key: 'courses', icon: ChalkboardTeacher },
] as const;

/**
 * The home page on a phone: the next prayer, four tools a tap away, where
 * the reader left off in the Quran, and the next events as a row of cards.
 */
export async function HomeMobile({
  day,
  events,
  surahs,
  locale,
}: {
  day: PrayerDay;
  events: EventEntry[];
  surahs: SurahName[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const tApp = await getTranslations({ locale, namespace: 'app' });
  const tEvents = await getTranslations({ locale, namespace: 'events' });
  const tHome = await getTranslations({ locale, namespace: 'home' });

  return (
    <div className="a-screen" style={{ gap: 18 }}>
      <h1 className="visually-hidden">{t('home')}</h1>
      <PrayerHero day={day} locale={locale} />

      <ul className="a-quick a-rise">
        {QUICK.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} className="a-quick-tile a-press">
                <span className="a-quick-box">
                  <Icon size={30} weight="duotone" aria-hidden="true" />
                </span>
                {item.key === 'duasShort' ? tApp('duasShort') : t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>

      <QuranContinueCard surahs={surahs} locale={locale} variant="mint" />

      <section className="a-stack" style={{ gap: 10 }} aria-labelledby="home-events">
        <h2 id="home-events" className="a-head">
          {tHome('upcoming')}
          <Link href="/events">{tApp('all')}</Link>
        </h2>
        {events.length === 0 ? (
          <p className="a-sub" style={{ fontSize: 14 }}>
            {tEvents('none')}
          </p>
        ) : (
          <ul className="a-carousel">
            {events.map((event) => {
              const plate = formatDayPlate(event.startsAt, locale);
              return (
                <li key={event.id}>
                  <Link href={`/events/${event.slug}`} className="a-card a-event-card a-press">
                    <EventCover
                      category={event.category}
                      imageUrl={event.imageUrl}
                      imageAlt={event.imageAlt}
                    >
                      <span className="a-date-chip">
                        <span>{plate.day}</span>
                        <span>{plate.month}</span>
                      </span>
                    </EventCover>
                    <span className="a-stack" style={{ padding: '12px 14px 14px' }}>
                      <span className="a-title" style={{ fontSize: 15.5 }}>
                        {event.title}
                      </span>
                      <span className="a-sub" style={{ fontSize: 13 }}>
                        {formatDay(locale, event.startsAt, 'weekday').split(/[ ,]/)[0]} ·{' '}
                        {formatTime(event.startsAt, locale)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
