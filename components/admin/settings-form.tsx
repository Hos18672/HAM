'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions/admin';
import type { SiteSettings } from '@/lib/db/queries/content';
import { Field, Input, Select } from '../ui/field';
import { SaveBar } from './save-bar';
import { useToast } from './toast';
import { expandOpeningDays, groupOpeningDays } from '@/lib/site-facts';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

type DayMode = 'open' | 'programme' | 'closed';
interface DayHours {
  mode: DayMode;
  open: string;
  close: string;
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDays = useMemo<DayHours[]>(
    () =>
      expandOpeningDays(settings.openingHours).map((day) => ({
        mode: day.closed ? 'closed' : day.open && day.close ? 'open' : 'programme',
        open: day.open ?? '',
        close: day.close ?? '',
      })),
    [settings.openingHours],
  );
  const [days, setDays] = useState<DayHours[]>(initialDays);

  const dirty =
    (Object.keys(values) as (keyof SiteSettings)[]).some(
      (key) => key !== 'openingHours' && values[key] !== settings[key],
    ) || JSON.stringify(days) !== JSON.stringify(initialDays);

  function setDay(index: number, patch: Partial<DayHours>) {
    setDays((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveSettings({
      ...values,
      openingHours: groupOpeningDays(
        days.map((day) => ({
          open: day.mode === 'open' ? day.open : null,
          close: day.mode === 'open' ? day.close : null,
          closed: day.mode === 'closed',
        })),
      ),
    });
    setSaving(false);

    if (result.ok) {
      toast.show('Einstellungen gespeichert.', 'success');
      router.refresh();
    } else {
      setError(result.error ?? 'Das hat nicht geklappt.');
      toast.show(result.error ?? 'Das hat nicht geklappt.', 'error');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxInlineSize: '40rem' }}>
      <Field
        label="Standardsprache"
        hint="Bestimmt, in welcher Sprache die Website zuerst erscheint."
      >
        {(props) => (
          <Select
            {...props}
            value={values.defaultLocale}
            onChange={(event) => set('defaultLocale', event.target.value as 'fa' | 'de')}
          >
            <option value="fa">فارسی</option>
            <option value="de">Deutsch</option>
          </Select>
        )}
      </Field>

      <Field
        label="Standarddarstellung"
        hint="Hell oder dunkel, solange niemand selbst umschaltet."
      >
        {(props) => (
          <Select
            {...props}
            value={values.defaultTheme}
            onChange={(event) => set('defaultTheme', event.target.value as 'light' | 'dark')}
          >
            <option value="light">Hell</option>
            <option value="dark">Dunkel</option>
          </Select>
        )}
      </Field>

      <div className="field">
        <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={values.showOpeningEvent}
            onChange={(event) => set('showOpeningEvent', event.target.checked)}
          />
          <span className="field-label">Eröffnungstermin auf der Startseite zeigen</span>
        </label>
        <p className="field-hint">
          Zeigt den als „Eröffnungstermin“ markierten Termin als hervorgehobenen Block.
        </p>
      </div>

      <Field label="E-Mail-Adresse">
        {(props) => (
          <Input
            {...props}
            type="email"
            dir="ltr"
            value={values.contactEmail}
            onChange={(event) => set('contactEmail', event.target.value)}
          />
        )}
      </Field>

      <Field label="Telefon">
        {(props) => (
          <Input
            {...props}
            type="tel"
            dir="ltr"
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
        )}
      </Field>

      <Field label="Adresse">
        {(props) => (
          <Input
            {...props}
            type="text"
            value={values.address}
            onChange={(event) => set('address', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Kontoinhaber"
        hint="Genau wie bei der Bank hinterlegt – Überweisungen werden mit diesem Namen abgeglichen."
      >
        {(props) => (
          <Input
            {...props}
            type="text"
            maxLength={70}
            value={values.accountHolder}
            onChange={(event) => set('accountHolder', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="IBAN"
        hint="Erscheint mit dem Kontoinhaber und einem QR-Code zum Scannen auf der Seite „Unterstützen“."
      >
        {(props) => (
          <Input
            {...props}
            type="text"
            dir="ltr"
            value={values.iban}
            onChange={(event) => set('iban', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Link zur Karte"
        hint="Eine vollständige Adresse zu Google Maps. Leer lassen für die Standardkarte."
      >
        {(props) => (
          <Input
            {...props}
            type="url"
            dir="ltr"
            value={values.mapUrl}
            onChange={(event) => set('mapUrl', event.target.value)}
          />
        )}
      </Field>

      <fieldset
        style={{
          display: 'grid',
          gap: 'var(--space-3)',
          border: 0,
          margin: 0,
          padding: 0,
          paddingBlockStart: 'var(--space-3)',
          borderBlockStart: 'var(--rule-hair) solid var(--color-rule)',
        }}
      >
        <legend className="field-label" style={{ paddingBlockEnd: 'var(--space-2)' }}>
          Öffnungszeiten
        </legend>
        <p className="field-hint" style={{ margin: 0 }}>
          Erscheinen auf der Kontaktseite, im Seitenfuß und als „Jetzt geöffnet“. Tage mit gleichen
          Zeiten werden auf der Website zusammengefasst („Montag – Donnerstag“).
        </p>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">Status</th>
              <th scope="col">Von</th>
              <th scope="col">Bis</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, index) => (
              <tr key={WEEKDAYS[index]}>
                <th scope="row">{WEEKDAYS[index]}</th>
                <td>
                  <Select
                    aria-label={`${WEEKDAYS[index]}: Status`}
                    value={day.mode}
                    onChange={(event) => {
                      const mode = event.target.value as DayMode;
                      // Opening a day that had no hours starts from sensible ones.
                      setDay(
                        index,
                        mode === 'open' && !day.open
                          ? { mode, open: '16:00', close: '20:00' }
                          : { mode },
                      );
                    }}
                  >
                    <option value="open">Geöffnet</option>
                    <option value="programme">Nach Programm</option>
                    <option value="closed">Geschlossen</option>
                  </Select>
                </td>
                <td>
                  <Input
                    type="time"
                    aria-label={`${WEEKDAYS[index]}: geöffnet ab`}
                    value={day.open}
                    disabled={day.mode !== 'open'}
                    onChange={(event) => setDay(index, { open: event.target.value })}
                  />
                </td>
                <td>
                  <Input
                    type="time"
                    aria-label={`${WEEKDAYS[index]}: geöffnet bis`}
                    value={day.close}
                    disabled={day.mode !== 'open'}
                    onChange={(event) => setDay(index, { close: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>

      <div aria-live="polite">{error ? <p className="field-error">{error}</p> : null}</div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => {
          setValues(settings);
          setDays(initialDays);
        }}
      />
    </div>
  );
}
