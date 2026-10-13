/**
 * Writes the texts the Android widgets ship with, so they work offline.
 * Run from the repository root before building the app:
 *
 *   npx tsx android/scripts/export-content.ts
 *
 *   assets/duas.json    the site's du'a catalogue (title, Arabic title, when to read)
 *   assets/verses.json  the verses of the "verse of the day", in the same three
 *                       editions as the site's reader (lib/quran.ts), fetched
 *                       once here from the Al Quran Cloud API
 *   assets/calendar.json the calendar widget's feed as the site serves it now
 *                       (SITE_URL, `/widget-data/calendar.json`), for a widget
 *                       placed before the phone has been online. Best effort:
 *                       the widget fetches the feed itself anyway.
 *   assets/dua-texts.json every du'a's full text (Arabic, Persian, German), for
 *                       the app's reader, offline
 *   assets/quran-ar.json, quran-fa.json, quran-de.json
 *                       the whole Quran for the app's mushaf: the Uthmani text
 *                       with each verse's surah, number, page, juz, quarter
 *                       hizb and prostration, and the two translations in the
 *                       same order
 *   assets/cities.json  the prayer page's cities
 *   assets/app-data-fa.json, app-data-de.json
 *                       the app's content feed (`/app-data/{locale}.json`) as
 *                       the site serves it now. Best effort: the app fetches
 *                       it itself anyway.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUAS } from '../../lib/db/seed-data';
import { DUA_TEXT_SLUGS, duaText } from '../../lib/dua-texts';
import { CITIES } from '../../lib/cities';
import { BASMALA } from '../../lib/quran-constants';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'src', 'main', 'assets');

/** The reader's editions (`lib/quran.ts`, which is server-only and cannot be imported here). */
const TRANSLATION = { fa: 'fa.makarem', de: 'de.bubenheim' };

/**
 * Short verses that stand on their own — of comfort, of remembrance, of
 * supplication — and none the first verse of its surah, where the API puts the
 * Basmala in front of the text.
 */
// prettier-ignore
const VERSES = [
  '2:45', '2:152', '2:153', '2:155', '2:156', '2:186', '2:201', '2:216',
  '3:8', '3:103', '3:139', '3:173', '3:200', '5:55', '6:162', '7:23',
  '7:56', '7:199', '9:51', '11:115', '12:87', '13:28', '14:7', '16:128',
  '17:24', '17:80', '17:82', '18:10', '20:25', '20:114', '21:87', '21:107',
  '23:118', '25:63', '25:74', '28:24', '29:69', '31:17', '33:41', '33:56',
  '35:15', '39:53', '40:44', '40:60', '47:7', '49:10', '49:13', '50:16',
  '51:56', '55:13', '55:60', '59:18', '65:3', '76:8', '76:9', '93:5',
  '94:5', '94:6', '99:7', '103:2',
];

async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
    }
  }
}

type Edition = {
  text: string;
  numberInSurah: number;
  surah: { number: number; name: string; englishName: string };
};

