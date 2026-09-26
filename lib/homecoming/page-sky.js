// Page sky — the Homecoming birds, wandering over every page of the site.
//
// Not part of the shipped scene: written for this site. It reuses the scene's own bird —
// the same shaders, geometry and loose flock shapes from `src/homecoming.js` — and the way
// its sky groups move: each group drifts on slow, overlapping turns, every bird follows its
// place in the group on a spring, flaps for a while and glides for a while, and makes way
// for the pointer. What differs is the stage: one fixed canvas the size of the window, in
// pixels, and groups that cross the screen and leave instead of circling a logo. A group
// that has left comes back a few seconds later from another edge.
//
// No flock here is a rigid shape. Its heading wanders on a random walk, its pace rises and
// falls, it stretches and bunches as it goes, every bird drifts about its place and answers
// the group on a spring of its own — so on a turn the outside birds swing wide and lag. Many
// of the "groups" are a pair, or one bird on its own, which wanders more freely still.
import * as THREE from 'three';
import { birdVertex, birdFragment, birdGeometry, flockShape } from './src/homecoming.js';
import { rgb } from './src/readable-core.js';

// The hero's birds are cream on its green band. Over the rest of the site they cross both the
// paper and the green page-head bands, so in the light theme they take the site's gold, which
// reads on either; in the dark theme the hero's own colours already do.
export const PAGE_SKY_THEMES = {
  light: { bird: '#A9823F', birdFar: '#C8A45D' },
  dark: { bird: '#EDE1BE', birdFar: '#98AB9B' },
};

const SIZES = [1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 7, 9, 12];
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * @param {HTMLElement} host  a fixed element covering the window; the canvas goes in here
 * @param {object} [options]
 * @param {'light'|'dark'} [options.theme='light']
 * @param {HTMLElement} [options.themeEl]    element carrying the theme attribute
 * @param {string} [options.themeAttr='data-theme']
 * @param {() => number} [options.visibility]  0 … 1 each frame; 0 hides the birds (they keep flying)
 * @param {() => Array<[number, number, number, number, number]>} [options.obstacles]
 *   read each frame: no-fly boxes in client pixels, [left, top, right, bottom, upOnly]. A flock
 *   turns away before it reaches one, and a bird that finds itself over one (the page scrolled
 *   it under the bird) is steered off it by the nearest edge — or, with upOnly = 1, only upwards,
 *   for boxes that together make up a silhouette standing on the ground (the city skyline).
 */
