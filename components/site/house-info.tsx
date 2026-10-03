import { getTranslations } from 'next-intl/server';
import { MapPin, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { tilesFor } from '@/lib/slippy';
import { FACTS, OPENING_HOURS, DIRECTIONS } from '@/lib/site-facts';
import { timeRange } from '@/lib/i18n/format';
import { weekdayName } from '@/lib/schedule';
import type { Locale } from '@/lib/i18n/config';

/** "Montag – Donnerstag", "جمعه" — a run of days as a range. */
function dayRange(days: readonly number[], locale: Locale) {
  const first = weekdayName(days[0]!, locale);
  if (days.length === 1) return first;
  return `${first} ${locale === 'fa' ? 'تا' : '–'} ${weekdayName(days[days.length - 1]!, locale)}`;
}

/** The opening hours, from the one structured list in `lib/site-facts`. */
export async function OpeningHours({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'house' });
  return (
    <dl className="hours">
      {OPENING_HOURS.map((window) => (
        <div key={window.days.join()}>
          <dt>{dayRange(window.days, locale)}</dt>
          <dd className="tabular">
            {window.open && window.close
              ? timeRange(window.open, window.close, locale)
              : t('byProgramme')}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** How to get here: tram, train, and the entrance once it is confirmed. */
export async function Directions({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'house' });
  const lines = DIRECTIONS[locale];
  const rows = [
    ['tram', lines.tram],
    ['train', lines.train],
    ['access', lines.access],
  ].filter(([, text]) => text);
  if (rows.length === 0) return null;
  return (
    <dl className="hours directions">
      {rows.map(([key, text]) => (
        <div key={key}>
          <dt>{t(`directions.${key}`)}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The street around the house, from OpenStreetMap's tiles — images only, the
 * one third-party request the site already allows (see the CSP). Lazy, so
 * nothing is fetched until it is scrolled near. No dark-mode filter: dimmed
 * tiles made the street names unreadable.
 */
export async function HouseMap({ locale, mapUrl }: { locale: Locale; mapUrl: string }) {
  const t = await getTranslations({ locale, namespace: 'house' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });
  const width = 768;
  const height = 384;
  const tiles = tilesFor(
    { latitude: FACTS.latitude, longitude: FACTS.longitude },
    17,
    width,
    height,
  );
  return (
    <figure className="house-map">
      <div className="house-map-frame" role="img" aria-label={t('mapLabel')}>
        <div className="house-map-tiles" style={{ inlineSize: width, blockSize: height }}>
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
              alt=""
              width={256}
              height={256}
              loading="lazy"
              decoding="async"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </div>
        <MapPin size={40} weight="fill" aria-hidden="true" className="house-map-pin" />
      </div>
      <figcaption className="house-map-caption">
        <span>© OpenStreetMap</span>
        {mapUrl ? (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer">
            {t('openMap')}
            <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            <span className="visually-hidden"> ({tA11y('externalLink')})</span>
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
