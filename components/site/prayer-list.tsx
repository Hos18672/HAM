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
import { localPrayerDay } from '@/lib/prayer-local';
import { DEFAULT_CITY_ID, cityName, findCity } from '@/lib/cities';
import { useNextPrayer } from '@/lib/use-next-prayer';
import { CityCombobox } from './city-combobox';
import { Link } from '@/lib/i18n/navigation';
import { toPersianDate, persianMonthName } from '@/lib/persian-date';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '../ui/button';
import { PatternPlate } from './ornaments';

type GeoState =
  'vienna' | 'locating' | 'located' | 'denied' | 'unsupported' | 'failed' | 'fetchFailed';

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
 * The page opens on Vienna. A visitor elsewhere can ask for their own
 * position: the browser hands its coordinates to this site's `/api/prayer/day`
 * — never to the API directly — and the day that comes back replaces the one
 * shown, countdown and all, until they go back to Vienna.
 */
export function PrayerList({ day: vienna, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const [shownDay, setShownDay] = useState(vienna);
  const [geo, setGeo] = useState<GeoState>('vienna');
  const [cityId, setCityId] = useState<string>(DEFAULT_CITY_ID);
  const [recent, setRecent] = useState<string[]>([]);
  const { day, remaining } = useNextPrayer(shownDay);

  /**
   * A chosen city is worked out here in the browser rather than asked of the
   * server: a round trip per choice would be slower than the answer, and on
   * the static preview there is no server to ask. `lib/prayer-local` uses the
   * same calculation the server falls back to.
   *
   * The choice is remembered per browser, so someone in Graz is not choosing
   * Graz again every visit, and the last few choices come first in the list.
   * Vienna clears the memory rather than storing itself — this is a Viennese
   * house, and its own city is the default, not a preference.
   */
  function chooseCity(id: string) {
    const city = findCity(id);
    setGeo('vienna');
    setCityId(city ? city.id : DEFAULT_CITY_ID);
    try {
      if (!city || city.id === DEFAULT_CITY_ID) window.localStorage.removeItem('ham-city');
      else window.localStorage.setItem('ham-city', city.id);
      if (city) {
        const list = [city.id, ...recent.filter((r) => r !== city.id)].slice(0, 4);
        setRecent(list);
        window.localStorage.setItem('ham-city-recent', JSON.stringify(list));
      }
    } catch {
      // Private window, or storage turned off. The choice still holds for
      // this page; it simply will not outlive it.
    }
    if (!city || city.id === DEFAULT_CITY_ID) {
      setShownDay(vienna);
      return;
    }
    setShownDay(localPrayerDay(new Date(), city));
  }

  // The remembered city, once, after hydration — reading storage during the
  // render would make the server's HTML and the first paint disagree.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem('ham-city');
      const list = JSON.parse(window.localStorage.getItem('ham-city-recent') ?? '[]') as unknown;
      if (Array.isArray(list)) setRecent(list.filter((x): x is string => typeof x === 'string'));
    } catch {
      stored = null;
    }
    const city = findCity(stored);
    if (!city || city.id === DEFAULT_CITY_ID) return;
    setCityId(city.id);
    setShownDay(localPrayerDay(new Date(), city));
    // Only on mount: afterwards the reader's own choices drive this.
  }, []);

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Rounded to two decimals — about a kilometre — before it leaves the
        // device, and rounded for the local calculation too, so the same
        // coarse position is used either way.
        const place = {
          latitude: Number(position.coords.latitude.toFixed(2)),
          longitude: Number(position.coords.longitude.toFixed(2)),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const query = new URLSearchParams({
          lat: String(place.latitude),
          lng: String(place.longitude),
          tz: place.timeZone,
        });
        try {
          const response = await fetch(`/api/prayer/day?${query}`);
          if (!response.ok) throw new Error(String(response.status));
          setShownDay((await response.json()) as PrayerDay);
        } catch {
          // No route to ask — the static preview has none — or it said no.
          // The day is arithmetic, so it is worked out here instead of
          // telling the reader their own position could not be used.
          setShownDay(localPrayerDay(new Date(), place));
        }
        setCityId('');
        setGeo('located');
      },
      (error) => setGeo(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const geoMessage =
    geo === 'locating'
      ? t('locating')
      : geo === 'denied'
        ? t('geoDenied')
        : geo === 'unsupported'
          ? t('geoUnsupported')
          : geo === 'failed'
            ? t('geoFailed')
            : geo === 'fetchFailed'
              ? t('fetchFailed')
              : geo === 'located'
                ? t('locationNote')
                : null;

  const gregorian = new Date(day.gregorianIso);
  const chosenCity = findCity(cityId);
  const placeLabel =
    geo === 'located'
      ? t('todayYourPlace')
      : chosenCity && chosenCity.id !== DEFAULT_CITY_ID
        ? t('todayIn', { city: cityName(chosenCity, locale) })
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
              value={geo === 'located' ? '' : cityId}
              recent={recent}
              onChoose={chooseCity}
              locale={locale}
              located={geo === 'located'}
            />
            {geo === 'located' ? (
              <Button variant="secondary" size="sm" onClick={() => chooseCity(DEFAULT_CITY_ID)}>
                <ArrowCounterClockwise size={16} weight="duotone" aria-hidden="true" />
                {t('backToVienna')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={useMyLocation}
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
 * the time left and the way to the full page. Vienna only — the city picker
 * lives on the prayer page.
 */
export function NextPrayerStrip({ day: initial, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const { day, remaining } = useNextPrayer(initial);
  const next = day.next;
  if (!next) return null;
  const IconComponent = ICONS[next.key] ?? Clock;
  return (
    <Link className="prayer-strip" href="/prayer">
      <IconComponent size={26} weight="duotone" aria-hidden="true" color="var(--gold)" />
      <span className="prayer-strip-label">{t('nextPrayer')}</span>
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