async function main() {
  await mkdir(OUT, { recursive: true });

  const duas = Object.fromEntries(
    DUAS.map((d) => [
      d.slug,
      {
        ar: d.arabicTitle,
        fa: { title: d.fa.title, when: d.fa.whenToRead },
        de: { title: d.de.title, when: d.de.whenToRead },
      },
    ]),
  );
  await writeFile(join(OUT, 'duas.json'), JSON.stringify(duas));

  const editions = ['quran-uthmani', TRANSLATION.fa, TRANSLATION.de].join(',');
  const verses = [];
  for (const ref of VERSES) {
    const body = (await fetchJson(
      `https://api.alquran.cloud/v1/ayah/${ref}/editions/${editions}`,
    )) as { data: Edition[] };
    const [ar, fa, de] = body.data;
    if (!ar || !fa || !de) throw new Error(`${ref}: missing an edition`);
    verses.push({
      s: ar.surah.number,
      n: ar.numberInSurah,
      surahAr: ar.surah.name,
      surahName: ar.surah.englishName,
      ar: ar.text,
      fa: fa.text,
      de: de.text,
    });
  }
  await writeFile(join(OUT, 'verses.json'), JSON.stringify(verses));
  const site = (process.env.SITE_URL ?? 'https://hos18672.github.io/HAM').replace(/\/+$/, '');
  try {
    const feed = await fetchJson(`${site}/widget-data/calendar.json`);
    await writeFile(join(OUT, 'calendar.json'), JSON.stringify(feed));
  } catch (error) {
    console.warn(`no calendar feed from ${site} (${String(error)}); the widget will fetch it`);
  }
  const texts = Object.fromEntries(
    DUA_TEXT_SLUGS.map((slug) => {
      const text = duaText(slug)!;
      return [slug, { origin: text.origin, lines: text.lines }];
    }),
  );
  await writeFile(join(OUT, 'dua-texts.json'), JSON.stringify(texts));

  await writeQuran();

  await writeFile(
    join(OUT, 'cities.json'),
    JSON.stringify(
      CITIES.map((c) => ({
        id: c.id,
        lat: c.latitude,
        lng: c.longitude,
        tz: c.timeZone,
        group: c.group,
        de: c.de,
        fa: c.fa,
      })),
    ),
  );

  for (const locale of ['fa', 'de']) {
    try {
      const feed = await fetchJson(`${site}/app-data/${locale}.json`);
      await writeFile(join(OUT, `app-data-${locale}.json`), JSON.stringify(feed));
    } catch (error) {
      console.warn(
        `no app feed (${locale}) from ${site} (${String(error)}); the app will fetch it`,
      );
    }
  }

  console.log(`wrote ${Object.keys(duas).length} du'as and ${verses.length} verses to ${OUT}`);
}

type FullAyah = {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  hizbQuarter: number;
  sajda: unknown;
};
type FullSurah = {
  number: number;
  name: string;
  englishName: string;
  revelationType: string;
  ayahs: FullAyah[];
};

/** The marks a Basmala's spelling varies in between surahs; compared without them. */
const bare = (word: string) =>
  word.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/\u0671/g, '\u0627');
const BASMALA_BARE = BASMALA.split(' ').map(bare).join(' ');

/** The Basmala folded into verse one of a surah, taken off as the site's reader does. */
function withoutBasmala(text: string): string {
  const words = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\s+/);
  return words.slice(0, 4).map(bare).join(' ') === BASMALA_BARE
    ? words.slice(4).join(' ')
    : words.join(' ');
}

async function writeQuran() {
  const edition = async (name: string) =>
    (
      (await fetchJson(`https://api.alquran.cloud/v1/quran/${name}`)) as {
        data: { surahs: FullSurah[] };
      }
    ).data.surahs;
  const [ar, fa, de] = [
    await edition('quran-uthmani'),
    await edition(TRANSLATION.fa),
    await edition(TRANSLATION.de),
  ];
  if (ar.length !== 114 || fa.length !== 114 || de.length !== 114) {
    throw new Error('the Quran editions do not have 114 surahs');
  }
  const surahs = ar.map((s) => [
    s.name,
    s.englishName,
    s.revelationType === 'Medinan' ? 1 : 0,
    s.ayahs.length,
  ]);
  // One row per verse: [surah, verse, page, juz, quarter hizb, prostration, text].
  const ayahs = ar.flatMap((s) =>
    s.ayahs.map((a, i) => [
      s.number,
      a.numberInSurah,
      a.page,
      a.juz,
      a.hizbQuarter,
      a.sajda ? 1 : 0,
      i === 0 && s.number !== 1 && s.number !== 9
        ? withoutBasmala(a.text)
        : a.text.replace(/^\uFEFF/, ''),
    ]),
  );
  if (ayahs.length !== 6236) throw new Error(`the Quran has ${ayahs.length} verses, not 6236`);
  await writeFile(join(OUT, 'quran-ar.json'), JSON.stringify({ basmala: BASMALA, surahs, ayahs }));
  for (const [name, surahsOf] of [
    ['fa', fa],
    ['de', de],
  ] as const) {
    const lines = surahsOf.flatMap((s) => s.ayahs.map((a) => a.text));
    if (lines.length !== 6236) throw new Error(`${name}: ${lines.length} verses`);
    await writeFile(join(OUT, `quran-${name}.json`), JSON.stringify(lines));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
