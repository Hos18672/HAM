'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Mosque } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { formatClock, formatDuration } from '@/lib/i18n/format';
import { cityName } from '@/lib/cities';
import { usePlaceDay, type PlaceState } from '@/lib/prayer-place';
import { useNextPrayer } from '@/lib/use-next-prayer';
import type { PrayerKey } from '@/lib/prayer-times';
import type { PrayerDay } from '@/lib/prayer-page';
import type { Locale } from '@/lib/i18n/config';
import { PulseDot } from './pulse-dot';
import { cn } from './cn';

/**
 * The next prayer, in two shapes: a card on phones and a strip of the day's
 * six times on wide screens. Both are for the same place as the prayer page
 * (`lib/prayer-place`), and both name it, so a time that is not Vienna's
 * never passes for it. The countdown is not announced as it ticks.
 */

const SIX: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function usePlaceName(place: PlaceState, locale: Locale) {
  const t = useTranslations('prayer');
  if (place.choice.kind === 'located') return t('placeYours');
  if (place.choice.kind === 'city') return cityName(place.choice.city, locale);
  return t('placeVienna');
}

/** The day, the next prayer and the time left to it, for the chosen place. */
function useNext(initial: PrayerDay, locale: Locale) {
  const t = useTranslations('prayer');
  const { day: shown, place } = usePlaceDay(initial);
  const { day, remaining } = useNextPrayer(shown);
  const where = usePlaceName(place, locale);
  const left = remaining === null ? '' : `${t('in')} ${formatDuration(remaining, locale)}`;
  return { day, next: day.next, where, left };
}

export function NextPrayerCard({
  day: initial,
  locale,
  className,
}: {
  day: PrayerDay;
  locale: Locale;
  className?: string;
}) {
  const t = useTranslations('prayer');
  const { next, where, left } = useNext(initial, locale);
  if (!next) return null;
  return (
    <Link href="/prayer" className={cn('npc', className)} aria-live="off">
      <span className="npc-icon">
        <Mosque size={24} weight="duotone" aria-hidden="true" />
        <PulseDot size={10} className="npc-dot" />
      </span>
      <span className="npc-body">
        <span className="npc-label">
          {t('nextPrayer')}
          {left ? ` · ${left}` : ''}
        </span>
        <span className="npc-main">
          <span className="npc-name">
            {t(`names.${next.key}`)}
            {next.tomorrow ? ` · ${t('tomorrow')}` : ''}
          </span>
          <span className="npc-time tabular">{formatClock(next.minutes, locale)}</span>
        </span>
        <span className="npc-where">{where}</span>
      </span>
      <span className="npc-go" aria-hidden="true">
        <ArrowRight size={18} weight="bold" className="mirror" />
      </span>
    </Link>
  );
}

export function PrayerStrip({
  day: initial,
  locale,
  className,
}: {
  day: PrayerDay;
  locale: Locale;
  className?: string;
}) {
  const t = useTranslations('prayer');
  const tHome = useTranslations('home');
  const { day, next, where, left } = useNext(initial, locale);
  return (
    <section className={cn('pstrip', className)} aria-labelledby="pstrip-title" aria-live="off">
      <div className="pstrip-head">
        <h2 id="pstrip-title" className="pstrip-title">
          {t('nextPrayer')} · {where}
        </h2>
        <Link href="/prayer" className="pstrip-all">
          {tHome('allTimesMonth')}
          <ArrowRight size={16} weight="bold" aria-hidden="true" className="mirror" />
        </Link>
      </div>
      <ol className="pstrip-cells">
        {SIX.map((key) => {
          const isNext = next?.key === key && !next.tomorrow;
          const value = day.times[key];
          return (
            <li key={key} className="pstrip-cell" data-next={isNext || undefined}>
              <span className="pstrip-name">{t(`names.${key}`)}</span>
              <span className="pstrip-time tabular">
                {value === null ? '—' : formatClock(value, locale)}
              </span>
              {isNext ? (
                <span className="pstrip-note">
                  {t('nextMark')}
                  {left ? ` · ${left}` : ''}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** "Nächstes Gebet: Asr 15:49 · in 1 Std. 12 Min." — the header's dateline. */
export function NextPrayerInline({ day: initial, locale }: { day: PrayerDay; locale: Locale }) {
  const t = useTranslations('prayer');
  const { next, left } = useNext(initial, locale);
  if (!next) return null;
  return (
    <Link href="/prayer" className="dateline-prayer" aria-live="off">
      <PulseDot />
      <span>
        {t('nextPrayer')}: {t(`names.${next.key}`)}{' '}
        <span className="tabular">{formatClock(next.minutes, locale)}</span>
        {left ? ` · ${left}` : ''}
      </span>
    </Link>
  );
}
