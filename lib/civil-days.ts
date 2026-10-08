import { toHijri } from './hijri';
import { toPersianDate } from './persian-date';

/**
 * The civil days of the two countries this house lives between: Austria,
 * where it stands, and Iran, whose calendar its members count their own year
 * in.
 *
 * Two kinds of day. A *holiday* is a day off by law — shops and offices shut
 * in Vienna, or the whole of Iran is closed — and the calendar marks it as a
 * free day. An *event* is a day worth knowing about that is not one: Yalda,
 * Christmas Eve, the night the clocks change.
 *
 * All of it is arithmetic, like everything else in the calendar, so it runs
 * the same on the server, in the browser and on the static preview:
 *
 * - Austria's fixed days are Gregorian dates, and its moving ones hang off
 *   Easter Sunday, worked out with the Gregorian computus below.
 * - Iran's national days are Solar Hijri dates, read with `lib/persian-date`.
 * - Iran's religious holidays are lunar Hijri dates in the Iranian reckoning,
 *   read with `lib/hijri` — the same one the grid shows. Most of them are
 *   already in the editors' occasions under their own names, so here they
 *   only carry the fact that the day is off in Iran; the two the occasions
 *   have no entry for (the second day of Eid al-Fitr, the last day of Safar)
 *   are named.
 *
 * The names stay in the message catalogue (`prayer.civil`), as the Hijri
 * holidays' do.
 */

export type Country = 'at' | 'ir';

export interface CivilDay {
  /** The key under `prayer.civil` — absent for a day that is only flagged. */
  key?: CivilKey;
  country: Country;
  /** A day off by law, rather than a day to know about. */
  off: boolean;
}

export const CIVIL_KEYS = [
  // Austria — public holidays (Feiertagsruhegesetz, Arbeitsruhegesetz).
  'atNewYear',
  'atEpiphany',
  'atEasterSunday',
  'atEasterMonday',
  'atLabourDay',
  'atAscension',
  'atWhitSunday',
  'atWhitMonday',
  'atCorpusChristi',
  'atAssumption',
  'atNationalDay',
  'atAllSaints',
  'atImmaculate',
  'atChristmas',
  'atStStephen',
  // Austria — days to know about.
  'atGoodFriday',
  'atChristmasEve',
  'atNewYearsEve',
  'atSummerTime',
  'atWinterTime',
  // Iran — public holidays on the Solar Hijri calendar.
  'irNowruz',
  'irNowruzHoliday',
  'irRepublicDay',
  'irNatureDay',
  'irKhomeini',
  'irKhordad15',
  'irRevolution',
  'irOilDay',
  // Iran — public holidays on the lunar calendar the occasions do not name.
  'irEidFitr2',
  'irSafarEnd',
  // Iran — days to know about.
  'irChaharshanbeSuri',
  'irSaadi',
  'irFerdowsi',
  'irRumi',
  'irHafez',
  'irYalda',
] as const;
export type CivilKey = (typeof CIVIL_KEYS)[number];

const DAY_MS = 86_400_000;

/** Noon UTC on a Gregorian date, which no timezone can move off its day. */
function noon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Easter Sunday in the Gregorian calendar — the anonymous Gregorian
 * algorithm (Meeus/Jones/Butcher), exact for every year.
 */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** The last Sunday of a month: where Europe's clocks change. */
function lastSunday(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month, 0, 12));
  return last.getUTCDate() - last.getUTCDay();
}

const AT_FIXED: Record<string, { key: CivilKey; off: boolean }> = {
  '1-1': { key: 'atNewYear', off: true },
  '1-6': { key: 'atEpiphany', off: true },
  '5-1': { key: 'atLabourDay', off: true },
  '8-15': { key: 'atAssumption', off: true },
  '10-26': { key: 'atNationalDay', off: true },
  '11-1': { key: 'atAllSaints', off: true },
  '12-8': { key: 'atImmaculate', off: true },
  '12-24': { key: 'atChristmasEve', off: false },
  '12-25': { key: 'atChristmas', off: true },
  '12-26': { key: 'atStStephen', off: true },
  '12-31': { key: 'atNewYearsEve', off: false },
};

/** Days counted from Easter Sunday. Good Friday has not been a day off for
 *  anyone since 2019, so it is only an event. */
