/**
 * The outline of the footer's Vienna skyline, as boxes the page birds keep out of.
 *
 * The skyline is drawn from a vector artwork into a WebGL canvas, so there is
 * nothing in the DOM with the city's shape. This reads the shape from the
 * same artwork instead: it is drawn once, small, into a 2D canvas, and for
 * each narrow column the highest solid pixel is its roof line. The faint haze
 * layer of the drawing is ignored; the outlines and fills are not.
 *
 * The numbers below are the stage `lib/vienna-skyline/vienna-skyline.js`
 * lays the art out on (world units = art pixels, y up): the art is 2172 wide,
 * the city 416 high above 74 of river, with 70 of sky above the tallest
 * spire, and the ground line at 78. The stage keeps the whole height visible
 * and centres the art horizontally, cropping or extending the sides — the
 * mapping in `skylineBoxes` follows that exactly.
 */

const ART_W = 2172;
const CITY_H = 416;
const SKY = 70;
const STAGE_H = CITY_H + 74 + SKY;
const GROUND_Y = 78;

/** Columns across the art; each is one box, about 23 art pixels wide. */
const COLUMNS = 96;
/** The raster is a quarter of the art's size: enough for a roof line. */
const SCALE = 0.25;

/** For each column, how far below the top of the art its roof starts (art px). */
export type Silhouette = Float32Array;

export async function loadSilhouette(): Promise<Silhouette | null> {
  const { BASE_SVG } = await import('@/lib/vienna-skyline/vienna-skyline-art.js');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BASE_SVG);
  await img.decode();

  const w = Math.round(ART_W * SCALE);
  const h = Math.round(CITY_H * SCALE);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // no roof in a column: the ground line is the top
  const ground = CITY_H - (GROUND_Y - 74);
  const tops = new Float32Array(COLUMNS).fill(ground);
  for (let x = 0; x < w; x++) {
    const col = Math.min(COLUMNS - 1, Math.floor((x / w) * COLUMNS));
    for (let y = 0; y < h; y++) {
      // above the haze (fill-opacity 0.07), i.e. a line or a filled wall
      if (data[(y * w + x) * 4 + 3] > 90) {
        tops[col] = Math.min(tops[col], y / SCALE);
        break;
      }
    }
  }
  return tops;
}

/** The silhouette as client-pixel boxes, [left, top, right, bottom, upOnly]. */
export function skylineBoxes(
  host: Element,
  tops: Silhouette,
): Array<[number, number, number, number, number]> {
  const r = host.getBoundingClientRect();
  if (r.height < 1 || r.bottom < 0 || r.top > window.innerHeight) return [];
  const s = r.height / STAGE_H;
  const viewLeft = ART_W / 2 - r.width / s / 2;
  const boxes: Array<[number, number, number, number, number]> = [];

  // the ground and the river, wall to wall (the stage extends them on wide screens)
  boxes.push([r.left, r.top + (STAGE_H - GROUND_Y) * s, r.right, r.bottom, 1]);

  const cw = ART_W / COLUMNS;
  for (let i = 0; i < COLUMNS; i++) {
    const left = r.left + (i * cw - viewLeft) * s;
    const right = left + cw * s;
    if (right < r.left || left > r.right) continue;
    boxes.push([left, r.top + (SKY + tops[i]) * s, right, r.bottom, 1]);
  }
  return boxes;
}
