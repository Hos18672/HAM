/**
 * Where the house is, looked up from its address rather than typed in.
 *
 * The coordinates in lib/house-location.json drive every map on the site —
 * the picture on the contact and home pages, the Google Maps links, the
 * qibla page's starting point. They used to be a hand-entered guess, and the
 * pin sat in the wrong street. This asks OpenStreetMap's geocoder
 * (Nominatim) for each number of the building, 34 to 38, and keeps the
 * middle of what it finds. Run it again only if the house moves:
 *
 *   node scripts/geocode-house.mjs
 *
 * The workflow in .github/workflows/contact-map.yml runs it, since a sandbox
 * without access to the geocoder cannot. One request a second, as
 * Nominatim's usage policy asks.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const AGENT = 'HausAllerMenschen-site-build/1.0 (+https://github.com/hos18672/HAM)';
const STREET = 'Sautergasse';
const NUMBERS = ['34', '36', '38'];
const POSTCODE = '1170';
const OUT = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'lib',
  'house-location.json',
);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function lookup(number) {
  const params = new URLSearchParams({
    street: `${number} ${STREET}`,
    postalcode: POSTCODE,
    city: 'Wien',
    country: 'Austria',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '3',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': AGENT, 'Accept-Language': 'de' },
  });
  if (!response.ok) throw new Error(`Nominatim ${number}: ${response.status}`);
  const hits = await response.json();
  for (const hit of hits) console.log(`${number}: ${hit.lat}, ${hit.lon} — ${hit.display_name}`);
  // Only an exact house number on the right street counts: a hit for the
  // street as a whole is the street's middle, which is the guess again.
  return (
    hits.find(
      (hit) =>
        hit.address?.road === STREET && hit.address?.house_number?.split(/[-–;,]/).includes(number),
    ) ?? hits.find((hit) => hit.address?.road === STREET && hit.address?.house_number)
  );
}

const found = [];
for (const number of NUMBERS) {
  const hit = await lookup(number);
  if (hit) found.push({ number, latitude: Number(hit.lat), longitude: Number(hit.lon) });
  await pause(1100);
}
if (found.length === 0) throw new Error('Nominatim found none of the house numbers.');

const mean = (key) => found.reduce((sum, f) => sum + f[key], 0) / found.length;
const location = {
  latitude: Number(mean('latitude').toFixed(6)),
  longitude: Number(mean('longitude').toFixed(6)),
  source: `Nominatim (OpenStreetMap), ${STREET} ${found.map((f) => f.number).join('/')}, ${POSTCODE} Wien`,
};
await writeFile(OUT, `${JSON.stringify(location, null, 2)}\n`);
console.log('house-location.json:', location);