const AT_EASTER: { offset: number; key: CivilKey; off: boolean }[] = [
  { offset: -2, key: 'atGoodFriday', off: false },
  { offset: 0, key: 'atEasterSunday', off: true },
  { offset: 1, key: 'atEasterMonday', off: true },
  { offset: 39, key: 'atAscension', off: true },
  { offset: 49, key: 'atWhitSunday', off: true },
  { offset: 50, key: 'atWhitMonday', off: true },
  { offset: 60, key: 'atCorpusChristi', off: true },
];

/** Solar Hijri month-day. */
const IR_SOLAR: Record<string, { key: CivilKey; off: boolean }> = {
  '1-1': { key: 'irNowruz', off: true },
  '1-2': { key: 'irNowruzHoliday', off: true },
  '1-3': { key: 'irNowruzHoliday', off: true },
  '1-4': { key: 'irNowruzHoliday', off: true },
  '1-12': { key: 'irRepublicDay', off: true },
  '1-13': { key: 'irNatureDay', off: true },
  '2-1': { key: 'irSaadi', off: false },
  '2-25': { key: 'irFerdowsi', off: false },
  '3-14': { key: 'irKhomeini', off: true },
  '3-15': { key: 'irKhordad15', off: true },
  '7-8': { key: 'irRumi', off: false },
  '7-20': { key: 'irHafez', off: false },
  '9-30': { key: 'irYalda', off: false },
  '11-22': { key: 'irRevolution', off: true },
  '12-29': { key: 'irOilDay', off: true },
};

/**
 * Lunar Hijri month-day of Iran's religious public holidays. The occasions
 * already name these, so they are flags only.
 */
const IR_LUNAR_OFF = new Set([
  '1-9', // Tasua
  '1-10', // Ashura
  '2-20', // Arbaeen
  '2-28', // The Prophet's passing, Imam Hasan's martyrdom
  '3-8', // Imam Hasan al-Askari's martyrdom
  '3-17', // The Prophet's birth
  '6-3', // Fatima's martyrdom
  '7-13', // Imam Ali's birth
  '7-27', // The Mabath
  '8-15', // Imam Mahdi's birth
  '9-21', // Imam Ali's martyrdom
  '10-1', // Eid al-Fitr
  '10-25', // Imam Sadiq's martyrdom
  '12-10', // Eid al-Adha
  '12-18', // Eid al-Ghadir
]);

/** Everything Austria and Iran have on one Gregorian day. */
export function civilDaysOn(year: number, month: number, day: number): CivilDay[] {
  const out: CivilDay[] = [];
  const date = noon(year, month, day);

  // Austria.
  const fixed = AT_FIXED[`${month}-${day}`];
  if (fixed) out.push({ ...fixed, country: 'at' });
  const easter = easterSunday(year);
  const fromEaster = Math.round(
    (date.getTime() - noon(year, easter.month, easter.day).getTime()) / DAY_MS,
  );
  for (const rule of AT_EASTER) {
    if (rule.offset === fromEaster) out.push({ key: rule.key, off: rule.off, country: 'at' });
  }
  if ((month === 3 || month === 10) && day === lastSunday(year, month)) {
    out.push({ key: month === 3 ? 'atSummerTime' : 'atWinterTime', off: false, country: 'at' });
  }

  // Iran, by the sun.
  const persian = toPersianDate(date);
  const solar = IR_SOLAR[`${persian.month}-${persian.day}`];
  if (solar) out.push({ ...solar, country: 'ir' });
  // Chaharshanbe Suri: the eve of the year's last Wednesday — a Tuesday
  // whose Wednesday is still in Esfand and the Wednesday after it is not.
  if (persian.month === 12 && date.getUTCDay() === 2) {
    const wednesday = toPersianDate(new Date(date.getTime() + DAY_MS));
    const next = toPersianDate(new Date(date.getTime() + 8 * DAY_MS));
    if (wednesday.month === 12 && next.month === 1) {
      out.push({ key: 'irChaharshanbeSuri', off: false, country: 'ir' });
    }
  }

  // Iran, by the moon.
  const hijri = toHijri(date);
  if (IR_LUNAR_OFF.has(`${hijri.month}-${hijri.day}`)) {
    out.push({ off: true, country: 'ir' });
  } else if (hijri.month === 10 && hijri.day === 2) {
    out.push({ key: 'irEidFitr2', off: true, country: 'ir' });
  } else if (hijri.month === 2 && toHijri(new Date(date.getTime() + DAY_MS)).month !== 2) {
    // Imam Reza's martyrdom, kept in Iran on the last day of Safar, whether
    // that is the 29th or the 30th.
    out.push({ key: 'irSafarEnd', off: true, country: 'ir' });
  }

  return out;
}