export function createPageSky(host, options = {}) {
  const opts = { themeAttr: 'data-theme', ...options };
  const small = Math.min(innerWidth, innerHeight) < 700;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  // one unit = one CSS pixel, y up
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);

  // ---------- theme (colours glide, as in the hero) ----------
  const readMode = () => (opts.themeEl ? (opts.themeEl.getAttribute(opts.themeAttr) === 'dark' ? 'dark' : 'light') : opts.theme === 'dark' ? 'dark' : 'light');
  let mode = readMode();
  // plain sRGB triples, exactly as the hero hands its colours to the same shader
  const cur = { bird: rgb(PAGE_SKY_THEMES[mode].bird), birdFar: rgb(PAGE_SKY_THEMES[mode].birdFar) };
  const target = { bird: cur.bird.clone(), birdFar: cur.birdFar.clone() };
  function applyMode(next) {
    mode = next;
    target.bird.copy(rgb(PAGE_SKY_THEMES[mode].bird));
    target.birdFar.copy(rgb(PAGE_SKY_THEMES[mode].birdFar));
  }
  const mo = opts.themeEl ? new MutationObserver(() => applyMode(readMode())) : null;
  mo?.observe(opts.themeEl, { attributes: true, attributeFilter: [opts.themeAttr] });

  // ---------- groups ----------
  const G = small ? 4 : 7;
  const MAXN = Math.max(...SIZES);
  const T = G * MAXN;
  const px = new Float32Array(T);
  const py = new Float32Array(T);
  const vx = new Float32Array(T);
  const vy = new Float32Array(T);
  const heading = new Float32Array(T);
  const phase = new Float32Array(T);
  const seed = new Float32Array(T);
  const vary = new Float32Array(T);
  for (let i = 0; i < T; i++) {
    phase[i] = Math.random() * 100;
    seed[i] = Math.random() * 100;
    vary[i] = 0.88 + Math.random() * 0.24;
  }

  let W = 1;
  let H = 1;
  const groups = [];
  for (let g = 0; g < G; g++) groups.push({ base: g * MAXN, members: [], x: 0, y: 0, h: 0, v: 0, depth: 0, seed: 0, wait: 0, on: false });

  // a new flock, a new depth: nearer groups are larger, faster, darker and more spread out
  function shape(g) {
    const n = SIZES[(Math.random() * SIZES.length) | 0];
    const pts = flockShape(n, 'flock');
    const mx = pts.reduce((a, p) => a + p[0], 0) / n;
    // each bird: its place, how tightly it keeps it (spring), how it drifts about it
    g.members = pts.map(([ox, oy], k) => ({ i: g.base + k, ox: ox - mx, oy, k: rand(9, 18), f: rand(0.25, 0.7), d: rand(4, 9) }));
    g.single = n === 1;
    g.depth = Math.random();
    g.v = (g.single ? rand(60, 95) : 55) + 50 * g.depth;
    g.seed = Math.random() * 100;
    g.turn = 0;
  }
  function placeMembers(g) {
    const c = Math.cos(g.h);
    const s = Math.sin(g.h);
    const gap = 22 + 10 * g.depth;
    for (const m of g.members) {
      const ox = m.ox * gap;
      const oy = m.oy * gap;
      px[m.i] = g.x + ox * c - oy * s;
      py[m.i] = g.y + ox * s + oy * c;
      vx[m.i] = c * g.v;
      vy[m.i] = s * g.v;
      heading[m.i] = g.h;
    }
  }
  // just outside a random edge, heading across the screen
  function enter(g) {
    shape(g);
    const m = 90;
    // left, right or top; never up from the bottom, where the city stands on the footer
    const edge = (Math.random() * 3) | 0;
    if (edge === 0) [g.x, g.y] = [-m, rand(0.3, 0.95) * H];
    else if (edge === 1) [g.x, g.y] = [W + m, rand(0.3, 0.95) * H];
    else if (edge === 2) [g.x, g.y] = [rand(0.1, 0.9) * W, H + m];
    else [g.x, g.y] = [rand(0.1, 0.9) * W, -m];
    const aim = [rand(0.25, 0.75) * W, rand(0.3, 0.8) * H];
    g.h = Math.atan2(aim[1] - g.y, aim[0] - g.x) + rand(-0.3, 0.3);
    g.on = true;
    placeMembers(g);
  }
  // somewhere already on screen (only when the page first appears)
  function inView(g) {
    shape(g);
    g.x = rand(0.1, 0.9) * W;
    g.y = rand(0.35, 0.9) * H;
    g.h = Math.random() * Math.PI * 2;
    g.on = true;
    placeMembers(g);
  }

  function measure() {
    W = host.clientWidth || innerWidth;
    H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    Object.assign(camera, { left: 0, right: W, top: H, bottom: 0 });
    camera.updateProjectionMatrix();
  }
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(host);
  groups.forEach((g, k) => {
    if (k < Math.ceil(G / 2)) inView(g);
    else g.wait = rand(1, 8);
  });

  const geo = birdGeometry();
  const aBird = new Float32Array(T * 4);
  const aState = new Float32Array(T * 4);
  const birdAttr = new THREE.InstancedBufferAttribute(aBird, 4).setUsage(THREE.DynamicDrawUsage);
  const stateAttr = new THREE.InstancedBufferAttribute(aState, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aBird', birdAttr);
  geo.setAttribute('aState', stateAttr);
  geo.instanceCount = T;
  const uniforms = { uSize: { value: 6.5 }, uBird: { value: cur.bird }, uBirdFar: { value: cur.birdFar } };
  const mat = new THREE.ShaderMaterial({ vertexShader: birdVertex, fragmentShader: birdFragment, uniforms, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const birds = new THREE.Mesh(geo, mat);
  birds.frustumCulled = false;
  scene.add(birds);

  // ---------- CHANGED FOR THIS SITE: the scroll is a wind ----------
  // Scrolling moves the page, not the birds — they are on a fixed layer — so
  // without this they hang motionless over a world rushing past. Sampled in
  // the frame rather than in a scroll handler, so it costs nothing on a
  // browser that fires scroll events faster than it paints, and smoothed so a
  // trackpad flick is a gust and not a jolt. The birds' own springs do the
  // rest: the group is carried, each bird lags and swings back, and the bank
  // comes out of that for free.
  let scrollY = window.scrollY;
  let wind = 0;
  function sampleWind(dt) {
    const y = window.scrollY;
    const raw = dt > 0 ? (y - scrollY) / dt : 0;
    scrollY = y;
    // down the page is a downdraft: the canvas has y up, the page has y down
    const want = Math.max(-260, Math.min(260, -raw * 0.22));
    wind += (want - wind) * Math.min(1, dt * 4);
  }

  // ---------- the pointer is a hawk, as in the hero ----------
  const pointer = { x: 0, y: 0, on: false };
  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = H - e.clientY;
    pointer.on = true;
  }
  function onLeave() {
    pointer.on = false;
  }
  addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  // ---------- loop ----------
  let time = 0;
  let last = performance.now();
  let raf = 0;
  let cleared = false;

  // ---------- no-fly boxes: the cards on the page and the city skyline ----------
  // kept in canvas units (pixels, y up) as [left, bottom, right, top, upOnly], grown by a margin
  const MARGIN = 20;
  let obs = [];
  function readObstacles() {
    obs = [];
    const list = opts.obstacles ? opts.obstacles() : null;
    if (!list) return;
    for (const [l, t, r, b, up] of list) {
      obs.push([l - MARGIN, H - b - (up ? 0 : MARGIN), r + MARGIN, H - t + MARGIN, up ? 1 : 0]);
    }
  }
  // which way is out, and how pressing it is (0 … 1), for a point near the boxes
  function away(x, y, range) {
    let ax = 0;
    let ay = 0;
    let w = 0;
    for (const [l, b, r, t, up] of obs) {
      const nx = Math.max(l, Math.min(x, r));
      const ny = Math.max(b, Math.min(y, t));
      let dx = x - nx;
      let dy = y - ny;
      const d = Math.hypot(dx, dy);
      if (d >= range) continue;
      if (d === 0) {
        // inside: out through the nearest edge (only the top, for the city)
        if (up) [dx, dy] = [0, 1];
        else {
          const m = Math.min(x - l, r - x, y - b, t - y);
          [dx, dy] = m === t - y ? [0, 1] : m === y - b ? [0, -1] : m === x - l ? [-1, 0] : [1, 0];
        }
      } else {
        dx /= d;
        dy /= d;
      }
      const k = (1 - d / range) ** 2;
      ax += dx * k;
      ay += dy * k;
      w = Math.max(w, k);
    }
    return [ax, ay, w];
  }
  // a bird's place that falls inside a box is moved just outside it
  function pushOut(x, y) {
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const [l, b, r, t, up] of obs) {
        if (x <= l || x >= r || y <= b || y >= t) continue;
        if (up) y = t + 1;
        else {
          const m = Math.min(x - l, r - x, y - b, t - y);
          if (m === t - y) y = t + 1;
          else if (m === y - b) y = b - 1;
          else if (m === x - l) x = l - 1;
          else x = r + 1;
        }
        moved = true;
      }
      if (!moved) break;
    }
    return [x, y];
  }

  // flap for a while, glide for a while, like real birds (the hero's own rule)
  function flap(i, dt, rate) {
    if (Math.sin(time * 0.8 + seed[i]) > 0.5) phase[i] += (Math.round(phase[i] / Math.PI) * Math.PI - phase[i]) * Math.min(1, dt * 7);
    else phase[i] += dt * rate;
  }

  function step(dt, show) {
    time += dt;
    sampleWind(dt);
    const kc = 1 - Math.exp(-dt * 3.5);
    cur.bird.lerp(target.bird, kc);
    cur.birdFar.lerp(target.birdFar, kc);
    aState.fill(0);
    readObstacles();

    for (const g of groups) {
      if (!g.on) {
        g.wait -= dt;
        if (g.wait <= 0) enter(g);
        continue;
      }
      // the heading wanders: a random walk of the turn rate (long, lazy arcs, now and then a
      // sharper bank) on top of the hero's slow overlapping turns; a lone bird is freer
      const free = g.single ? 1.6 : 1;
      g.turn += rand(-1, 1) * 1.3 * free * dt;
      g.turn *= 1 - 0.6 * dt;
      g.turn = Math.max(-0.7 * free, Math.min(0.7 * free, g.turn));
      g.h += (g.turn + 0.18 * Math.sin(time * 0.33 + g.seed) + 0.1 * Math.sin(time * 0.77 + g.seed * 2.3)) * dt;
      // keep clear of the cards and the city: look at where the flock is and where it will be
      // in a moment, and bend the heading away from whatever is close
      {
        const look = 70 + g.v * 0.9;
        const [ax1, ay1, w1] = away(g.x, g.y, 150);
        const [ax2, ay2, w2] = away(g.x + Math.cos(g.h) * look, g.y + Math.sin(g.h) * look, 150);
        const w = Math.max(w1, w2);
        if (w > 0) {
          const want = Math.atan2(Math.sin(g.h) + (ay1 + ay2) * 2.2, Math.cos(g.h) + (ax1 + ax2) * 2.2);
          g.h += angDiff(want, g.h) * Math.min(1, dt * (2 + 6 * w));
          g.turn *= 1 - Math.min(1, dt * 4 * w);
        }
      }
      const pace = g.v * (1 + 0.18 * Math.sin(time * 0.37 + g.seed) + 0.08 * Math.sin(time * 1.1 + g.seed * 3.1));
      g.x += Math.cos(g.h) * pace * dt;
      g.y += Math.sin(g.h) * pace * dt;
      // the nearer flocks feel the wind more than the far ones
      g.y += wind * (0.5 + 0.8 * g.depth) * dt;
      // a flock whose middle is over a box (the page scrolled it there) is eased out of it too,
      // so its birds go round the card with it instead of across
      {
        const [ox, oy] = pushOut(g.x, g.y);
        const k = Math.min(1, dt * 3);
        g.x += (ox - g.x) * k;
        g.y += (oy - g.y) * k;
      }
      const m = 160;
      if (g.x < -m || g.x > W + m || g.y < -m || g.y > H + m) {
        // gone; back from another edge in a while
        g.on = false;
        g.wait = rand(3, 11);
        continue;
      }
      const c = Math.cos(g.h);
      const s = Math.sin(g.h);
      // the flock stretches along its flight and bunches across it, and back again
      const gap = (22 + 10 * g.depth) * (1 + 0.18 * Math.sin(time * 0.23 + g.seed));
      const along = 1 + 0.25 * Math.sin(time * 0.17 + g.seed * 1.9);
      const across = 1 - 0.15 * Math.sin(time * 0.29 + g.seed * 0.7);
      const scale = 0.85 + 0.7 * g.depth;
      const tone = 0.75 - 0.7 * g.depth;
      for (const mb of g.members) {
        const i = mb.i;
        const ox = mb.ox * gap * along + Math.sin(time * mb.f + seed[i]) * mb.d + Math.sin(time * 1.3 + seed[i]) * 2;
        const oy = mb.oy * gap * across + Math.cos(time * mb.f * 0.8 + seed[i] * 1.7) * mb.d + Math.cos(time * 1.1 + seed[i]) * 2;
        let tx = g.x + ox * c - oy * s;
        let ty = g.y + ox * s + oy * c;
        if (pointer.on) {
          const dx = tx - pointer.x;
          const dy = ty - pointer.y;
          const d = Math.hypot(dx, dy) + 1e-3;
          if (d < 110) {
            tx += (dx / d) * (110 - d) * 1.2;
            ty += (dy / d) * (110 - d) * 1.2;
          }
        }
        // each on its own spring: a loose bird swings wider on a turn
        // (damped towards the group's own velocity, so nobody trails behind on the straight)
        const damp = 2 * Math.sqrt(mb.k) * 0.9;
        [tx, ty] = pushOut(tx, ty);
        vx[i] += ((tx - px[i]) * mb.k - (vx[i] - Math.cos(g.h) * pace) * damp) * dt;
        vy[i] += ((ty - py[i]) * mb.k - (vy[i] - Math.sin(g.h) * pace) * damp) * dt;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        // and a bird that is over one itself is eased off it within a fraction of a second
        {
          const [ox, oy] = pushOut(px[i], py[i]);
          const k = Math.min(1, dt * 9);
          px[i] += (ox - px[i]) * k;
          py[i] += (oy - py[i]) * k;
        }
        if (vx[i] * vx[i] + vy[i] * vy[i] > 1) heading[i] += angDiff(Math.atan2(vy[i], vx[i]), heading[i]) * Math.min(1, dt * 12);
        flap(i, dt, 12 + (i % 4));
        aBird.set([px[i], py[i], heading[i], phase[i]], i * 4);
        aState[i * 4] = show * (0.7 + 0.3 * g.depth);
        aState[i * 4 + 1] = 1;
        aState[i * 4 + 2] = vary[i] * scale;
        aState[i * 4 + 3] = tone;
      }
    }
    birdAttr.needsUpdate = true;
    stateAttr.needsUpdate = true;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.04));
    last = now;
    const show = Math.max(0, Math.min(1, opts.visibility ? opts.visibility() : 1));
    step(dt, show);
    // nothing to draw: clear once, then leave the GPU alone until they are back
    if (show <= 0) {
      if (!cleared) renderer.render(scene, camera);
      cleared = true;
      return;
    }
    cleared = false;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  let disposed = false;
  return {
    setTheme: (m) => applyMode(m === 'dark' ? 'dark' : 'light'),
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo?.disconnect();
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
