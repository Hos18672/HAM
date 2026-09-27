/**
 * Which of the Aladhan API's holidays this site shows.
 *
 * The API's list is not a Shia calendar: most of it is the anniversaries of
 * Naqshbandi shaykhs, some of it follows Sunni dating (the Prophet's birthday
 * on the 12th of Rabi al-Awwal rather than the 17th), and every name is in
 * English. So nothing is shown because the API lists it — only the days
 * named here, which the community marks on the same date, and which the
 * occasions the editors keep in the database do not already cover. Their
 * names and notes are in the message catalogue (`prayer.holidays`), in both
 * languages.
 *
 * Matched on the API's exact wording: a renamed entry simply stops showing,
 * which is the safe way for this to fail.
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

const BY_API_NAME: Record<string, HolidayKey> = {
  '1st Day of Ramadan': 'ramadanStart',
  Arafa: 'arafa',
  'Birth of Sayyidina Husayn ibn `Ali (ر)': 'birthHusayn',
  'Birth of Sayyidina Abbas ibn `Ali (ر)': 'birthAbbas',
  'Birth of Sayyidina `Ali ibn Husayn (ر)': 'birthSajjad',
  'Birth of Sayyidina Ali Akbar ibn Husayn (ر)': 'birthAliAkbar',
};

/** The API's holiday names for a day → the ones this site shows. */
export function pickHolidays(names: string[]): HolidayKey[] {
  const keys = names.map((name) => BY_API_NAME[name.trim()]).filter(Boolean) as HolidayKey[];
  return Array.from(new Set(keys));
}
