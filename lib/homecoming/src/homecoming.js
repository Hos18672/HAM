// Homecoming — loader and hero in one scene, made for the Haus aller Menschen site.
//
// The canvas is transparent: the site's own hero band (green with the gold girih pattern)
// is the background. While the page loads, the sky above the band is empty except for birds:
// distant groups wander across it, and groups of birds — loose, irregular flocks —
// fly in from the edges, one group after another. Near the logo's place each bird leaves its
// group, glides down to its own spot and lands, and where it lands that piece of the logo
// appears. So the birds build the logo, right to left, as the page loads. At 100 % a light
// passes over the finished logo, which glides into its place in the hero layout while the
// wandering groups open into a ring around it and the site's header and hero text fade in.
// After that it is the hero: the pointer is a hawk, a click startles the birds, a few birds
// lift off the ring now and then, and scrolling away sends the flock off.
import * as THREE from 'three';
import { prefersReducedMotion } from './logo-shapes.js';
import { createLoaderClock, easeInOutCubic } from './loader-clock.js';
import { createLogoTexture, createSettleField, createSharpLogo, logoHomes, rgb, smoothstep, scatterVectors, EXT } from './readable-core.js';

// colours for the site's hero band (dark green in both site themes)
export const HOMECOMING_THEMES = {
  light: { text: '#FBF6EA', text2: '#EEE1C1', gold: '#D0AE63', light: '#FFF7E0', shade: '#02190f', halo: '#C8A45D', bird: '#F3E8C9', birdFar: '#B5C4AE', ghost: 0.22 },
  dark: { text: '#FBF6EA', text2: '#EFE6D2', gold: '#DCBB7B', light: '#FFF7E0', shade: '#000000', halo: '#DCBB7B', bird: '#EDE1BE', birdFar: '#98AB9B', ghost: 0.2 },
};
const KEYS = ['text', 'text2', 'gold', 'light', 'shade', 'halo', 'bird', 'birdFar'];

const LOGO = /* glsl */ `
  uniform vec3 uText, uText2, uGold, uLight, uShade, uHalo;
  uniform float uGhostA, uGlint;
  void main() {
    vec4 L = texture2D(uLogo, vUv);
    float cov = clamp(L.r + L.g, 0.0, 1.0);
    float st = settleAt(vUv, 0.7);
    float gs = L.g / max(cov, 1e-3);
    vec3 col = mix(mix(uText2, uText, smoothstep(-0.9, 0.9, vP.y)), uGold, gs);
    float bv = bevel(vUv);
    col += uLight * max(bv, 0.0) * 0.18;
    col = mix(col, uShade, max(-bv, 0.0) * 0.14);
    col += uLight * exp(-pow((vP.x * 0.8 + vP.y * 0.6 - uGlint) * 4.0, 2.0)) * 0.3 * st;
    // a piece that is just appearing glows a little
    col = mix(col, uLight, 4.0 * st * (1.0 - st) * 0.35);
    float a = cov * mix(uGhostA, 1.0, st);
    gl_FragColor = over(col, a, uHalo, L.b * 0.38 * st);
  }
`;

// A bird seen from below: body, fanned tail and two angled wings (shoulder → wrist → tip).
// aState.y spreads the wings (0 = folded, perched), the flap phase lifts and lowers them.
// CHANGED FOR THIS SITE: the bird's shaders, geometry and flock shapes are exported, so the
// birds that wander over every other page (`../page-sky.js`) are these same birds.
export const birdVertex = /* glsl */ `
  attribute vec4 aBird;      // x, y, heading, flap phase
  attribute vec4 aState;     // alpha, wings spread, scale, distance tone
  attribute float aWing;     // 0 body … 0.5 wrist … 1 wing tip
  uniform float uSize;
  varying float vAlpha;
  varying float vShade;
  varying float vTone;
  void main() {
    float f = sin(aBird.w);
    float ext = aState.y;
    float k = aWing;
    vec2 p = position.xy;
    // folded: wings drawn in along the body
    p.y *= mix(0.16 + 0.1 * (1.0 - k), 1.0, ext);
    p.x -= k * 0.32 * (1.0 - ext);
    // flapping: at the top and bottom of the stroke the wing looks shorter, the tip most
    float fl = f * ext;
    p.y *= 1.0 - (0.2 * k + 0.32 * k * k) * abs(fl);
    p.x += k * 0.14 * fl;
    float c = cos(aBird.z), s = sin(aBird.z);
    p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) * uSize * aState.z;
    vAlpha = aState.x;
    vShade = 0.86 + 0.14 * fl;
    vTone = aState.w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aBird.xy + p, 0.0, 1.0);
  }
`;
export const birdFragment = /* glsl */ `
  uniform vec3 uBird, uBirdFar;
  varying float vAlpha;
  varying float vShade;
  varying float vTone;
  void main() {
    if (vAlpha < 0.01) discard;
    gl_FragColor = vec4(mix(uBird, uBirdFar, vTone) * vShade, vAlpha);
  }
`;

