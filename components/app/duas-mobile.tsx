'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  FlagBanner,
  HandsPraying,
  Heart,
  MagnifyingGlass,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import type { DuaEntry } from '@/lib/db/queries/content';

export type DuaItem = Pick<DuaEntry, 'slug' | 'category' | 'title' | 'summary' | 'whenToRead'> & {
  hasText: boolean;
};

const ICONS = { dua: HandsPraying, ziyara: FlagBanner, taqib: Sparkle } as const;
const FAV_KEY = 'ham:dua:fav';

/* Favourites, on this device. */
const favListeners = new Set<() => void>();
let favCache: { raw: string | null; list: string[] } = { raw: null, list: [] };
function readFavs(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(FAV_KEY);
  } catch {
    // Blocked storage: nothing remembered.
  }
  if (raw === favCache.raw) return favCache.list;
  let list: string[] = [];
  try {
    const parsed = JSON.parse(raw ?? '[]') as unknown;
    if (Array.isArray(parsed)) list = parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    list = [];
  }
  favCache = { raw, list };
  return list;
}
function toggleFav(slug: string) {
  const list = readFavs();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {
    favCache = { raw: favCache.raw, list: next };
  }
  for (const listener of favListeners) listener();
}
function subscribeFavs(listener: () => void) {
  favListeners.add(listener);
  return () => favListeners.delete(listener);
}
const NO_FAVS: string[] = [];

/**
 * The du'a the week suggests now, in Vienna: Kumayl from Thursday afternoon
 * through the night, Nudba on Friday, Tawassul on Tuesday evening, and the
 * morning covenant (al-'Ahd) on any other day.
 */
function suggestion(now: Date): { slug: string; reason: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const day = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  if ((day === 'Thu' && hour >= 14) || (day === 'Fri' && hour < 5))
    return { slug: 'kumail', reason: 'friNight' };
  if (day === 'Fri') return { slug: 'nudba', reason: 'friday' };
  if (day === 'Tue' && hour >= 14) return { slug: 'tawassul', reason: 'wedNight' };
  return { slug: 'ahd', reason: 'morning' };
}

/**
 * The du'as on a phone: the one the day suggests as a dark card, category
 * chips (and favourites), a search, and the list as rows with a heart each.
 */
export function DuasMobile({ duas }: { duas: DuaItem[] }) {
  const t = useTranslations('duas');
  const tApp = useTranslations('app');
  const favs = useSyncExternalStore(subscribeFavs, readFavs, () => NO_FAVS);
  const [filter, setFilter] = useState<'all' | 'fav' | DuaItem['category']>('all');
  const [query, setQuery] = useState('');
  const [today, setToday] = useState<{ slug: string; reason: string } | null>(null);
  useEffect(() => setToday(suggestion(new Date())), []);

  const featured = today ? duas.find((d) => d.slug === today.slug && d.hasText) : undefined;
  const categories = Array.from(new Set(duas.map((d) => d.category)));
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return duas.filter(
      (d) =>
        (filter === 'all' || (filter === 'fav' ? favs.includes(d.slug) : d.category === filter)) &&
        (!q || d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q)),
    );
  }, [duas, filter, favs, query]);

  return (
    <div className="a-screen" style={{ gap: 14 }}>
      <h1 className="visually-hidden">{tApp('duasTitle')}</h1>
      {featured && today ? (
        <article className="a-dark a-duaday a-rise">
          <span className="a-gold-text" style={{ fontSize: 13, fontWeight: 700 }}>
            {tApp('duaToday')} · {tApp(`duaReason.${today.reason}`)}
          </span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{featured.title}</span>
          <span className="a-dark-dim clamp-2" style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            {featured.summary}
          </span>
          <div className="a-row" style={{ gap: 8 }}>
            <Link
              href={`/duas/${featured.slug}`}
              className="a-btn"
              data-variant="gold"
              data-size="40"
            >
              <BookOpen size={17} weight="duotone" aria-hidden="true" />
              {tApp('read')}
            </Link>
          </div>
        </article>
      ) : null}

      <label className="a-search">
        <MagnifyingGlass size={21} weight="duotone" aria-hidden="true" />
        <span className="visually-hidden">{tApp('searchDuas')}</span>
        <input
          type="search"
          value={query}
          placeholder={tApp('searchDuas')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="a-chips" role="group" aria-label={t('filterByCategory')}>
        {(['all', ...categories, 'fav'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className="a-chip"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {key === 'all'
              ? tApp('all')
              : key === 'fav'
                ? tApp('favourites')
                : t(`category.${key}`)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="a-sub" style={{ fontSize: 14 }}>
          {filter === 'fav' ? tApp('favouritesEmpty') : t('none')}
        </p>
      ) : (
        <ul className="a-rows">
          {shown.map((dua) => {
            const Icon = ICONS[dua.category];
            const fav = favs.includes(dua.slug);
            const body = (
              <>
                <span className="a-ico" data-size="44">
                  <Icon size={23} weight="duotone" aria-hidden="true" />
                </span>
                <span className="a-stack a-grow">
                  <span className="a-title">{dua.title}</span>
                  <span className="a-sub clamp-2">{dua.whenToRead}</span>
                </span>
              </>
            );
            return (
              <li key={dua.slug} className="a-card a-dua-row">
                {dua.hasText ? (
                  <Link href={`/duas/${dua.slug}`} className="a-dua-link">
                    {body}
                  </Link>
                ) : (
                  <span className="a-dua-link">{body}</span>
                )}
                <button
                  type="button"
                  className="a-prow-bell"
                  style={{ color: 'var(--goldInk)' }}
                  aria-pressed={fav}
                  aria-label={tApp(fav ? 'unfavourite' : 'favourite', { title: dua.title })}
                  onClick={() => toggleFav(dua.slug)}
                >
                  <Heart size={20} weight={fav ? 'fill' : 'duotone'} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="a-sub" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
        {t('note')}
      </p>
    </div>
  );
}
