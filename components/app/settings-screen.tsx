'use client';

import { useTranslations } from 'next-intl';
import {
  BellRinging,
  Calculator,
  Microphone,
  TextAa,
  Translate,
} from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/lib/i18n/navigation';
import { useQuranStore } from '@/components/site/use-quran-store';
import { RECITERS, type Reciter } from '@/components/site/use-quran-audio';
import { LangSwitch } from '@/components/ui/lang-switch';
import { ThemeToggle } from '@/components/site/theme-toggle';
import type { ThemeValue } from '@/components/site/theme';
import { useEffect, useState } from 'react';
import {
  ADHAN_APP_URL,
  ADHAN_DEFAULT,
  inApp,
  setAdhan,
  useAdhanPrefs,
  type AdhanKey,
} from './adhan-prefs';

/**
 * The app's settings, grouped as the design has them: the adhan per prayer,
 * the Quran's reciter, translation and text size, and the display. Every
 * switch here is the same one the prayer page and the reader use.
 */
export function SettingsScreen({ theme }: { theme: ThemeValue }) {
  const t = useTranslations('app');
  const tPrayer = useTranslations('prayer');
  const tQuran = useTranslations('quran');
  const adhan = useAdhanPrefs();
  const quran = useQuranStore();
  const [app, setApp] = useState(false);
  useEffect(() => setApp(inApp()), []);

  return (
    <div className="a-screen more-page" style={{ gap: 18 }}>
      <section className="a-stack" style={{ gap: 6 }} aria-labelledby="set-adhan">
        <h2 id="set-adhan" className="a-label">
          {t('setAdhan')}
        </h2>
        <div className="a-list">
          {(Object.keys(ADHAN_DEFAULT) as AdhanKey[]).map((key) => (
            <div key={key} className="a-list-row" style={{ cursor: 'default', minBlockSize: 62 }}>
              <BellRinging size={22} weight="duotone" aria-hidden="true" />
              <span className="a-grow" id={`adhan-${key}`}>
                {tPrayer(`names.${key}`)}
              </span>
              <button
                type="button"
                role="switch"
                className="a-switch"
                aria-checked={adhan[key]}
                aria-labelledby={`adhan-${key}`}
                onClick={() => setAdhan(key, !adhan[key])}
              />
            </div>
          ))}
          <Link href="/prayer" className="a-list-row">
            <Calculator size={22} weight="duotone" aria-hidden="true" />
            <span className="a-stack a-grow">
              <span>{t('method')}</span>
              <span className="a-sub">{tPrayer('method')}</span>
            </span>
          </Link>
        </div>
        {app ? (
          <a href={ADHAN_APP_URL} className="a-btn" data-variant="soft" data-block>
            <BellRinging size={19} weight="duotone" aria-hidden="true" />
            {t('adhanInApp')}
          </a>
        ) : null}
        <p className="a-sub" style={{ paddingLeft: 6, paddingRight: 6, lineHeight: 1.8 }}>
          {app ? t('adhanNoteApp') : t('adhanNote')}
        </p>
      </section>

      <section className="a-stack" style={{ gap: 6 }} aria-labelledby="set-quran">
        <h2 id="set-quran" className="a-label">
          {tQuran('header.title')}
        </h2>
        <div className="a-list">
          <label className="a-list-row" style={{ minBlockSize: 62 }}>
            <Microphone size={22} weight="duotone" aria-hidden="true" />
            <span className="a-grow">{tQuran('reciter')}</span>
            <select
              className="a-select"
              value={quran.prefs.reciter}
              onChange={(event) => quran.setReciter(event.target.value as Reciter)}
            >
              {RECITERS.map((r) => (
                <option key={r} value={r}>
                  {tQuran(`reciters.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="a-list-row" style={{ cursor: 'default', minBlockSize: 62 }}>
            <Translate size={22} weight="duotone" aria-hidden="true" />
            <span className="a-grow" id="set-translation">
              {tQuran('translationShort')}
            </span>
            <button
              type="button"
              role="switch"
              className="a-switch"
              aria-checked={quran.prefs.translated}
              aria-labelledby="set-translation"
              onClick={quran.toggleTranslated}
            />
          </div>
          <div className="a-list-row" style={{ cursor: 'default', minBlockSize: 62 }}>
            <TextAa size={22} weight="duotone" aria-hidden="true" />
            <span className="a-grow">{tQuran('textSize')}</span>
            <span className="a-row" style={{ gap: 6 }}>
              <button
                type="button"
                className="a-circle"
                data-size="40"
                aria-label={tQuran('smaller')}
                onClick={quran.smaller}
              >
                A−
              </button>
              <span className="a-val" style={{ minInlineSize: 44, textAlign: 'center' }}>
                {Math.round(quran.prefs.scale * 100)}%
              </span>
              <button
                type="button"
                className="a-circle"
                data-size="40"
                aria-label={tQuran('larger')}
                onClick={quran.larger}
              >
                A+
              </button>
            </span>
          </div>
        </div>
      </section>

      <section className="a-stack" style={{ gap: 6 }} aria-labelledby="set-display">
        <h2 id="set-display" className="a-label">
          {t('setDisplay')}
        </h2>
        <div className="a-list">
          <div className="more-prefs a-list-row" style={{ cursor: 'default' }}>
            <span className="a-grow">{t('language')}</span>
            <LangSwitch labels="full" />
          </div>
          <div className="more-prefs a-list-row" style={{ cursor: 'default' }}>
            <span className="a-grow">{t('darkMode')}</span>
            <ThemeToggle theme={theme} className="a-circle" />
          </div>
        </div>
      </section>
    </div>
  );
}
