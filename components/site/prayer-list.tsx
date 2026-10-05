'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  SunHorizon,
  Sun,
  SunDim,
  CloudSun,
  MoonStars,
  Moon,
  Clock,
  MapPin,
  ArrowRight,
  ArrowCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';
import { formatClock, formatDuration, formatDay, digits } from '@/lib/i18n/format';
import { formatHijri } from '@/lib/hijri';
import type { PrayerKey } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import { DEFAULT_CITY_ID, cityName } from '@/lib/cities';
import {
  chooseCity,
  chooseHouse,
  locate,
  placeOf,
  usePlaceDay,
  usePrayerPlace,
} from '@/lib/prayer-place';
import { VIENNA } from '@/lib/prayer-times';
import { useNextPrayer } from '@/lib/use-next-prayer';
import { CityCombobox } from './city-combobox';
import { Link } from '@/lib/i18n/navigation';
import { toPersianDate, persianMonthName } from '@/lib/persian-date';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';
import { PatternPlate } from './ornaments';

const ICONS: Record<
  PrayerKey,
  React.ComponentType<{
    size?: number;
    weight?: 'duotone';
    color?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
  }>
> = {
  fajr: SunHorizon,
  sunrise: Sun,
  dhuhr: SunDim,
  asr: CloudSun,
  maghrib: SunHorizon,
  isha: MoonStars,
  midnight: Moon,
};

const ORDER: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];

/**
 * The next-prayer hero, the seven daily times and the four extra ones.
 *
 * Everything is computed on the server; this component only counts down. It
 * reconciles against the server's own clock reading rather than trusting the
 * visitor's, so a device with a wrong clock still sees the right remaining
 * time relative to the times printed above it.
 *
 * The page opens on the reader's own position (`lib/prayer-place`): the
 * browser is asked for it, and the day for it replaces Vienna's, countdown
 * and all. A city picked from the list wins over the position; Vienna is
 * what is shown when the position is refused, or chosen.
 */
