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
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUAS } from '../../lib/db/seed-data';

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
  console.log(`wrote ${Object.keys(duas).length} du'as and ${verses.length} verses to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
