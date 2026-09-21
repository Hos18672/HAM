'use client';

import { useId } from 'react';
import { cn } from '../ui/cn';

export type LanguageView = 'both' | 'de' | 'fa';

/**
 * One field, both languages side by side.
 *
 * The Persian input carries `dir="rtl"` and the Naskh face, so what an editor
 * types looks the way it will look on the site. The two inputs sit in a grid
 * rather than a flex row so the German and Persian labels stay aligned even
 * when one wraps.
 */
export function BilingualField({
  label,
  hint,
  values,
  onChange,
  view,
  multiline,
  rows = 3,
  disabled,
}: {
  label: string;
  hint?: string;
  values: { de: string; fa: string };
  onChange: (locale: 'de' | 'fa', value: string) => void;
  view: LanguageView;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const showDe = view === 'both' || view === 'de';
  const showFa = view === 'both' || view === 'fa';

  const control = (locale: 'de' | 'fa') => {
    const props = {
      id: `${id}-${locale}`,
      className: 'input',
      value: values[locale] ?? '',
      disabled,
      dir: locale === 'fa' ? ('rtl' as const) : ('ltr' as const),
      lang: locale,
      style: locale === 'fa' ? { fontFamily: 'var(--font-naskh)' } : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(locale, event.target.value),
    };
    return multiline ? <textarea rows={rows} {...props} /> : <input type="text" {...props} />;
  };

  return (
    <div className="field">
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      {hint ? <p className="field-hint">{hint}</p> : null}

      <div
        role="group"
        aria-labelledby={`${id}-label`}
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          gridTemplateColumns: view === 'both' ? 'repeat(auto-fit, minmax(min(16rem, 100%), 1fr))' : '1fr',
        }}
      >
        {showDe ? (
          <div className={cn('field')}>
            <label className="kicker" htmlFor={`${id}-de`}>
              Deutsch
            </label>
            {control('de')}
          </div>
        ) : null}

        {showFa ? (
          <div className={cn('field')}>
            <label className="kicker" htmlFor={`${id}-fa`} lang="fa" dir="rtl">
              فارسی
            </label>
            {control('fa')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The Beide Sprachen / Nur Deutsch / Nur فارسی toggle. */
export function LanguageToggle({
  view,
  onChange,
}: {
  view: LanguageView;
  onChange: (view: LanguageView) => void;
}) {
  const options: { value: LanguageView; label: string; lang?: string }[] = [
    { value: 'both', label: 'Beide Sprachen' },
    { value: 'de', label: 'Nur Deutsch' },
    { value: 'fa', label: 'Nur فارسی' },
  ];

  return (
    <div role="group" aria-label="Sprachansicht" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="tag"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