export function PrayerList({ day: vienna, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const { day: shownDay, place } = usePlaceDay(vienna);
  const { choice, geo } = place;
  const [recent, setRecent] = useState<string[]>([]);
  const { day, remaining } = useNextPrayer(shownDay);

  /**
   * The last few cities chosen come first in the list. The choice itself is
   * kept by `lib/prayer-place`, so the home page and the month table follow it.
   */
  function pick(id: string) {
    chooseCity(id);
    if (id === DEFAULT_CITY_ID) return;
    const list = [id, ...recent.filter((r) => r !== id)].slice(0, 4);
    setRecent(list);
    try {
      window.localStorage.setItem('ham-city-recent', JSON.stringify(list));
    } catch {
      // Private window, or storage turned off: the list is for this page only.
    }
  }

  // The remembered list, once, after hydration — reading storage during the
  // render would make the server's HTML and the first paint disagree.
  useEffect(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem('ham-city-recent') ?? '[]') as unknown;
      if (Array.isArray(list)) setRecent(list.filter((x): x is string => typeof x === 'string'));
    } catch {
      // Nothing remembered.
    }
  }, []);

  const geoMessage =
    geo === 'locating'
      ? t('locating')
      : geo === 'denied'
        ? t('geoDenied')
        : geo === 'unsupported'
          ? t('geoUnsupported')
          : geo === 'failed'
            ? t('geoFailed')
            : geo === 'located' && choice.kind === 'located'
              ? t('locationNote')
              : null;

  const gregorian = new Date(day.gregorianIso);
  const placeLabel =
    choice.kind === 'located'
      ? t('todayYourPlace')
      : choice.kind === 'city'
        ? t('todayIn', { city: cityName(choice.city, locale) })
        : t('todayHere');

  const persian = toPersianDate(gregorian);
  const persianLabel = [
    locale === 'fa' ? digits(persian.day, locale) : `${persian.day}.`,
    persianMonthName(persian.month, locale),
    digits(persian.year, locale),
  ].join(' ');

  const next = day.next;

  return (
    <div className="prayer-now">
      {/* The next prayer, with today's three dates and the place. */}
      <section className="surf prayer-next" aria-labelledby="next-prayer-name">
        <PatternPlate opacity={0.3} />
        <div style={{ position: 'relative' }}>
          <p className="kicker" style={{ color: 'var(--color-accent-2-text)' }}>
            {t('nextPrayer')}
          </p>
          {next ? (
            <>
              <h2 id="next-prayer-name" className="prayer-next-name">
                {t(`names.${next.key}`)}
                {next.tomorrow ? (
                  <span className="prayer-next-tomorrow">{t('tomorrow')}</span>
                ) : null}
              </h2>
              <p className="prayer-next-row">
                <span className="tabular prayer-next-time">
                  {/* `next.minutes` rather than today's entry for that key:
                      after Isha this is tomorrow's Fajr, which is a minute or
                      two off today's and is the time being counted down to. */}
                  {formatClock(next.minutes, locale)}
                </span>
                <span className="prayer-next-left" aria-live="polite" aria-atomic="true">
                  {remaining === null ? null : (
                    <>
                      <span className="visually-hidden">{t('countdownLabel')}: </span>
                      {t('in')} {formatDuration(remaining, locale)}
                    </>
                  )}
                </span>
              </p>
            </>
          ) : (
            <h2 id="next-prayer-name" className="prayer-next-name">
              —
            </h2>
          )}

          <div className="prayer-next-dates">
            <p className="prayer-next-place">{placeLabel}</p>
            <p>{formatDay(locale, gregorian, 'full', { calendar: 'gregory' })}</p>
            <p className="prayer-next-hijri">
              {formatHijri(gregorian, locale, day.place.timeZone)}
            </p>
            <p className="prayer-next-iran">
              {t('iranDate')}: {persianLabel}
            </p>
          </div>

          <div className="prayer-next-place-pick">
            <CityCombobox
              value={
                choice.kind === 'located'
                  ? ''
                  : choice.kind === 'city'
                    ? choice.city.id
                    : DEFAULT_CITY_ID
              }
              recent={recent}
              onChoose={pick}
              locale={locale}
              located={choice.kind === 'located'}
            />
            {choice.kind === 'located' ? (
              <Button variant="secondary" size="sm" onClick={chooseHouse}>
                <ArrowCounterClockwise size={16} weight="duotone" aria-hidden="true" />
                {t('backToVienna')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={locate}
                loading={geo === 'locating'}
                disabled={geo === 'locating'}
              >
                <MapPin size={16} weight="duotone" aria-hidden="true" />
                {t('useMyLocation')}
              </Button>
            )}
          </div>
          {/* Failures are stated, never silent. */}
          <p aria-live="polite" className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
            {geoMessage}
          </p>
        </div>
      </section>

      {/* Today's seven times, one row each, the next one marked. */}
      <section aria-labelledby="prayer-today-title">
        <h2 id="prayer-today-title" className="visually-hidden">
          {placeLabel}
        </h2>
        <ol className="ptimes">
          {ORDER.map((key) => {
            const IconComponent = ICONS[key] ?? Clock;
            const isNext = next?.key === key && !next.tomorrow;
            const value = day.times[key];
            return (
              <li key={key} className="ptimes-row" data-next={isNext ? 'true' : undefined}>
                <IconComponent size={22} weight="duotone" aria-hidden="true" color="var(--gold)" />
                <span className="ptimes-name">
                  {t(`names.${key}`)}
                  {isNext ? <span className="ptimes-mark">{t('nextMark')}</span> : null}
                </span>
                <span className="ptimes-time tabular">
                  {/* A time that does not occur at this latitude prints an
                      em dash rather than crashing or inventing a value. */}
                  {value === null ? '—' : formatClock(value, locale)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/**
 * The compact strip under the home page's hero: the next prayer, its time,
 * the time left and the way to the full page. For the same place as the
 * prayer page — the reader's own, unless they chose another — with the place
 * named, so a time that is not Vienna's never passes for it.
 */
export function NextPrayerStrip({ day: initial, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const { day: shown, place } = usePlaceDay(initial);
  const { day, remaining } = useNextPrayer(shown);
  const where =
    place.choice.kind === 'located'
      ? t('placeYours')
      : place.choice.kind === 'city'
        ? cityName(place.choice.city, locale)
        : t('placeVienna');
  const next = day.next;
  if (!next) return null;
  const IconComponent = ICONS[next.key] ?? Clock;
  return (
    <Link className="prayer-strip" href="/prayer">
      <IconComponent size={26} weight="duotone" aria-hidden="true" color="var(--gold)" />
      <span className="prayer-strip-label">
        {t('nextPrayer')} · {where}
      </span>
      <span className="prayer-strip-name">
        {t(`names.${next.key}`)}
        {next.tomorrow ? ` · ${t('tomorrow')}` : ''}
      </span>
      <span className="prayer-strip-time tabular">{formatClock(next.minutes, locale)}</span>
      <span className="prayer-strip-left" aria-live="polite">
        {remaining === null ? null : `${t('in')} ${formatDuration(remaining, locale)}`}
      </span>
      <span className="prayer-strip-go">
        {t('allTimes')}
        <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
      </span>
    </Link>
  );
}

/** "48.22° N, 16.33° E" for a place, in the page's digits. */
function coordinates(latitude: number, longitude: number, decimals: number, locale: Locale) {
  const lat = `${Math.abs(latitude).toFixed(decimals)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(decimals)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return digits(`${lat}, ${lng}`, locale);
}

/** The source and the method, and the place the times above are for. */
export function PrayerPlaceNote({ locale }: { locale: Locale }) {
  const t = useTranslations('prayer');
  const { choice } = usePrayerPlace();
  const at = placeOf(choice);
  const name =
    choice.kind === 'located'
      ? t('placeYours')
      : choice.kind === 'city'
        ? cityName(choice.city, locale)
        : t('placeVienna');
  return (
    <p className="prayer-source">
      {t('sourceNote')} · {name} ·{' '}
      <span className="ltr-island">
        {at
          ? coordinates(at.latitude, at.longitude, 2, locale)
          : coordinates(VIENNA.latitude, VIENNA.longitude, 4, locale)}
      </span>
    </p>
  );
}