export function birdGeometry() {
  const pos = [];
  const wing = [];
  const tri = (...pts) => {
    for (const [x, y, w] of pts) {
      pos.push(x, y, 0);
      wing.push(w);
    }
  };
  // body and tail
  const N = [0.42, 0, 0];
  const A = [0.1, 0.08, 0];
  const B = [0.1, -0.08, 0];
  const C = [-0.34, 0.05, 0];
  const D = [-0.34, -0.05, 0];
  tri(N, A, B);
  tri(A, C, B);
  tri(B, C, D);
  tri([-0.3, 0.045, 0], [-0.56, 0.12, 0], [-0.56, -0.12, 0]);
  tri([-0.3, 0.045, 0], [-0.56, -0.12, 0], [-0.3, -0.045, 0]);
  // wings
  for (const s of [1, -1]) {
    const sF = [0.1, 0.06 * s, 0];
    const wF = [0.1, 0.5 * s, 0.5];
    const tip = [-0.3, 1.0 * s, 1];
    const wB = [-0.13, 0.48 * s, 0.5];
    const sB = [-0.17, 0.06 * s, 0];
    tri(sF, wF, wB);
    tri(sF, wB, sB);
    tri(wF, tip, wB);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  return g;
}

const gauss = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smoother = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Natural flock shapes, in units of the gap between two birds: x along the flight (0 = front,
 * negative = behind), y across.
 *  - 'v'     : a V with arms of different length (sometimes nearly a J), slightly irregular.
 *              Kept for reference; this site no longer asks for it — see the two
 *              "CHANGED FOR THIS SITE" notes below.
 *  - 'flock' : a loose, irregular flock with a gap between every bird
 */
export function flockShape(n, kind) {
  const pts = [[0, 0]];
  if (kind === 'v') {
    const split = 0.3 + Math.random() * 0.4;
    const left = Math.round((n - 1) * split);
    const ang = ((28 + Math.random() * 12) * Math.PI) / 180;
    const bow = (Math.random() - 0.5) * 0.04;
    let l = 0;
    let r = 0;
    for (let k = 1; k < n; k++) {
      const side = (k % 2 === 0 && l < left) || r >= n - 1 - left ? -1 : 1;
      const rank = side < 0 ? ++l : ++r;
      pts.push([-rank * Math.cos(ang) + gauss() * 0.07, side * (rank * Math.sin(ang) + rank * rank * bow) + gauss() * 0.07]);
    }
  } else {
    // irregular blob, longer along the flight, filled with evenly spaced birds
    let a = Math.sqrt((n * 1.35 * 1.6) / Math.PI);
    const w1 = Math.random() * 6.28;
    const w2 = Math.random() * 6.28;
    const inside = (x, y) => {
      const ph = Math.atan2(y, x);
      const rr = 1 + 0.22 * Math.sin(2 * ph + w1) + 0.14 * Math.sin(3 * ph + w2);
      return (x / a) ** 2 + (y / (a / 1.6)) ** 2 < rr * rr;
    };
    pts.length = 0;
    let tries = 0;
    while (pts.length < n) {
      const x = (Math.random() * 2 - 1) * a * 1.4;
      const y = (Math.random() * 2 - 1) * a;
      if (inside(x, y) && pts.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > 0.8)) {
        pts.push([x, y]);
        tries = 0;
      } else if (++tries > 80) {
        a *= 1.06;
        tries = 0;
      }
    }
  }
  // put the front bird at x = 0
  const front = Math.max(...pts.map((p) => p[0]));
  for (const p of pts) p[0] -= front;
  return pts;
}

/**
 * @param {HTMLElement} host  element covering the hero band (the canvas fills it)
 * @param {object} [options]
 * @param {HTMLElement} [options.anchor]     where the logo sits in the hero (a square box)
 * @param {HTMLElement} [options.eventsEl]   element that receives clicks (default: host)
 * @param {HTMLElement} [options.themeEl]    element carrying the site theme attribute
 * @param {string} [options.themeAttr='data-t']
 * @param {boolean} [options.skipLoader=false]  start directly in the hero (e.g. when navigating back home)
 * @param {(p:number)=>void} [options.onProgress]
 * @param {() => void} [options.onReady]     loading finished, the hand-over starts
 * @param {(err: Error) => void} [options.onError]  something failed while running
 * @param {number} [options.minDuration=4.2]
 * @param {number} [options.ringScale=1.32]  radius of the bird ring around the logo in the hero
 */
