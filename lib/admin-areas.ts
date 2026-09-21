import type { EntityKind } from './validation/content';

/**
 * What each admin content area looks like.
 *
 * One declaration per area drives the whole editor: which entity it writes,
 * which fields it shows, how they are labelled in German, and which base-row
 * controls (category, publish flag, dates) sit alongside the translated text.
 */

export interface FieldSpec {
  name: string;
  label: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}

export interface BaseFieldSpec {
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'datetime' | 'number' | 'icon';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  hint?: string;
}

export interface AreaSpec {
  key: string;
  entity: EntityKind;
  title: string;
  description: string;
  /** Which translated field to use as the collapsed card's heading. */
  titleField: string;
  fields: FieldSpec[];
  baseFields: BaseFieldSpec[];
  /** Whether "+ Neuer Eintrag" and the row controls are offered. */
  addable: boolean;
  sortable: boolean;
}

const PUBLISHED: BaseFieldSpec = {
  name: 'published',
  label: 'Veröffentlicht',
  type: 'boolean',
  hint: 'Nicht veröffentlichte Einträge sind auf der Website unsichtbar.',
};

export const AREAS: Record<string, AreaSpec> = {
  pages: {
    key: 'pages',
    entity: 'page',
    title: 'Seitenköpfe',
    description:
      'Die Überschrift, die Dachzeile und der Einleitungstext jeder Seite. Neue Seiten können hier nicht angelegt werden — dafür braucht es eine Änderung am Programmcode.',
    titleField: 'title',
    fields: [
      { name: 'kicker', label: 'Dachzeile', hint: 'Die kleine Zeile über der Überschrift.' },
      { name: 'title', label: 'Überschrift' },
      { name: 'lead', label: 'Einleitung', multiline: true, rows: 3 },
    ],
    baseFields: [PUBLISHED],
    addable: false,
    sortable: true,
  },
  blocks: {
    key: 'blocks',
    entity: 'block',
    title: 'Textbausteine',
    description:
      'Einzelne Texte innerhalb der Seiten — Absätze, Zitate und Aufzählungen. Bei Aufzählungen steht jeder Punkt in einer eigenen Zeile.',
    titleField: 'text',
    fields: [{ name: 'text', label: 'Text', multiline: true, rows: 5 }],
    baseFields: [],
    addable: false,
    sortable: true,
  },
  offers: {
    key: 'offers',
    entity: 'offer',
    title: 'Angebote',
    description: 'Die Bereiche, in denen der Verein arbeitet. Sie erscheinen auf der Startseite und unter „Angebote“.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 3 },
    ],
    baseFields: [
      { name: 'icon', label: 'Symbol', type: 'icon' },
      PUBLISHED,
    ],
    addable: true,
    sortable: true,
  },
  courses: {
    key: 'courses',
    entity: 'course',
    title: 'Kurse',
    description: 'Das Kursangebot. Der Bereich steuert, unter welchem Filter ein Kurs erscheint.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 3 },
      { name: 'targetGroup', label: 'Zielgruppe' },
      { name: 'schedule', label: 'Zeiten' },
      { name: 'languages', label: 'Sprachen' },
    ],
    baseFields: [
      {
        name: 'category',
        label: 'Bereich',
        type: 'select',
        options: [
          { value: 'language', label: 'Sprache' },
          { value: 'religion', label: 'Religion' },
          { value: 'children', label: 'Kinder' },
          { value: 'adults', label: 'Erwachsene' },
          { value: 'integration', label: 'Integration' },
          { value: 'art', label: 'Kunst' },
        ],
      },
      { name: 'level', label: 'Niveau', type: 'text', hint: 'Zum Beispiel A1, B1 — oder leer lassen.' },
      { name: 'slug', label: 'Kurzname (URL)', type: 'text' },
      PUBLISHED,
    ],
    addable: true,
    sortable: true,
  },
  events: {
    key: 'events',
    entity: 'event',
    title: 'Termine',
    description:
      'Veranstaltungen. Vergangene Termine werden nicht gelöscht, sondern rutschen automatisch ins Archiv.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 3 },
      { name: 'location', label: 'Ort' },
    ],
    baseFields: [
      { name: 'startsAt', label: 'Beginn', type: 'datetime' },
      { name: 'endsAt', label: 'Ende', type: 'datetime' },
      { name: 'category', label: 'Art', type: 'text' },
      { name: 'slug', label: 'Kurzname (URL)', type: 'text' },
      {
        name: 'featured',
        label: 'Als Eröffnungstermin hervorheben',
        type: 'boolean',
        hint: 'Erscheint dann als hervorgehobener Block auf der Startseite.',
      },
      PUBLISHED,
    ],
    addable: true,
    sortable: false,
  },
  sports: {
    key: 'sports',
    entity: 'sport',
    title: 'Sport',
    description: 'Die Sportangebote mit Zielgruppe und Trainingszeit.',
    titleField: 'activity',
    fields: [
      { name: 'activity', label: 'Aktivität' },
      { name: 'audience', label: 'Für wen' },
      { name: 'schedule', label: 'Trainingszeiten' },
    ],
    baseFields: [PUBLISHED],
    addable: true,
    sortable: true,
  },
  culture: {
    key: 'culture',
    entity: 'culture',
    title: 'Kultur',
    description: 'Die kulturellen Formate auf der Kulturseite.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 3 },
    ],
    baseFields: [PUBLISHED],
    addable: true,
    sortable: true,
  },
  community: {
    key: 'community',
    entity: 'community',
    title: 'Gemeinschaft',
    description: 'Nachbarschaftshilfe, Begleitung und Ehrenamt.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 3 },
    ],
    baseFields: [PUBLISHED],
    addable: true,
    sortable: true,
  },
  values: {
    key: 'values',
    entity: 'values',
    title: 'Werte',
    description: 'Was dem Verein wichtig ist — erscheint auf der Seite „Über uns“.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'body', label: 'Beschreibung', multiline: true, rows: 2 },
    ],
    baseFields: [],
    addable: true,
    sortable: true,
  },
  week: {
    key: 'week',
    entity: 'week',
    title: 'Wochenplan',
    description: 'Die Tabelle auf der Seite „Über uns“.',
    titleField: 'label',
    fields: [
      { name: 'label', label: 'Tag' },
      { name: 'detail', label: 'Was an diesem Tag stattfindet' },
    ],
    baseFields: [
      {
        name: 'weekday',
        label: 'Wochentag',
        type: 'select',
        options: [
          { value: '0', label: 'Sonntag' },
          { value: '1', label: 'Montag' },
          { value: '2', label: 'Dienstag' },
          { value: '3', label: 'Mittwoch' },
          { value: '4', label: 'Donnerstag' },
          { value: '5', label: 'Freitag' },
          { value: '6', label: 'Samstag' },
        ],
      },
    ],
    addable: true,
    sortable: true,
  },
  duas: {
    key: 'duas',
    entity: 'dua',
    title: 'Bittgebete',
    description:
      'Duʿa, Ziyarat und Taʿqibat. Der arabische Titel erscheint groß und blass im Hintergrund der Karte.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Titel' },
      { name: 'summary', label: 'Kurze Erklärung', multiline: true, rows: 3 },
      { name: 'whenToRead', label: 'Wann zu lesen' },
      { name: 'source', label: 'Quelle' },
      {
        name: 'translation',
        label: 'Übersetzung (optional)',
        multiline: true,
        rows: 6,
        hint: 'Kann leer bleiben. Wird für eine spätere Leseansicht vorgehalten.',
      },
    ],
    baseFields: [
      {
        name: 'category',
        label: 'Art',
        type: 'select',
        options: [
          { value: 'dua', label: 'Bittgebet (دعا)' },
          { value: 'ziyara', label: 'Ziyarat (زیارت)' },
          { value: 'taqib', label: 'Taʿqibat (تعقیبات)' },
        ],
      },
      { name: 'arabicTitle', label: 'Arabischer Titel', type: 'text' },
      { name: 'slug', label: 'Kurzname (URL)', type: 'text' },
      PUBLISHED,
    ],
    addable: true,
    sortable: true,
  },
  occasions: {
    key: 'occasions',
    entity: 'occasion',
    title: 'Gedenktage',
    description:
      'Die Gedenktage im Hidschri-Kalender. Sie werden auf der Gebetszeitenseite automatisch auf das richtige gregorianische Datum gelegt.',
    titleField: 'name',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'note', label: 'Hinweis' },
    ],
    baseFields: [
      {
        name: 'hijriMonth',
        label: 'Hidschri-Monat',
        type: 'select',
        options: [
          { value: '1', label: '1 · Muharram' },
          { value: '2', label: '2 · Safar' },
          { value: '3', label: '3 · Rabi al-auwal' },
          { value: '4', label: '4 · Rabi ath-thani' },
          { value: '5', label: '5 · Dschumada l-ula' },
          { value: '6', label: '6 · Dschumada th-thaniya' },
          { value: '7', label: '7 · Radschab' },
          { value: '8', label: '8 · Schaban' },
          { value: '9', label: '9 · Ramadan' },
          { value: '10', label: '10 · Schauwal' },
          { value: '11', label: '11 · Dhu l-qada' },
          { value: '12', label: '12 · Dhu l-hiddscha' },
        ],
      },
      { name: 'hijriDay', label: 'Tag', type: 'number', min: 1, max: 30 },
    ],
    addable: true,
    sortable: true,
  },
  memberships: {
    key: 'memberships',
    entity: 'membership',
    title: 'Mitgliedsbeiträge',
    description: 'Die Beitragsstufen auf der Seite „Mitglied werden“.',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Bezeichnung' },
      { name: 'priceLabel', label: 'Beitrag', hint: 'Zum Beispiel „12 € im Monat“.' },
    ],
    baseFields: [{ name: 'tierKey', label: 'Kurzname', type: 'text' }],
    addable: true,
    sortable: true,
  },
};

export const AREA_KEYS = Object.keys(AREAS);
