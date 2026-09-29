/**
 * Days the community marks that the editors do not keep in the database.
 *
 * These used to come from the Aladhan API, which hands a list of holiday
 * names with each day it returns. That was wrong twice over. The API's list
 * is not a Shia calendar — most of it is the anniversaries of Naqshbandi
 * shaykhs, and some of it follows Sunni dating — so all but a handful had to
 * be thrown away; and the dates came back in the Saudi reckoning, so the few
 * that were kept landed a day before the rest of the calendar now that the
 * grid reads the Iranian one (`lib/hijri`). They were also simply absent from
 * the static preview, which has no API to ask.
 *
 * So they are Hijri dates here, matched the same way the editors' occasions
 * are: the same calendar, the same day, computed offline, and on a day the
 * editors have something of their own for, theirs wins.
 *
 * The names and notes stay in the message catalogue (`prayer.holidays`), in
 * both languages, because they are words on the page rather than data about
 * the sky.
 */
export const HOLIDAY_KEYS = [
  'ramadanStart',
  'arafa',
  'birthHusayn',
  'birthAbbas',
  'birthSajjad',
  'birthAliAkbar',
] as const;
export type HolidayKey = (typeof HOLIDAY_KEYS)[number];

export interface Holiday {
  key: HolidayKey;
  /** 1 = Muharram … 12 = Dhu al-Hijja. */
  hijriMonth: number;
  hijriDay: number;
}

export const HOLIDAYS: readonly Holiday[] = [
  { key: 'ramadanStart', hijriMonth: 9, hijriDay: 1 },
  // The day of Arafa, the eve of the Eid.
  { key: 'arafa', hijriMonth: 12, hijriDay: 9 },
  // The births of Shaban, in the order they fall: Imam Husain on the third,
  // his brother Abbas on the fourth, Imam Sajjad on the fifth, and Ali
  // al-Akbar on the eleventh.
  { key: 'birthHusayn', hijriMonth: 8, hijriDay: 3 },
  { key: 'birthAbbas', hijriMonth: 8, hijriDay: 4 },
  { key: 'birthSajjad', hijriMonth: 8, hijriDay: 5 },
  { key: 'birthAliAkbar', hijriMonth: 8, hijriDay: 11 },
];
