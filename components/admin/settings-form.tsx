'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettings } from '@/app/actions/admin';
import type { SiteSettings } from '@/lib/db/queries/content';
import { Field, Input, Select } from '../ui/field';
import { SaveBar } from './save-bar';
import { useToast } from './toast';

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = (Object.keys(values) as (keyof SiteSettings)[]).some(
    (key) => values[key] !== settings[key],
  );

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveSettings(values);
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

      <Field label="Standarddarstellung" hint="Hell oder dunkel, solange niemand selbst umschaltet.">
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

      <Field label="IBAN" hint="Erscheint auf der Seite „Mitglied werden“.">
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

      <Field label="Link zur Karte" hint="Eine vollständige Adresse, zum Beispiel zu OpenStreetMap.">
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

      <div aria-live="polite">{error ? <p className="field-error">{error}</p> : null}</div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => setValues(settings)}
      />
    </div>
  );
}
