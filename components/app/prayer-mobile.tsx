'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowCounterClockwise,
  BellRinging,
  BellSlash,
  CaretLeft,
  CaretRight,
  CloudSun,
  MapPin,
  Moon,
  MoonStars,
  Sun,
  SunDim,
  SunHorizon,
} from '@phosphor-icons/react/dist/ssr';
import { formatClock, formatDay, formatDuration } from '@/lib/i18n/format';
import { formatHijri } from '@/lib/hijri';
import { DEFAULT_CITY_ID, cityName } from '@/lib/cities';
import { chooseCity, chooseHouse, locate, placeOf, usePlaceDay } from '@/lib/prayer-place';
import { localPrayerDay } from '@/lib/prayer-local';
import { VIENNA } from '@/lib/prayer-times';
import { useNextPrayer } from '@/lib/use-next-prayer';
import { usePlaceName } from '@/components/ui/next-prayer';
import { CityCombobox } from '@/components/site/city-combobox';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { setAdhan, useAdhanPrefs, type AdhanKey } from './adhan-prefs';

const ROWS: { key: AdhanKey; icon: typeof Sun }[] = [
  { key: 'fajr', icon: MoonStars },
  { key: 'sunrise', icon: SunHorizon },
  { key: 'dhuhr', icon: Sun },
  { key: 'asr', icon: SunDim },
  { key: 'maghrib', icon: CloudSun },
  { key: 'isha', icon: Moon },
];

/** Noon on the civil day `offset` days from today in a time zone. */
function dayAt(offset: number, timeZone: string) {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + offset, 11));
}

/**
 * The prayer page on a phone: a day switcher, the place and the method, the
 * six times with the next one in dark green and its countdown in gold, a
 * bell on each for the adhan, and midnight with the way to the month below.
 */
export function PrayerMobile({ day: vienna, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const tApp = useTranslations('app');
  const { day: shown, place } = usePlaceDay(vienna);
  const { day: today, remaining } = useNextPrayer(shown);
  const where = usePlaceName(place, locale);
  const adhan = useAdhanPrefs();
  const [offset, setOffset] = useState(0);
  const [picking, setPicking] = useState(false);

  const at = placeOf(place.choice) ?? VIENNA;
  const day = useMemo(
    () => (offset === 0 ? today : localPrayerDay(dayAt(offset, at.timeZone), at)),
    [offset, today, at],
  );
  const date = offset === 0 ? new Date(today.gregorianIso) : dayAt(offset, at.timeZone);
  const next = offset === 0 ? today.next : null;
  const left = remaining === null ? '' : `${t('in')} ${formatDuration(remaining, locale)}`;

  const dayLabel =
    offset === 0
      ? `${t('today')} · ${formatDay(locale, date, 'weekday')}`
      : formatDay(locale, date, 'weekday');

  return (
    <div className="a-screen" style={{ gap: 14 }}>
      <h1 className="visually-hidden">{t('title')}</h1>

      <div className="a-dayswitch">
        <button
          type="button"
          className="a-circle"
          aria-label={tApp('previousDay')}
          onClick={() => setOffset((o) => o - 1)}
        >
          <CaretLeft size={18} weight="bold" aria-hidden="true" className="mirror" />
        </button>
        <button
          type="button"
          className="a-dayswitch-mid"
          onClick={() => setOffset(0)}
          aria-live="polite"
        >
          <span className="a-dayswitch-day">{dayLabel}</span>
          <span className="a-sub">
            {formatHijri(date, locale, at.timeZone)}
            {/* The German line above is already the Gregorian date; the
                Persian one is the solar date, so the Gregorian follows here. */}
            {locale === 'de'
              ? null
              : ` · ${formatDay(locale, date, 'dayMonth', { calendar: 'gregory' })}`}
          </span>
        </button>
        <button
          type="button"
          className="a-circle"
          aria-label={tApp('nextDay')}
          onClick={() => setOffset((o) => o + 1)}
        >
          <CaretRight size={18} weight="bold" aria-hidden="true" className="mirror" />
        </button>
      </div>

      <div className="a-placerow">
        <button
          type="button"
          className="a-placerow-where"
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
        >
          <MapPin size={17} weight="duotone" aria-hidden="true" />
          {where}
        </button>
        <span className="a-tag">{tApp('methodChip')}</span>
      </div>
      {picking ? (
        <div className="a-card a-placepick">
          <CityCombobox
            value={
              place.choice.kind === 'city'
                ? place.choice.city.id
                : place.choice.kind === 'located'
                  ? ''
                  : DEFAULT_CITY_ID
            }
            recent={[]}
            onChoose={(id) => {
              chooseCity(id);
              setPicking(false);
            }}
            locale={locale}
            located={place.choice.kind === 'located'}
          />
          {place.choice.kind === 'house' ? (
            <button type="button" className="a-btn" data-variant="soft" onClick={locate}>
              <MapPin size={17} weight="duotone" aria-hidden="true" />
              {t('useMyLocation')}
            </button>
          ) : (
            <button type="button" className="a-btn" data-variant="soft" onClick={chooseHouse}>
              <ArrowCounterClockwise size={17} weight="duotone" aria-hidden="true" />
              {t('backToVienna')}
            </button>
          )}
          {place.choice.kind === 'city' ? (
            <p className="a-sub">{cityName(place.choice.city, locale)}</p>
          ) : null}
        </div>
      ) : null}

      <ol className="a-ptimes">
        {ROWS.map(({ key, icon: RowIcon }) => {
          const isNext = next?.key === key && !next.tomorrow;
          const value = day.times[key];
          // Gone by: every time on an earlier day, today's before the next
          // prayer, and all of today's once the next is tomorrow's Fajr.
          const past =
            offset < 0 ||
            (offset === 0 &&
              !isNext &&
              (next?.tomorrow || (next !== null && value !== null && value < next.minutes)));
          const on = adhan[key];
          return (
            <li
              key={key}
              className="a-prow"
              data-next={isNext || undefined}
              data-past={past || undefined}
            >
              <span className="a-ico" data-size="44">
                <RowIcon size={22} weight="duotone" aria-hidden="true" />
              </span>
              <span className="a-stack a-grow">
                <span className="a-prow-name">{t(`names.${key}`)}</span>
                {isNext && left ? <span className="a-prow-left">{left}</span> : null}
              </span>
              <span className="a-prow-time">{formatClock(value, locale)}</span>
              <button
                type="button"
                className="a-prow-bell"
                aria-pressed={on}
                aria-label={tApp(on ? 'adhanOff' : 'adhanOn', { prayer: t(`names.${key}`) })}
                onClick={() => setAdhan(key, !on)}
              >
                {on ? (
                  <BellRinging size={21} weight="fill" aria-hidden="true" />
                ) : (
                  <BellSlash size={21} weight="duotone" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="a-card a-row" style={{ padding: '14px 16px', gap: 12 }}>
        <MoonStars
          size={24}
          weight="duotone"
          aria-hidden="true"
          style={{ color: 'var(--goldInk)' }}
        />
        <span className="a-grow" style={{ fontSize: 'calc(14.5px * var(--a-fs))' }}>
          {t('names.midnight')}:{' '}
          <strong style={{ color: 'var(--head)' }}>
            {formatClock(day.times.midnight, locale)}
          </strong>
        </span>
        <a href="#prayer-month" className="a-link">
          {tApp('monthCalendar')}
        </a>
      </div>
      <span id="prayer-month" />
    </div>
  );
}
