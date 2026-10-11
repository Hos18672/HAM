'use client';

import { useTranslations } from 'next-intl';
import { MapPin } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { digits, formatClock, formatDay } from '@/lib/i18n/format';
import { formatHijri } from '@/lib/hijri';
import { useNext } from '@/components/ui/next-prayer';
import type { PrayerKey } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';

export const SIX: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** "1:12" — hours and minutes left, for the ring. */
function shortLeft(seconds: number, locale: Locale) {
  const minutes = Math.ceil(seconds / 60);
  return digits(`${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`, locale);
}

/**
 * How far the day has come from the last prayer towards the next, 0–1, for
 * the gold ring. Before Fajr it counts from the previous Isha.
 */
function progress(day: PrayerDay, remaining: number | null) {
  const next = day.next;
  if (!next || remaining === null) return 0;
  const now = next.minutes - remaining / 60;
  const before = SIX.map((key) => day.times[key]).filter(
    (m): m is number => m !== null && m <= now,
  );
  const from = before.length ? Math.max(...before) : (day.times.isha ?? 0) - 1440;
  const span = next.minutes - from;
  return span > 0 ? Math.min(1, Math.max(0, (now - from) / span)) : 0;
}

/**
 * The home screen's hero: today's dates and the place, the next prayer with
 * a ring that fills towards it, and the day's six times underneath, the next
 * one in gold. The whole card opens the prayer page.
 */
export function PrayerHero({ day: initial, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const tApp = useTranslations('app');
  const { day, next, where, left, remaining } = useNext(initial, locale);
  const date = new Date(day.gregorianIso);
  const share = progress(day, remaining);

  return (
    <Link href="/prayer" className="a-dark a-hero a-rise" aria-live="off">
      <span className="a-hero-top">
        <span className="a-hero-date">
          <span>{formatDay(locale, date, 'weekday')}</span>
          {' · '}
          <span>{formatHijri(date, locale, day.place.timeZone)}</span>
        </span>
        <span className="a-hero-where">
          <MapPin size={14} weight="duotone" aria-hidden="true" />
          {where}
        </span>
      </span>
      <span className="a-hero-main">
        <span
          className="a-ring"
          style={{ '--share': `${Math.round(share * 100)}%` } as React.CSSProperties}
          aria-hidden="true"
        >
          <span className="a-ring-core">
            {remaining === null ? '' : shortLeft(remaining, locale)}
          </span>
        </span>
        <span className="a-stack a-hero-next">
          <span className="a-hero-label">{t('nextPrayer')}</span>
          {/* Name and time on one line that may wrap between them, never
              inside either. */}
          <span className="a-hero-line">
            <span className="a-hero-name">{next ? tApp(`short.${next.key}`) : '—'}</span>
            {next ? <span className="a-hero-time">{formatClock(next.minutes, locale)}</span> : null}
          </span>
          <span className="a-hero-left">
            {next?.tomorrow ? `${t('tomorrow')} · ` : ''}
            {left}
          </span>
        </span>
      </span>
      <span className="a-six">
        {SIX.map((key) => {
          const value = day.times[key];
          const isNext = next?.key === key && !next.tomorrow;
          const past = !isNext && next && !next.tomorrow && value !== null && value < next.minutes;
          return (
            <span
              key={key}
              className="a-six-cell"
              data-next={isNext || undefined}
              data-past={past || undefined}
            >
              <span className="a-six-name">{tApp(`short.${key}`)}</span>
              <span className="a-six-time">{formatClock(value, locale)}</span>
            </span>
          );
        })}
      </span>
    </Link>
  );
}
