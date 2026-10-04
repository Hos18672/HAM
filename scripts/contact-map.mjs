/**
 * The contact page's map, rendered once from OpenStreetMap's tiles.
 *
 * The page shows this picture rather than live tiles, so a visitor's browser
 * asks nothing of OpenStreetMap until they choose to load the interactive map.
 * Run it again only when the house moves:
 *
 *   node scripts/contact-map.mjs
 *
 * It writes public/map-contact@1x.webp (800×500, zoom 17) and @2x (1600×1000,
 * zoom 18): the same ground, the second at twice the detail. No pin is drawn
 * in; the page lays its own over the centre. The attribution is printed in the
 * page's caption under the picture, as the tile policy asks.
 *
 * The workflow in .github/workflows/contact-map.yml runs it, since a sandbox
 * without access to the tile server cannot.
 */
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// sharp comes with Next, so it is resolved through Next rather than added.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');

const CENTRE = { latitude: 48.2175, longitude: 16.326 };
const TILE = 256;
const AGENT = 'HausAllerMenschen-site-build/1.0 (+https://github.com/hos18672/HAM)';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');

/** Web-Mercator pixel position at a zoom level. */
function project({ latitude, longitude }, zoom) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

async function render(zoom, width, height, file) {
  const centre = project(CENTRE, zoom);
  const left = centre.x - width / 2;
  const top = centre.y - height / 2;
  const tiles = [];
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width - 1) / TILE); tx += 1) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height - 1) / TILE); ty += 1) {
      tiles.push({ tx, ty });
    }
  }

  const layers = [];
  // One at a time: the tile policy asks for no parallel bulk fetching.
  for (const { tx, ty } of tiles) {
    const url = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
    const response = await fetch(url, { headers: { 'User-Agent': AGENT } });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    layers.push({
      input: Buffer.from(await response.arrayBuffer()),
      left: Math.round(tx * TILE - left),
      top: Math.round(ty * TILE - top),
    });
  }

  // Tiles at the edge hang over the canvas; compose on a larger one and crop.
  const pad = TILE;
  const image = await sharp({
    create: {
      width: width + 2 * pad,
      height: height + 2 * pad,
      channels: 3,
      background: '#f2efe9',
    },
  })
    .composite(layers.map((l) => ({ ...l, left: l.left + pad, top: l.top + pad })))
    .png()
    .toBuffer();
  const webp = await sharp(image)
    .extract({ left: pad, top: pad, width, height })
    .webp({ quality: 78 })
    .toBuffer();
  await writeFile(path.join(OUT, file), webp);
  console.log(`${file}: ${tiles.length} tiles, ${(webp.length / 1024).toFixed(0)} KB`);
}

await render(17, 800, 500, 'map-contact@1x.webp');
await render(18, 1600, 1000, 'map-contact@2x.webp');
