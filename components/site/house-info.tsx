import { getTranslations } from 'next-intl/server';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { ContactMap } from './contact-visit';
import { OPENING_HOURS, DIRECTIONS } from '@/lib/site-facts';
import { timeRange } from '@/lib/i18n/format';
import { weekdayName } from '@/lib/schedule';
import type { Locale } from '@/lib/i18n/config';

/** "Montag – Donnerstag", "جمعه" — a run of days as a range. */
export function dayRange(days: readonly number[], locale: Locale) {
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

/** Rendered by `scripts/contact-map.mjs`; until it exists the frame waits for a click. */
const HAS_MAP_IMAGE = existsSync(path.join(process.cwd(), 'public', 'map-contact@1x.webp'));

/**
 * The street around the house: the same picture as the contact page, from our
 * own server, and Google Maps in its place only when the visitor asks for it.
 * Nothing is fetched from a third party just because the page was scrolled.
 */
export async function HouseMap({ locale, mapUrl }: { locale: Locale; mapUrl: string }) {
  const t = await getTranslations({ locale, namespace: 'house' });
  const tContact = await getTranslations({ locale, namespace: 'contact' });
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });
  return (
    <figure className="house-map">
      <ContactMap label={t('mapLabel')} hasImage={HAS_MAP_IMAGE} frameClassName="house-map-frame">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="house-map-open">
          {tContact('openGoogle')}
          <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
          <span className="visually-hidden"> ({tA11y('externalLink')})</span>
        </a>
      </ContactMap>
      <figcaption className="house-map-caption">{tContact('osmCredit')}</figcaption>
    </figure>
  );
}
