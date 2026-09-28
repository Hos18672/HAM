import { VIENNA } from './prayer-times';

/**
 * The cities the prayer page offers.
 *
 * Not a gazetteer: the places this house's community actually asks about —
 * where they live in Austria and its neighbours, where they come from, and
 * the cities of the shrines. Anywhere else is still reachable through "use my
 * location", which needs no list at all.
 *
 * Coordinates are the city centre to four decimals, which is a few metres —
 * far finer than prayer times need, since a kilometre of longitude moves
 * sunrise by about four seconds. The time zone is the IANA name, because the
 * calculation needs the real offset for the day in question and half of these
 * places change it twice a year on dates that do not agree.
 *
 * `group` is the heading a reader sees above the city in the list; both names
 * are here rather than in the message catalogue because a city's name is data
 * about the city, and a translator should see the pair together.
 */
export interface City {
  id: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  group: 'at' | 'de' | 'ch' | 'ir' | 'af' | 'iq' | 'sa' | 'eu';
  de: string;
  fa: string;
}

export const CITIES: City[] = [
  // Austria — the house's own country, Vienna first because it is home.
  {
    id: 'vienna',
    latitude: VIENNA.latitude,
    longitude: VIENNA.longitude,
    timeZone: VIENNA.timeZone,
    group: 'at',
    de: 'Wien',
    fa: 'وین',
  },
  {
    id: 'graz',
    latitude: 47.0707,
    longitude: 15.4395,
    timeZone: 'Europe/Vienna',
    group: 'at',
    de: 'Graz',
    fa: 'گراتس',
  },
  {
    id: 'linz',
    latitude: 48.3069,
    longitude: 14.2858,
    timeZone: 'Europe/Vienna',
    group: 'at',
    de: 'Linz',
    fa: 'لینتس',
  },
  {
    id: 'salzburg',
    latitude: 47.8095,
    longitude: 13.055,
    timeZone: 'Europe/Vienna',
    group: 'at',
    de: 'Salzburg',
    fa: 'زالتسبورگ',
  },
  {
    id: 'innsbruck',
    latitude: 47.2692,
    longitude: 11.4041,
    timeZone: 'Europe/Vienna',
    group: 'at',
    de: 'Innsbruck',
    fa: 'اینسبروک',
  },

  // Germany
  {
    id: 'berlin',
    latitude: 52.52,
    longitude: 13.405,
    timeZone: 'Europe/Berlin',
    group: 'de',
    de: 'Berlin',
    fa: 'برلین',
  },
  {
    id: 'hamburg',
    latitude: 53.5511,
    longitude: 9.9937,
    timeZone: 'Europe/Berlin',
    group: 'de',
    de: 'Hamburg',
    fa: 'هامبورگ',
  },
  {
    id: 'munich',
    latitude: 48.1351,
    longitude: 11.582,
    timeZone: 'Europe/Berlin',
    group: 'de',
    de: 'München',
    fa: 'مونیخ',
  },
  {
    id: 'cologne',
    latitude: 50.9375,
    longitude: 6.9603,
    timeZone: 'Europe/Berlin',
    group: 'de',
    de: 'Köln',
    fa: 'کلن',
  },
  {
    id: 'frankfurt',
    latitude: 50.1109,
    longitude: 8.6821,
    timeZone: 'Europe/Berlin',
    group: 'de',
    de: 'Frankfurt am Main',
    fa: 'فرانکفورت',
  },

  // Switzerland
  {
    id: 'zurich',
    latitude: 47.3769,
    longitude: 8.5417,
    timeZone: 'Europe/Zurich',
    group: 'ch',
    de: 'Zürich',
    fa: 'زوریخ',
  },

  // Iran
  {
    id: 'tehran',
    latitude: 35.6892,
    longitude: 51.389,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Teheran',
    fa: 'تهران',
  },
  {
    id: 'qom',
    latitude: 34.6416,
    longitude: 50.8746,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Ghom',
    fa: 'قم',
  },
  {
    id: 'mashhad',
    latitude: 36.2605,
    longitude: 59.6168,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Maschhad',
    fa: 'مشهد',
  },
  {
    id: 'isfahan',
    latitude: 32.6546,
    longitude: 51.668,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Isfahan',
    fa: 'اصفهان',
  },
  {
    id: 'shiraz',
    latitude: 29.5918,
    longitude: 52.5837,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Schiras',
    fa: 'شیراز',
  },
  {
    id: 'tabriz',
    latitude: 38.08,
    longitude: 46.2919,
    timeZone: 'Asia/Tehran',
    group: 'ir',
    de: 'Täbris',
    fa: 'تبریز',
  },

  // Afghanistan
  {
    id: 'kabul',
    latitude: 34.5553,
    longitude: 69.2075,
    timeZone: 'Asia/Kabul',
    group: 'af',
    de: 'Kabul',
    fa: 'کابل',
  },
  {
    id: 'herat',
    latitude: 34.3529,
    longitude: 62.204,
    timeZone: 'Asia/Kabul',
    group: 'af',
    de: 'Herat',
    fa: 'هرات',
  },
  {
    id: 'mazar',
    latitude: 36.709,
    longitude: 67.1109,
    timeZone: 'Asia/Kabul',
    group: 'af',
    de: 'Mazar-e Sharif',
    fa: 'مزار شریف',
  },

  // Iraq — the shrine cities
  {
    id: 'karbala',
    latitude: 32.616,
    longitude: 44.0249,
    timeZone: 'Asia/Baghdad',
    group: 'iq',
    de: 'Kerbala',
    fa: 'کربلا',
  },
  {
    id: 'najaf',
    latitude: 32.0,
    longitude: 44.335,
    timeZone: 'Asia/Baghdad',
    group: 'iq',
    de: 'Nadschaf',
    fa: 'نجف',
  },

  // Saudi Arabia
  {
    id: 'mecca',
    latitude: 21.3891,
    longitude: 39.8579,
    timeZone: 'Asia/Riyadh',
    group: 'sa',
    de: 'Mekka',
    fa: 'مکه',
  },
  {
    id: 'medina',
    latitude: 24.5247,
    longitude: 39.5692,
    timeZone: 'Asia/Riyadh',
    group: 'sa',
    de: 'Medina',
    fa: 'مدینه',
  },

  // Elsewhere in Europe
  {
    id: 'istanbul',
    latitude: 41.0082,
    longitude: 28.9784,
    timeZone: 'Europe/Istanbul',
    group: 'eu',
    de: 'Istanbul',
    fa: 'استانبول',
  },
  {
    id: 'london',
    latitude: 51.5074,
    longitude: -0.1278,
    timeZone: 'Europe/London',
    group: 'eu',
    de: 'London',
    fa: 'لندن',
  },
  {
    id: 'paris',
    latitude: 48.8566,
    longitude: 2.3522,
    timeZone: 'Europe/Paris',
    group: 'eu',
    de: 'Paris',
    fa: 'پاریس',
  },
  {
    id: 'amsterdam',
    latitude: 52.3676,
    longitude: 4.9041,
    timeZone: 'Europe/Amsterdam',
    group: 'eu',
    de: 'Amsterdam',
    fa: 'آمستردام',
  },
  {
    id: 'brussels',
    latitude: 50.8503,
    longitude: 4.3517,
    timeZone: 'Europe/Brussels',
    group: 'eu',
    de: 'Brüssel',
    fa: 'بروکسل',
  },
  {
    id: 'stockholm',
    latitude: 59.3293,
    longitude: 18.0686,
    timeZone: 'Europe/Stockholm',
    group: 'eu',
    de: 'Stockholm',
    fa: 'استکهلم',
  },
];

/** The order the groups are shown in, home first. */
export const CITY_GROUPS = ['at', 'de', 'ch', 'ir', 'af', 'iq', 'sa', 'eu'] as const;

export const DEFAULT_CITY_ID = 'vienna';

export function findCity(id: string | null | undefined): City | undefined {
  return id ? CITIES.find((city) => city.id === id) : undefined;
}

/** The city's name in the reader's language. */
export function cityName(city: City, locale: 'de' | 'fa'): string {
  return locale === 'fa' ? city.fa : city.de;
}
