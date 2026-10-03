'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { CITIES, cityName, findCity, type City } from '@/lib/cities';
import type { Locale } from '@/lib/i18n/config';

/** Lower-case, accents and the Persian/Arabic letter variants folded together. */
function fold(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌ً-ٟ]/g, '');
}

/**
 * The city picker: type to filter, arrows to move, Enter to choose.
 *
 * The ARIA 1.2 combobox pattern — an input that owns a listbox — because a
 * list of forty cities in a plain select is a long scroll on a phone, and the
 * reader usually knows the first letters of the one they want. The cities the
 * reader picked before come first, under their own heading.
 */
export function CityCombobox({
  value,
  recent,
  onChoose,
  locale,
  located,
}: {
  /** The chosen city's id; '' while the reader's own position is showing. */
  value: string;
  recent: string[];
  onChoose: (id: string) => void;
  locale: Locale;
  located: boolean;
}) {
  const t = useTranslations('prayer');
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const chosen = findCity(value);
  const shownValue = open
    ? query
    : located
      ? t('todayYourPlace')
      : chosen
        ? cityName(chosen, locale)
        : '';

  const options = useMemo(() => {
    const q = fold(query.trim());
    const matches = (city: City) => !q || fold(city.de).includes(q) || fold(city.fa).includes(q);
    const recentCities = recent
      .map((r) => findCity(r))
      .filter((c): c is City => Boolean(c) && matches(c!));
    const rest = CITIES.filter((c) => matches(c) && !recentCities.includes(c));
    return [
      ...recentCities.map((city) => ({ city, recent: true })),
      ...rest.map((city) => ({ city, recent: false })),
    ];
  }, [query, recent]);

  function choose(city: City) {
    onChoose(city.id);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      if (open && options[active]) {
        event.preventDefault();
        choose(options[active].city);
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery('');
      }
    }
  }

  const activeId = open && options[active] ? `${id}-opt-${options[active].city.id}` : undefined;

  return (
    <div className="city-box">
      <label htmlFor={`${id}-input`} className="city-box-label">
        {t('cityLabel')}
      </label>
      <div className="city-box-field">
        <MagnifyingGlass size={18} weight="duotone" aria-hidden="true" className="city-box-icon" />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('citySearch')}
          value={shownValue}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onClick={() => setOpen(true)}
          onBlur={() => {
            // Let a click on an option land before the list goes away.
            window.setTimeout(() => {
              setOpen(false);
              setQuery('');
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <CaretDown size={14} weight="bold" aria-hidden="true" className="city-box-caret" />
      </div>
      <ul
        id={listId}
        role="listbox"
        className="city-box-list"
        hidden={!open}
        aria-label={t('cityLabel')}
      >
        {options.length === 0 ? (
          <li className="city-box-empty" role="presentation">
            {t('cityNone')}
          </li>
        ) : null}
        {options.map(({ city, recent: isRecent }, index) => (
          <li
            key={city.id}
            id={`${id}-opt-${city.id}`}
            role="option"
            aria-selected={city.id === value}
            data-active={index === active ? 'true' : undefined}
            data-recent={isRecent ? 'true' : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(city)}
            onMouseEnter={() => setActive(index)}
          >
            <span>{cityName(city, locale)}</span>
            <span className="city-box-group">
              {isRecent ? t('cityRecent') : t(`cityGroups.${city.group}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