export function createHomecoming(hostEl, options = {}) {
  let host = hostEl;
  const reduced = prefersReducedMotion();
  const small = Math.min(innerWidth, innerHeight) < 700;
  const opts = { minDuration: reduced ? 0.6 : 4.2, themeAttr: 'data-t', ringScale: 1.32, ...options };
  const themes = {
    light: { ...HOMECOMING_THEMES.light, ...(options.themes?.light || {}) },
    dark: { ...HOMECOMING_THEMES.dark, ...(options.themes?.dark || {}) },
  };
  let eventsEl = opts.eventsEl || host;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  // report problems instead of failing silently (shown in the hero by the page script)
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const log = [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program)].filter(Boolean).join(' ');
    opts.onError?.(new Error('shader: ' + log.slice(0, 300)));
  };
  renderer.domElement.addEventListener('webglcontextlost', () => opts.onError?.(new Error('WebGL context lost')));
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

  // ---------- theme (follows the site's data-t attribute; colours glide) ----------
  const readMode = () => (opts.themeEl?.getAttribute(opts.themeAttr) === 'dark' ? 'dark' : 'light');
  let mode = readMode();
  const cur = {};
  const target = {};
  for (const k of KEYS) {
    cur[k] = rgb(themes[mode][k]);
    target[k] = cur[k].clone();
  }
  let ghostTarget = themes[mode].ghost;
  // no imprint of the logo while it is being built: it only exists where birds have landed
  const ghost = { value: opts.skipLoader ? ghostTarget : 0 };
  function applyMode(next) {
    mode = next;
    for (const k of KEYS) target[k].copy(rgb(themes[mode][k]));
    ghostTarget = themes[mode].ghost;
  }
  let mo = null;
  function watchTheme() {
    mo?.disconnect();
    mo = opts.themeEl ? new MutationObserver(() => applyMode(readMode())) : null;
    mo?.observe(opts.themeEl, { attributes: true, attributeFilter: [opts.themeAttr] });
  }
  watchTheme();

  // ---------- the logo's particles ----------
  // N small birds that make up the logo in the hero (they lift off under the pointer).
  // While loading they are carried in by the larger birds that fly in: each of those lands on
  // a few of these spots at once.
  const N = small ? 950 : 1500;
  const homes = logoHomes(N);
  const hx = homes.x;
  const hy = homes.y;
  const field = createSettleField(hx, hy, 3);

  // arrival groups: split the logo into strips in reading order (right to left) …
  const key = new Float32Array(N);
  for (let i = 0; i < N; i++) key[i] = (1 - (hx[i] + 1.1) / 2.2) * 0.86 + (1 - (hy[i] + 1.1) / 2.2) * 0.1 + Math.random() * 0.04;
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => key[a] - key[b]);
  const B = small ? 9 : 12;
  const PER = small ? 5.2 : 5; // logo spots per arriving bird
  const weights = Array.from({ length: B }, () => 0.7 + Math.random() * 0.6);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const arrivals = [];
  {
    let at = 0;
    let acc = 0;
    for (let g = 0; g < B; g++) {
      acc += weights[g];
      const to = g === B - 1 ? N : Math.round((acc / wSum) * N);
      arrivals.push({ k: g, parts: order.slice(at, to), birds: [], launched: false });
      at = to;
    }
  }
  // … and inside each strip, group the spots into clusters, one per bird (a few rounds of k-means)
  const landX = [];
  const landY = [];
  const landParts = [];
  const landGroup = [];
  for (const G of arrivals) {
    const P = G.parts;
    const m = Math.max(4, Math.min(42, Math.round(P.length / PER)));
    const byY = P.slice().sort((a, b) => hy[a] - hy[b]);
    const cx = Float64Array.from({ length: m }, (_, j) => hx[byY[Math.floor(((j + 0.5) / m) * byY.length)]]);
    const cy = Float64Array.from({ length: m }, (_, j) => hy[byY[Math.floor(((j + 0.5) / m) * byY.length)]]);
    const asg = new Int32Array(P.length);
    for (let it = 0; it < 8; it++) {
      const sx = new Float64Array(m);
      const sy = new Float64Array(m);
      const cnt = new Int32Array(m);
      P.forEach((i, q) => {
        let best = 0;
        let bd = Infinity;
        for (let j = 0; j < m; j++) {
          const d = (hx[i] - cx[j]) ** 2 + (hy[i] - cy[j]) ** 2;
          if (d < bd) {
            bd = d;
            best = j;
          }
        }
        asg[q] = best;
        sx[best] += hx[i];
        sy[best] += hy[i];
        cnt[best]++;
      });
      for (let j = 0; j < m; j++) {
        if (cnt[j]) {
          cx[j] = sx[j] / cnt[j];
          cy[j] = sy[j] / cnt[j];
        }
      }
    }
    for (let j = 0; j < m; j++) {
      const parts = P.filter((_, q) => asg[q] === j);
      if (!parts.length) continue;
      G.birds.push(landX.length);
      landX.push(cx[j]);
      landY.push(cy[j]);
      landParts.push(parts);
      landGroup.push(G.k);
    }
    let sx = 0;
    let sy = 0;
    for (const c of G.birds) {
      sx += landX[c];
      sy += landY[c];
    }
    G.cx = sx / G.birds.length;
    G.cy = sy / G.birds.length;
    G.at = (G.k / B) * 0.62; // loading progress at which this group sets off
  }
  const C = landX.length; // birds that fly in and land

  // groups wandering in the sky; after loading they become the ring around the logo
  const SKY = small ? [5, 7, 9, 13, 17, 21, 25, 26] : [5, 7, 9, 11, 13, 15, 19, 23, 27, 31, 41];
  const M = SKY.reduce((a, b) => a + b, 0);
  const S0 = N; // first sky bird
  const C0 = N + M; // first arriving bird
  const T = N + M + C;

  const px = new Float32Array(T).fill(99);
  const py = new Float32Array(T).fill(99);
  const vx = new Float32Array(T);
  const vy = new Float32Array(T);
  const heading = new Float32Array(T);
  const phase = new Float32Array(T);
  const open = new Float32Array(T).fill(1);
  const vary = new Float32Array(T);
  const tone = new Float32Array(T);
  const seed = new Float32Array(T);
  for (let i = 0; i < T; i++) {
    phase[i] = Math.random() * 100;
    vary[i] = 0.88 + Math.random() * 0.24;
    tone[i] = Math.random() * 0.3;
    seed[i] = Math.random() * 100;
  }

  // logo particles
  const state = new Uint8Array(N); // 0 not there yet, 2 home, 3 airborne
  const air = new Float32Array(N);
  const acx = new Float32Array(N);
  const acy = new Float32Array(N);
  const arad = new Float32Array(N);
  const ath = new Float32Array(N);
  const perch = new Float32Array(N);
  const isRing = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    perch[i] = Math.random() < 0.5 ? 0.15 : Math.PI - 0.15;
    isRing[i] = homes.layer[i] === 'ring' ? 1 : 0;
  }

  // arriving birds
  const cState = new Uint8Array(C); // 0 waiting, 1 flying, 2 landed (fading into the logo), 3 gone
  const cAlong = new Float32Array(C); // place in the group (logo units, set at launch)
  const cAcross = new Float32Array(C);
  const cLag = new Float32Array(C); // followers break off a moment after the leader
  const cFade = new Float32Array(C);
  const cPrevX = new Float32Array(C);
  const cPrevY = new Float32Array(C);

  // sky groups
  const sky = [];
  {
    let gi = S0;
    SKY.forEach((size, g) => {
      // CHANGED FOR THIS SITE: the small sky groups were V formations too.
      // They wander in the background all through the loading, so leaving
      // them as arrows would have kept the shape on screen anyway.
      const isV = false;
      const shape = flockShape(size, 'flock');
      const members = shape.map(([ox, oy]) => ({ i: gi++, ox, oy }));
      const mx = shape.reduce((a, p) => a + p[0], 0) / size;
      for (const m of members) m.ox -= mx; // centred on the group's position
      sky.push({ members, isV, x: 0, y: 0, h: 0, v: 0.42 + Math.random() * 0.16, seed: Math.random() * 100, delay: g * 0.28, turnSign: Math.random() < 0.5 ? -1 : 1 });
    });
  }
  // after loading, each sky bird takes a place on the ring
  const ringA = new Float32Array(M);
  const ringO = new Float32Array(M * 2);
  const ringDelay = new Float32Array(M);
  for (let j = 0; j < M; j++) {
    ringA[j] = Math.random() * Math.PI * 2;
    ringO[j * 2] = (Math.random() - 0.5) * 0.4;
    ringO[j * 2 + 1] = (Math.random() - 0.5) * 0.28;
    ringDelay[j] = Math.random() * 0.4;
  }
  // CHANGED FOR THIS SITE: the ring used to be one tight band, every bird at nearly the same
  // distance from the logo and circling at the same speed. Now each bird keeps its own pace
  // (a few go the other way round), and every so often drifts well out from the logo and
  // comes back — see ringTarget.
  const ringSp = new Float32Array(M);
  const ringOut = new Float32Array(M);
  const ringW = new Float32Array(M);
  const ringP = new Float32Array(M);
  for (let j = 0; j < M; j++) {
    ringSp[j] = (0.16 + Math.random() * 0.26) * (Math.random() < 0.15 ? -1 : 1);
    ringOut[j] = 0.35 + Math.random() * 1.0;
    ringW[j] = 0.07 + Math.random() * 0.13;
    ringP[j] = Math.random() * 100;
    ringO[j * 2] = -0.08 + Math.random() * 0.45;
    ringO[j * 2 + 1] = -0.06 + Math.random() * 0.32;
  }
  const scatter = scatterVectors(T, 5);
  const dispX = new Float32Array(N);
  const dispY = new Float32Array(N);
  const dispH = new Float32Array(N); // CHANGED FOR THIS SITE: the heading as drawn (see the scroll)

  const geo = birdGeometry();
  const aBird = new Float32Array(T * 4);
  const aState = new Float32Array(T * 4);
  const birdAttr = new THREE.InstancedBufferAttribute(aBird, 4).setUsage(THREE.DynamicDrawUsage);
  const stateAttr = new THREE.InstancedBufferAttribute(aState, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aBird', birdAttr);
  geo.setAttribute('aState', stateAttr);
  geo.instanceCount = T;
  const birdUniforms = { uSize: { value: 0.016 }, uBird: { value: cur.bird }, uBirdFar: { value: cur.birdFar } };
  const birdMat = new THREE.ShaderMaterial({ vertexShader: birdVertex, fragmentShader: birdFragment, uniforms: birdUniforms, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const birds = new THREE.Mesh(geo, birdMat);
  birds.frustumCulled = false;
  birds.renderOrder = 2;

  const shared = { uTime: { value: 0 }, uUnitPx: { value: 200 } };
  const logoUniforms = {
    ...shared,
    uLogo: { value: null }, uSettle: { value: field.texture },
    uGhostA: ghost, uGlint: { value: -10 },
    uText: { value: cur.text }, uText2: { value: cur.text2 }, uGold: { value: cur.gold },
    uLight: { value: cur.light }, uShade: { value: cur.shade }, uHalo: { value: cur.halo },
  };
  const logo = createSharpLogo(LOGO, logoUniforms);
  scene.add(logo, birds);
  field.fill(0);

  // ---------- framing: logo centred on screen while loading → in its hero slot ----------
  let W = 1;
  let H = 1;
  let pr = 1;
  let texSize = 0;
  let logoTexture = null;
  const frame = { cx: 0, cy: 0, r: 200 };
  let frameMix = 0;
  function loaderFrame() {
    const visH = Math.min(H, innerHeight);
    const land = W >= visH * 0.9;
    return { cx: W / 2, cy: visH * 0.5, r: land ? 0.24 * visH : 0.34 * W };
  }
  function heroFrame() {
    const a = opts.anchor?.getBoundingClientRect();
    if (a && a.width > 4) {
      const h = host.getBoundingClientRect();
      return { cx: a.left + a.width / 2 - h.left, cy: a.top + a.height / 2 - h.top, r: (Math.min(a.width, a.height) / 2) * 0.74 };
    }
    const f = loaderFrame();
    return { ...f, r: f.r * 1.25 };
  }
  function measure() {
    W = host.clientWidth || innerWidth;
    H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    pr = renderer.getPixelRatio();
    const r = Math.max(loaderFrame().r, heroFrame().r);
    const want = 2 * EXT * r * pr > 1100 ? 2048 : 1024;
    if (want !== texSize) {
      logoTexture?.dispose();
      logoTexture = createLogoTexture(want);
      logoUniforms.uLogo.value = logoTexture;
      texSize = want;
    }
  }
  function applyCamera() {
    const { cx, cy, r } = frame;
    Object.assign(camera, { left: -cx / r, right: (W - cx) / r, top: cy / r, bottom: -(H - cy) / r });
    camera.updateProjectionMatrix();
    shared.uUnitPx.value = r * pr;
    birdUniforms.uSize.value = Math.max(0.014, 3.6 / r);
    host.style.setProperty('--hc-cx', `${cx.toFixed(1)}px`);
    host.style.setProperty('--hc-cap', `${(cy + r * 1.22).toFixed(1)}px`);
  }
  function updateFrame(dt) {
    if (stage === 'loading') Object.assign(frame, loaderFrame());
    else if (stage === 'settle') {
      const a = loaderFrame();
      const b = heroFrame();
      const f = easeInOutCubic(frameMix);
      frame.cx = a.cx + (b.cx - a.cx) * f;
      frame.cy = a.cy + (b.cy - a.cy) * f;
      frame.r = a.r + (b.r - a.r) * f;
    } else {
      // follow the slot smoothly (language switch, resize)
      const b = heroFrame();
      const k = dt === 0 ? 1 : 1 - Math.exp(-dt * 6);
      frame.cx += (b.cx - frame.cx) * k;
      frame.cy += (b.cy - frame.cy) * k;
      frame.r += (b.r - frame.r) * k;
    }
    applyCamera();
  }
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(host);

  // ---------- input ----------
  const pointer = { cx: 0, cy: 0, on: false, x: 0, y: 0 };
  const clicks = [];
  function toUnits(clientX, clientY) {
    const r = host.getBoundingClientRect();
    return [(clientX - r.left - frame.cx) / frame.r, (frame.cy - (clientY - r.top)) / frame.r];
  }
  function onMove(e) {
    const r = host.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) {
      pointer.on = false;
      return;
    }
    // no hawk over buttons and links: those are for clicking
    if (e.target?.closest?.('a,button,input,textarea,select')) {
      pointer.on = false;
      return;
    }
    pointer.cx = e.clientX;
    pointer.cy = e.clientY;
    pointer.on = true;
  }
  function onDown(e) {
    if (stage !== 'hero') return;
    if (e.target?.closest?.('a,button,input,textarea,select')) return;
    clicks.push(toUnits(e.clientX, e.clientY));
  }
  addEventListener('pointermove', onMove, { passive: true });
  eventsEl.addEventListener('pointerdown', onDown);

  // ---------- timeline ----------
  const SETTLE = reduced ? 0.3 : 2.1;
  const clock = createLoaderClock({ minDuration: opts.minDuration, hold: 0.25, finale: SETTLE, exit: 0.01 });
  let stage = 'loading';
  let settleT = 0;
  let wantSettle = false;
  let waitT = 0;
  let landed = 0;
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  function beginSettle() {
    stage = 'settle';
    settleT = 0;
    for (const G of arrivals) if (!G.launched) launchGroup(G);
    opts.onReady?.();
  }

  function offscreenPoint(angle, extra = 0.35) {
    // a point just outside the visible area, in the given direction from the logo
    const ext = Math.max(camera.right, -camera.left, camera.top, -camera.bottom);
    const d = ext + extra;
    return [Math.cos(angle) * d, Math.sin(angle) * d];
  }

  // ----- arriving groups: fly in along a smooth curve, keep formation, then each bird lands -----
  function makePath(sx, sy, ex, ey, bend) {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const c1 = [sx + dx * 0.33 + nx * bend, sy + dy * 0.33 + ny * bend];
    const c2 = [sx + dx * 0.7 + nx * bend * 0.55, sy + dy * 0.7 + ny * bend * 0.55];
    const at = (u) => {
      const v = 1 - u;
      return [
        v * v * v * sx + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * ex,
        v * v * v * sy + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * ey,
      ];
    };
    // arc-length table, so birds can follow each other at a fixed distance
    const S = 48;
    const pts = [];
    const dist = [0];
    for (let k = 0; k <= S; k++) pts.push(at(k / S));
    for (let k = 1; k <= S; k++) dist.push(dist[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const L = dist[S];
    const d0 = [(pts[1][0] - pts[0][0]) / (dist[1] || 1), (pts[1][1] - pts[0][1]) / (dist[1] || 1)];
    // point and direction at distance s along the path (straight on before the start)
    function point(s) {
      if (s <= 0) return [sx + d0[0] * s, sy + d0[1] * s, d0[0], d0[1]];
      s = Math.min(s, L);
      let k = 1;
      while (k < S && dist[k] < s) k++;
      const f = (s - dist[k - 1]) / (dist[k] - dist[k - 1] || 1);
      const tx = pts[k][0] - pts[k - 1][0];
      const ty = pts[k][1] - pts[k - 1][1];
      const tl = Math.hypot(tx, ty) || 1;
      return [pts[k - 1][0] + tx * f, pts[k - 1][1] + ty * f, tx / tl, ty / tl];
    }
    return { L, point };
  }

  function launchGroup(G) {
    G.launched = true;
    G.t = 0;
    // each group comes from the side of the sky where it will land; neighbouring groups take
    // different routes, so they never stack up in one stream
    const toward = Math.atan2(G.cy + 0.35, G.cx);
    const ang = toward + (Math.PI / 2 - toward) * 0.25 + [0, -0.75, 0.6, -0.35, 0.95, -1.05][G.k % 6] + (Math.random() - 0.5) * 0.3;
    const [sx, sy] = offscreenPoint(ang, 0.4);
    const odx = sx - G.cx;
    const ody = sy - G.cy;
    const ol = Math.hypot(odx, ody) || 1;
    const ex = G.cx + (odx / ol) * 0.32;
    const ey = G.cy + (ody / ol) * 0.32;
    G.path = makePath(sx, sy, ex, ey, (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.45));
    G.dur = reduced ? 0.4 : Math.min(2.9, Math.max(2.0, G.path.L / 1.45));
    // formation: the gap between birds is fixed in screen pixels, so it reads the same everywhere
    const gap = 25 / frame.r;
    const n = G.birds.length;
    // CHANGED FOR THIS SITE: always a loose flock, never the V.
    // The arriving groups used to be mostly V formations, which read as an
    // arrow pointing at the logo rather than as birds. 'flock' builds an
    // irregular blob with two randomised lobes, so every group that comes in
    // has a shape of its own. Nothing else about the arrival changes: same
    // counts, same paths, same timings, same landing.
    const shape = flockShape(n, 'flock');
    shape.sort((a, b) => b[0] - a[0]);
    // the bird whose spot lies furthest ahead flies at the front
    const dirx = -odx / ol;
    const diry = -ody / ol;
    const byLead = G.birds.slice().sort((a, b) => (landX[b] - landX[a]) * dirx + (landY[b] - landY[a]) * diry);
    const back = Math.max(0.01, -shape[shape.length - 1][0]);
    byLead.forEach((c, k) => {
      cAlong[c] = shape[k][0] * gap;
      cAcross[c] = shape[k][1] * gap;
      cLag[c] = reduced ? 0 : (-shape[k][0] / back) * 0.07 + Math.random() * 0.03;
      cState[c] = 1;
      const [x, y] = G.path.point(cAlong[c]);
      cPrevX[c] = x;
      cPrevY[c] = y;
    });
  }

  function touchDown(c) {
    cState[c] = 2;
    cFade[c] = 0;
    landed++;
    for (const i of landParts[c]) {
      state[i] = 2;
      px[i] = hx[i];
      py[i] = hy[i];
      vx[i] = vy[i] = 0;
      open[i] = 0;
      heading[i] = perch[i];
    }
  }

  function takeOff(i, seconds) {
    if (state[i] !== 3) {
      acx[i] = px[i] + (Math.random() - 0.5) * 0.6;
      acy[i] = py[i] + 0.3 + Math.random() * 0.3;
      arad[i] = 0.18 + Math.random() * 0.3;
      ath[i] = Math.atan2(py[i] - acy[i], px[i] - acx[i]);
    }
    state[i] = 3;
    air[i] = Math.max(air[i], seconds);
  }

  // flap for a while, glide for a while, like real birds
  function flap(i, dt, rate, glide) {
    const gliding = glide || Math.sin(time * 0.8 + seed[i]) > 0.5;
    if (gliding) phase[i] += (Math.round(phase[i] / Math.PI) * Math.PI - phase[i]) * Math.min(1, dt * 7);
    else phase[i] += dt * rate;
  }

  // ----- wandering sky groups -----
  function placeSky(g) {
    const ang = Math.random() * Math.PI * 2;
    const [x, y] = offscreenPoint(ang, 0.3);
    g.x = x;
    g.y = y;
    g.h = ang + Math.PI + (Math.random() - 0.5) * 0.8;
  }
  function steerSky(g, dt) {
    const bx = Math.max(1.4, Math.min(camera.right, -camera.left) - 0.2);
    const by = Math.max(1.3, Math.min(camera.top, -camera.bottom) - 0.2);
    let turn = 0.3 * Math.sin(time * 0.33 + g.seed) + 0.18 * Math.sin(time * 0.77 + g.seed * 2.3);
    // stay in view
    const out = Math.max(Math.abs(g.x) / bx, Math.abs(g.y) / by);
    if (out > 0.78) turn += angDiff(Math.atan2(-g.y, -g.x), g.h) * 1.5 * smoothstep(0.78, 1.1, out);
    // keep clear of the logo while it is being built
    const r = Math.hypot(g.x, g.y);
    if (stage === 'loading' && r < 1.5) turn += angDiff(Math.atan2(g.y, g.x) + g.turnSign * 1.1, g.h) * 1.8 * smoothstep(1.5, 1.05, r);
    g.h += turn * dt;
    g.x += Math.cos(g.h) * g.v * dt;
    g.y += Math.sin(g.h) * g.v * dt;
  }
  function ringTarget(j, t) {
    const a = ringA[j];
    const wob = Math.sin(a * 3 + t * 0.7) * 0.12 + Math.sin(a * 5 - t * 1.1) * 0.05;
    const R = opts.ringScale;
    const kx = Math.min(1, (Math.min(camera.right, -camera.left) * 0.94) / (R + 0.1));
    const ky = kx < 1 ? 1.2 : 1;
    // CHANGED FOR THIS SITE: a slow swell in and out, and now and then a long drift away
    const out = ringOut[j] * Math.pow(Math.max(0, Math.sin(t * ringW[j] + ringP[j])), 3) + 0.12 * Math.sin(t * 0.27 + ringP[j] * 2.1);
    const rx = Math.cos(a) * (R + wob + ringO[j * 2] + out) * kx;
    const ry = Math.sin(a) * (R * 0.8 + wob * 0.7 + ringO[j * 2 + 1] + out * 0.8) * ky + 0.06;
    // a bird that drifts towards the edge of the screen eases off before it, along its own
    // line from the logo, rather than stopping dead there (which lined them up in a wall)
    const lx = (rx > 0 ? camera.right : -camera.left) - 0.1;
    const ly = (ry > 0 ? camera.top : -camera.bottom) - 0.1;
    const q = Math.max(Math.abs(rx) / Math.max(lx, 0.2), Math.abs(ry) / Math.max(ly, 0.2));
    const f = q > 0.6 ? (0.6 + 0.4 * Math.tanh((q - 0.6) / 0.4)) / q : 1;
    return [rx * f, ry * f];
  }

  // skipping the loader: everyone home, flock on the ring
  updateFrame(0);
  if (opts.skipLoader) {
    stage = 'hero';
    frameMix = 1;
    for (let i = 0; i < N; i++) {
      state[i] = 2;
      px[i] = hx[i];
      py[i] = hy[i];
      open[i] = 0;
    }
    field.fill(1);
    for (const G of arrivals) G.launched = true;
    cState.fill(3);
    landed = C;
    updateFrame(0);
    resolveReady();
  }
  for (const g of sky) {
    placeSky(g);
    for (const m of g.members) {
      const [rx, ry] = ringTarget(m.i - S0, 0);
      px[m.i] = opts.skipLoader ? rx : g.x + m.ox;
      py[m.i] = opts.skipLoader ? ry : g.y + m.oy;
    }
  }

  // ---------- loop ----------
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let idleIn = 8;
  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });
  io.observe(host);

  let failed = false;
  function loop(now) {
    // the hero pauses while it is out of view; the loader always runs to the end
    if (!visible && stage === 'hero') {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(loop);
    try {
      step(now);
    } catch (err) {
      if (!failed) {
        failed = true;
        opts.onError?.(err);
      }
    }
  }
  let frames = 0;
  function step(now) {
    frames++;
    const dt = Math.max(0, Math.min((now - last) / 1000, opts.maxDt ?? 0.04));
    last = now;
    time += dt;
    shared.uTime.value = time;

    const kc = 1 - Math.exp(-dt * 3.5);
    for (const k of KEYS) cur[k].lerp(target[k], kc);
    ghost.value += ((stage === 'loading' ? 0 : ghostTarget) - ghost.value) * kc;

    if (stage !== 'hero') {
      const { phase: ph, entered } = clock.tick(dt);
      if (ph === 'finale' && entered) wantSettle = true;
      if (stage === 'loading' && wantSettle) {
        // the light sweep waits until the last birds have landed
        waitT += dt;
        if (landed >= C || waitT > 3) beginSettle();
      }
      if (stage === 'settle') {
        settleT += dt;
        frameMix = reduced ? 1 : Math.min(1, settleT / SETTLE);
        logoUniforms.uGlint.value = reduced ? -10 : THREE.MathUtils.lerp(-1.8, 1.8, smoothstep(0.02, 0.7, settleT / SETTLE));
        if (settleT >= SETTLE) {
          stage = 'hero';
          frameMix = 1;
          logoUniforms.uGlint.value = -10;
          resolveReady();
        }
      }
      opts.onProgress?.(clock.shown);
    }
    updateFrame(dt);
    if (stage === 'loading') for (const G of arrivals) if (!G.launched && clock.shown >= G.at) launchGroup(G);

    const r = host.getBoundingClientRect();
    const scroll = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
    const s2 = scroll * scroll;
    if (pointer.on) [pointer.x, pointer.y] = toUnits(pointer.cx, pointer.cy);
    const hawk = stage === 'hero' && pointer.on;

    if (stage === 'hero' && !reduced && !pointer.on) {
      idleIn -= dt;
      if (idleIn <= 0) {
        idleIn = 7 + Math.random() * 5;
        let k = 0;
        const start = (Math.random() * N) | 0;
        for (let n = 0; n < N && k < 12; n++) {
          const i = (start + n) % N;
          if (isRing[i] && state[i] === 2) {
            takeOff(i, 1.2 + Math.random() * 1.2);
            k++;
          }
        }
      }
    }

    // ----- arriving birds -----
    for (const G of arrivals) if (G.launched && G.path) G.t += dt;
    for (let c = 0; c < C; c++) {
      const i = C0 + c;
      if (cState[c] === 0 || cState[c] === 3) {
        aState[i * 4] = 0;
        continue;
      }
      const G = arrivals[landGroup[c]];
      let x;
      let y;
      let sc;
      let alpha = 1;
      if (cState[c] === 1) {
        const tau = G.t / G.dur;
        // the group slows down as it arrives
        const s = G.path.L * (1 - Math.pow(1 - Math.min(1, tau), 1.5));
        // each bird follows the path of the ones in front of it, so the formation bends in curves
        const [fx, fy, tx, ty] = G.path.point(s + cAlong[c]);
        const sway = Math.sin(time * 1.6 + seed[i]) * 0.012 + Math.sin(time * 0.9 + seed[i] * 1.7) * 0.008;
        const ax = cAcross[c] + sway;
        const formX = fx - ty * ax;
        const formY = fy + tx * ax;
        // then it leaves the group and glides down to its own spot
        const own = tau - cLag[c];
        const b = smoother(0.42, 1, own);
        x = formX + (landX[c] - formX) * b;
        y = formY + (landY[c] - formY) * b;
        sc = 2.2 - 1.2 * smoothstep(0.3, 1, b);
        open[i] = 1 - 0.85 * smoothstep(0.9, 1, b);
        flap(i, dt, 10 + (c % 3) * 0.8, b > 0.55);
        if (own >= 1) {
          x = landX[c];
          y = landY[c];
          touchDown(c);
        }
      } else {
        // landed: folds its wings and becomes part of the logo
        cFade[c] += dt;
        x = landX[c];
        y = landY[c];
        sc = 1 - 0.15 * smoothstep(0, 0.5, cFade[c]);
        open[i] = Math.max(0, open[i] - dt * 4);
        alpha = 1 - smoothstep(0.08, 0.5, cFade[c]);
        if (cFade[c] > 0.5) cState[c] = 3;
      }
      const mdx = x - cPrevX[c];
      const mdy = y - cPrevY[c];
      if (mdx * mdx + mdy * mdy > 1e-8) heading[i] = Math.atan2(mdy, mdx);
      cPrevX[c] = x;
      cPrevY[c] = y;
      aBird.set([x + s2 * scatter[i * 2], y + s2 * scatter[i * 2 + 1], heading[i], phase[i]], i * 4);
      aState[i * 4] = alpha;
      aState[i * 4 + 1] = open[i];
      aState[i * 4 + 2] = sc * vary[i];
      aState[i * 4 + 3] = 0;
    }

    // ----- the logo's own birds (hero) -----
    for (let i = 0; i < N; i++) {
      if (state[i] >= 2) {
        if (hawk && state[i] === 2) {
          const dx = px[i] - pointer.x;
          const dy = py[i] - pointer.y;
          if (dx * dx + dy * dy < 0.034) takeOff(i, 1.1 + Math.random() * 1.5);
        }
        for (const [cx, cy] of clicks) if (Math.hypot(px[i] - cx, py[i] - cy) < 0.4) takeOff(i, 1.8 + Math.random() * 2.2);
        if (state[i] === 3) {
          air[i] -= dt;
          ath[i] += dt * (2.2 + (i % 5) * 0.25);
          const tx = acx[i] + Math.cos(ath[i]) * arad[i];
          const ty = acy[i] + Math.sin(ath[i]) * arad[i];
          let ax = (tx - px[i]) * 6 - vx[i] * 2.5;
          let ay = (ty - py[i]) * 6 - vy[i] * 2.5;
          if (hawk) {
            const dx = px[i] - pointer.x;
            const dy = py[i] - pointer.y;
            const d = Math.hypot(dx, dy) + 1e-3;
            if (d < 0.35) {
              ax += (dx / d) * (1 - d / 0.35) * 30;
              ay += (dy / d) * (1 - d / 0.35) * 30;
            }
          }
          vx[i] += ax * dt;
          vy[i] += ay * dt;
          open[i] = Math.min(1, open[i] + dt * 6);
          if (air[i] <= 0) state[i] = 2;
        } else {
          const dx = hx[i] - px[i];
          const dy = hy[i] - py[i];
          const d = Math.hypot(dx, dy);
          if (d < 0.006) {
            px[i] = hx[i];
            py[i] = hy[i];
            vx[i] = vy[i] = 0;
            open[i] = Math.max(0, open[i] - dt * 5);
          } else {
            const sp = Math.min(1.3, d * 5 + 0.1);
            vx[i] += ((dx / d) * sp - vx[i]) * Math.min(1, dt * 7);
            vy[i] += ((dy / d) * sp - vy[i]) * Math.min(1, dt * 7);
            open[i] = d > 0.03 ? Math.min(1, open[i] + dt * 6) : Math.max(0, open[i] - dt * 4);
          }
        }
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        if (vx[i] * vx[i] + vy[i] * vy[i] > 0.0004 && open[i] > 0.2) heading[i] = Math.atan2(vy[i], vx[i]);
        else heading[i] += (((perch[i] - heading[i] + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6);
        // CHANGED FOR THIS SITE: a perched bird scattered by the scroll flaps and glides too
        if (state[i] === 2 && s2 > 0.01) flap(i, dt, 12 + (i % 3), false);
        else phase[i] += dt * (open[i] > 0.05 ? 14 + (i % 3) : 0);
      }
      // CHANGED FOR THIS SITE: scrolling used to push each bird out to a fixed spot and leave it
      // there, wings spread and still, so the whole flock froze in mid-air. Now a scattered bird
      // keeps flying: it circles loosely around the spot the scroll pushed it to and faces the
      // way it is going. At the top of the page (s2 = 0) nothing here differs from before.
      let ox = s2 * scatter[i * 2];
      let oy = s2 * scatter[i * 2 + 1];
      if (s2 > 0) {
        const a = time * (0.9 + (i % 7) * 0.09) + seed[i];
        ox += s2 * (Math.cos(a) * 0.16 + Math.sin(a * 0.61 + seed[i]) * 0.07);
        oy += s2 * (Math.sin(a) * 0.1 + Math.cos(a * 0.47 + seed[i] * 1.3) * 0.05);
      }
      const mdx = px[i] + ox - dispX[i];
      const mdy = py[i] + oy - dispY[i];
      dispX[i] += mdx;
      dispY[i] += mdy;
      if (s2 > 0) {
        const want = s2 > 0.02 && mdx * mdx + mdy * mdy > 1e-9 ? Math.atan2(mdy, mdx) : heading[i];
        dispH[i] += angDiff(want, dispH[i]) * Math.min(1, dt * 10);
      } else dispH[i] = heading[i];
    }
    field.update(dispX, dispY, dt);
    for (let i = 0; i < N; i++) {
      aBird.set([dispX[i], dispY[i], dispH[i], phase[i]], i * 4);
      // while loading, the arriving birds stand in for these; in the hero they show when they fly
      const shown = state[i] === 3 || (stage === 'hero' && state[i] === 2);
      aState[i * 4] = shown ? Math.max(field.disp[i], 1 - field.solidAt(i)) : 0;
      aState[i * 4 + 1] = Math.max(open[i], s2 > 0.01 ? 1 : 0);
      aState[i * 4 + 2] = 1;
      aState[i * 4 + 3] = 0;
    }

    // ----- sky groups: wander while loading, then open into a ring around the logo -----
    const ringMix = stage === 'loading' ? 0 : stage === 'hero' ? 1 : smoothstep(0, 1, settleT / SETTLE);
    const skyGap = 21 / frame.r; // gap between the (distant, smaller) sky birds, in screen pixels
    for (const g of sky) {
      const active = opts.skipLoader || time > g.delay;
      if (active) steerSky(g, dt);
      const c = Math.cos(g.h);
      const s = Math.sin(g.h);
      for (const m of g.members) {
        const i = m.i;
        const j = i - S0;
        const wob = g.isV ? 0.005 : 0.01;
        const ox = m.ox * skyGap + Math.sin(time * 1.3 + seed[i]) * wob;
        const oy = m.oy * skyGap + Math.cos(time * 1.1 + seed[i] * 1.7) * wob;
        let tx = g.x + ox * c - oy * s;
        let ty = g.y + ox * s + oy * c;
        if (ringMix > 0) {
          ringA[j] += dt * ringSp[j] * (0.7 + 0.5 * Math.sin(time * 0.11 + ringP[j])) * ringMix; // CHANGED FOR THIS SITE
          const mm = smoothstep(ringDelay[j], ringDelay[j] + 0.6, ringMix);
          const [rx, ry] = ringTarget(j, time);
          tx += (rx - tx) * mm;
          ty += (ry - ty) * mm;
        }
        if (hawk) {
          const dx = tx - pointer.x;
          const dy = ty - pointer.y;
          const d = Math.hypot(dx, dy) + 1e-3;
          if (d < 0.45) {
            tx += (dx / d) * (0.45 - d) * 1.2;
            ty += (dy / d) * (0.45 - d) * 1.2;
          }
        }
        if (!active) {
          px[i] = tx;
          py[i] = ty;
        } else {
          vx[i] += ((tx - px[i]) * 16 - vx[i] * 7) * dt;
          vy[i] += ((ty - py[i]) * 16 - vy[i] * 7) * dt;
          px[i] += vx[i] * dt;
          py[i] += vy[i] * dt;
        }
        if (vx[i] * vx[i] + vy[i] * vy[i] > 1e-5) heading[i] = Math.atan2(vy[i], vx[i]);
        flap(i, dt, 12 + (i % 4), false);
        aBird.set([px[i] + s2 * scatter[i * 2], py[i] + s2 * scatter[i * 2 + 1], heading[i], phase[i]], i * 4);
        aState[i * 4] = opts.skipLoader ? smoothstep(0, 0.6, time) : 1;
        aState[i * 4 + 1] = 1;
        aState[i * 4 + 2] = vary[i] * (1.45 - 0.3 * ringMix);
        aState[i * 4 + 3] = 0.45 + (tone[i] - 0.45) * ringMix;
      }
    }
    birdAttr.needsUpdate = true;
    stateAttr.needsUpdate = true;
    clicks.length = 0;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    ro.disconnect();
    io.disconnect();
    mo?.disconnect();
    removeEventListener('pointermove', onMove);
    eventsEl.removeEventListener('pointerdown', onDown);
    geo.dispose();
    birdMat.dispose();
    logo.geometry.dispose();
    logo.material.dispose();
    field.dispose();
    logoTexture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  // the page re-rendered the hero band: move the running scene into the new elements
  function rehost(next, o = {}) {
    if (disposed || !next) return;
    if (o.anchor) opts.anchor = o.anchor;
    if (next !== host) {
      ro.unobserve(host);
      io.unobserve(host);
      host = next;
      ro.observe(host);
      io.observe(host);
    }
    for (const c of host.querySelectorAll('canvas')) if (c !== renderer.domElement) c.remove();
    if (renderer.domElement.parentNode !== host) host.prepend(renderer.domElement);
    const ev = o.eventsEl || host;
    if (ev !== eventsEl) {
      eventsEl.removeEventListener('pointerdown', onDown);
      eventsEl = ev;
      eventsEl.addEventListener('pointerdown', onDown);
    }
    if (o.themeEl && o.themeEl !== opts.themeEl) {
      opts.themeEl = o.themeEl;
      watchTheme();
      applyMode(readMode());
    }
    measure();
    applyCamera();
  }

  return {
    rehost,
    /** switch colours to 'light' or 'dark' (they glide); use this instead of themeEl if you like */
    setTheme: (m) => applyMode(m === 'dark' ? 'dark' : 'light'),
    setProgress: (v) => clock.set(v),
    complete: () => clock.set(1),
    ready,
    get stage() {
      return stage;
    },
    get frames() {
      return frames;
    },
    dispose,
  };
}
