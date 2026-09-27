/**
 * The two ends of the city.
 *
 * The traced artwork stops at its own frame: on the left the hill line breaks
 * off in the air, on the right the bridge ramp ends in a point above the
 * ground. Drawn large that is barely noticed; in a low footer both read as
 * the picture being cut. These strokes and trees are drawn just outside that
 * frame so each side comes to rest on the ground instead — the hill runs down
 * behind a thinning row of trees, the ramp lands on a pier and a last group
 * of trees closes the right.
 *
 * Coordinates are those of BASE_SVG's viewBox (3 × world units, y down), with
 * the ground line's centre at y = 1236.
 */

/** How far the artwork is widened on each side, in world units. */
export const PAD = 180;

const BASE = 1232; // where a trunk meets the ground line

// A cypress: the pointed teardrop most of the artwork's trees are.
function cypress(cx, w, h) {
  const bot = BASE - h * 0.13;
  const top = BASE - h;
  const r = w / 2;
  return `M ${cx} ${top} C ${cx + r * 0.6} ${top + h * 0.2}, ${cx + r * 1.1} ${bot - h * 0.38}, ${cx + r} ${bot - r * 0.6}`
    + ` C ${cx + r * 0.9} ${bot + 2}, ${cx - r * 0.9} ${bot + 2}, ${cx - r} ${bot - r * 0.6}`
    + ` C ${cx - r * 1.1} ${bot - h * 0.38}, ${cx - r * 0.6} ${top + h * 0.2}, ${cx} ${top} Z`
    + trunk(cx, bot, w);
}

// A broadleaf: the rounder tree the artwork uses between the cypresses.
function broadleaf(cx, w, h) {
  const bot = BASE - h * 0.15;
  const top = BASE - h;
  const r = w / 2;
  const mid = top + (bot - top) * 0.45;
  return `M ${cx} ${top} C ${cx + r * 0.55} ${top}, ${cx + r * 0.8} ${top + (mid - top) * 0.5}, ${cx + r * 0.78} ${mid}`
    + ` C ${cx + r * 1.08} ${mid + (bot - mid) * 0.2}, ${cx + r * 1.08} ${bot - r * 0.15}, ${cx + r * 0.55} ${bot}`
    + ` L ${cx - r * 0.55} ${bot}`
    + ` C ${cx - r * 1.08} ${bot - r * 0.15}, ${cx - r * 1.08} ${mid + (bot - mid) * 0.2}, ${cx - r * 0.78} ${mid}`
    + ` C ${cx - r * 0.8} ${top + (mid - top) * 0.5}, ${cx - r * 0.55} ${top}, ${cx} ${top} Z`
    + trunk(cx, bot, w);
}

function trunk(cx, bot, w) {
  const t = Math.max(6, w * 0.1);
  return ` M ${cx - t / 2} ${bot - 4} L ${cx + t / 2} ${bot - 4} L ${cx + t / 2} ${BASE + 2} L ${cx - t / 2} ${BASE + 2} Z`;
}

const LEFT_TREES = [
  broadleaf(2, 92, 150),
  cypress(-88, 58, 170),
  broadleaf(-170, 74, 104),
  cypress(-240, 42, 112),
  broadleaf(-305, 52, 66),
  broadleaf(-372, 40, 46),
];

const RIGHT_TREES = [
  cypress(6884, 56, 168),
  broadleaf(6962, 80, 120),
  broadleaf(7026, 42, 58),
];

// The ramp's deck, carried on from its point and brought down to the ground:
// two edges like the rest of the bridge, with the same faint fill between.
const DECK_TOP = 'M 6440 1052 C 6620 1050, 6740 1110, 6830 1232';
const DECK_BOTTOM = 'M 6440 1074 C 6600 1074, 6700 1130, 6790 1232';
const DECK_FILL = 'M 6440 1052 C 6620 1050, 6740 1110, 6830 1232 L 6790 1232 C 6700 1130, 6600 1074, 6440 1074 Z';

const STROKES = [
  // the ground, run out to the new edges
  'M 60 1236 L -520 1236',
  'M 6460 1236 L 7036 1236',
  // the hill comes down behind the trees, easing out onto the ground
  'M 52 998 C -80 1032, -200 1110, -300 1170 C -360 1206, -420 1226, -480 1232',
];

// Opacities follow the traced artwork: its lines are drawn at 0.92 and the
// shading inside the buildings at 0.07.
export const ENDS_SVG =
  `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-opacity="0.92">`
  + STROKES.map((d) => `<path stroke-width="12" d="${d}"/>`).join('')
  + `<path stroke-width="10" d="${DECK_TOP}"/><path stroke-width="10" d="${DECK_BOTTOM}"/>`
  // the pier: a pair of posts, like the ramp's other supports
  + `<path stroke-width="9" d="M 6550 1088 L 6550 1234 M 6574 1094 L 6574 1234"/>`
  + `</g>`
  + `<path fill="currentColor" fill-opacity="0.07" d="${DECK_FILL}"/>`
  + `<path fill="currentColor" fill-opacity="0.92" d="${[...LEFT_TREES, ...RIGHT_TREES].join(' ')}"/>`;
