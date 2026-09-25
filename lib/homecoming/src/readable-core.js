// Readable particle heroes: shared engine.
//
// Particles (sand, leaves, birds, fireflies) fly in and form the logo, but wherever they
// have settled the logo is drawn SHARP from the vector outlines at screen resolution, so
// the calligraphy is always crisp. A coarse "settle field" records, per cell, how many of
// the particles that belong there are at home: 1 = draw the sharp logo, 0 = hide it and
// let the moving particles show. The pointer breaks the logo up locally, it heals as the
// particles return.
import * as THREE from 'three';
import { drawLogoCanvas, sampleLogoPoints, prefersReducedMotion } from './logo-shapes.js';

export const EXT = 1.1; // the logo plane covers [-EXT, EXT] in logo units (ring radius = 1)
export const TEXT_LAYERS = ['frame', 'script', 'crown'];
export const GOLD_LAYERS = ['ring', 'diamond'];

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const rgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Logo texture: R = emerald layers, G = gold layers, B = soft blur of all (shadows, bevel, glow). */
export function createLogoTexture(size) {
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, size, size);
  x.globalCompositeOperation = 'lighter';
  x.drawImage(drawLogoCanvas(size, { pad: EXT, color: '#ff0000', layers: TEXT_LAYERS }), 0, 0);
  x.drawImage(drawLogoCanvas(size, { pad: EXT, color: '#00ff00', layers: GOLD_LAYERS }), 0, 0);
  x.drawImage(drawLogoCanvas(size, { pad: EXT, color: '#0000ff', filter: `blur(${Math.max(2, Math.round(size / 160))}px)` }), 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

/** Particle homes spread over the logo. Returns { x, y, layer (id string per particle) }. */
export function logoHomes(n) {
  const p = sampleLogoPoints(n);
  const layer = Array.from(p.layer, (l) => p.layerIds[l]);
  return { x: p.x, y: p.y, layer };
}

/**
 * Per-cell settle field. Grid size is chosen so each cell holds a handful of particles.
 * update(px, py, extra) — extra(i) optional additional displacement (e.g. height)
 */
export function createSettleField(hx, hy, perCell = 5) {
  const N = hx.length;
  const G = Math.max(24, Math.min(160, Math.round(Math.sqrt(N / perCell / 0.33))));
  const cell = new Int32Array(N);
  const homes = new Float32Array(G * G);
  for (let i = 0; i < N; i++) {
    const cx = Math.min(G - 1, Math.max(0, Math.floor(((hx[i] + EXT) / (2 * EXT)) * G)));
    const cy = Math.min(G - 1, Math.max(0, Math.floor(((hy[i] + EXT) / (2 * EXT)) * G)));
    cell[i] = cy * G + cx;
    homes[cell[i]]++;
  }
  const acc = new Float32Array(G * G);
  const solid = new Float32Array(G * G);
  const data = new Uint8Array(G * G);
  const texture = new THREE.DataTexture(data, G, G, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const disp = new Float32Array(N); // 0 = at home … 1 = clearly away

  return {
    G,
    texture,
    disp,
    /** solidity of particle i's home cell (0–1) */
    solidAt: (i) => solid[cell[i]],
    update(px, py, dt, pz = null) {
      acc.fill(0);
      for (let i = 0; i < N; i++) {
        let d = Math.hypot(px[i] - hx[i], py[i] - hy[i]);
        if (pz) d += Math.abs(pz[i]);
        const s = smoothstep(0.02, 0.004, d);
        disp[i] = 1 - s;
        acc[cell[i]] += s;
      }
      const k = 1 - Math.exp(-dt * 9);
      for (let c = 0; c < G * G; c++) {
        if (!homes[c]) continue;
        solid[c] += (smoothstep(0.55, 0.93, acc[c] / homes[c]) - solid[c]) * k;
      }
      // cells without particles (just outside the logo edge) copy their strongest neighbour,
      // so edges neither show a ghost before the intro nor erode at rest
      for (let y = 0; y < G; y++) {
        for (let x = 0; x < G; x++) {
          const c = y * G + x;
          if (homes[c]) continue;
          let m = -1;
          for (let j = -1; j <= 1; j++) {
            for (let i = -1; i <= 1; i++) {
              const xx = x + i;
              const yy = y + j;
              if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue;
              const n = yy * G + xx;
              if (homes[n] && solid[n] > m) m = solid[n];
            }
          }
          solid[c] = m < 0 ? 1 : m;
        }
      }
      for (let c = 0; c < G * G; c++) data[c] = Math.round(solid[c] * 255);
      texture.needsUpdate = true;
    },
    /** force all cells to a value (e.g. 0 before the intro) */
    fill(v) {
      solid.fill(v);
      data.fill(Math.round(v * 255));
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}

/** Shared GLSL for the sharp-logo shaders. */
export const LOGO_PRELUDE = /* glsl */ `
  precision highp float;
  uniform sampler2D uLogo, uSettle;
  uniform float uTime, uUnitPx;
  varying vec2 vUv;
  varying vec2 vP;
  const float EXT = ${EXT.toFixed(2)};
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  // 1 where the particles are home (draw the sharp logo), with a crumbly edge
  float settleAt(vec2 uv, float rough) {
    float s = texture2D(uSettle, uv).r;
    float n = (vnoise(vP * 60.0) - 0.5) * rough;
    return smoothstep(0.38, 0.68, s + n);
  }
  // light from the top-left: > 0 on edges that face it, < 0 on the far edges
  float bevel(vec2 uv) {
    float e = 1.5 / (uUnitPx * 2.0 * EXT);
    float gx = texture2D(uLogo, uv + vec2(e, 0.0)).b - texture2D(uLogo, uv - vec2(e, 0.0)).b;
    float gy = texture2D(uLogo, uv + vec2(0.0, e)).b - texture2D(uLogo, uv - vec2(0.0, e)).b;
    return (gx - gy) / (2.0 * e) / 160.0 * 1.4;
  }
  // combine the logo (colour c, alpha a) with a soft shadow/halo (colour sc, alpha sa) below it
  vec4 over(vec3 c, float a, vec3 sc, float sa) {
    float outA = a + (1.0 - a) * sa;
    return vec4((c * a + sc * sa * (1.0 - a)) / max(outA, 1e-4), outA);
  }
`;

export function createSharpLogo(fragmentShader, uniforms) {
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec2 vP;
      void main() {
        vUv = uv;
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: LOGO_PRELUDE + fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * EXT, 2 * EXT), material);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

/** Full-screen background quad; the shader gets uRes, uUnitPx (device px per logo unit), uOffset (device px). */
export function createBackground(fragmentShader, uniforms) {
  const material = new THREE.ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec2 uRes;
      uniform float uUnitPx, uOffset, uTime;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      vec2 logoP() { return (gl_FragCoord.xy - 0.5 * uRes - vec2(0.0, uOffset)) / uUnitPx; }
    ` + fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Hero shell: renderer, 2D camera in logo units, sizing, pointer, intro, scroll, visibility.
 * spec.setup(ctx) must return { update(dt), resize?(), skipIntro?(), dispose() }.
 * spec.fit = [radius as share of height (landscape), radius as share of width (portrait)]
 */
export function createReadableHero(container, spec, options = {}) {
  const reduced = prefersReducedMotion();
  const small = Math.min(innerWidth, innerHeight) < 700;
  const opts = { autoplay: true, offsetY: 0.03, ...options, colors: { ...spec.colors, ...(options.colors || {}) } };

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const ctx = {
    renderer, scene, camera, reduced, small, opts,
    W: 1, H: 1, pr: 1, logoPx: 200,
    time: 0, introT: -1, scroll: 0,
    pointer: { x: 0, y: 0, vx: 0, vy: 0, on: false, speed: 0 },
    clicks: [],
    shared: { uTime: { value: 0 }, uUnitPx: { value: 200 }, uRes: { value: new THREE.Vector2(1, 1) }, uOffset: { value: 0 } },
    logoTexture: null,
  };

  let texSize = 0;
  function ensureTexture() {
    const want = 2 * EXT * ctx.logoPx * ctx.pr > 1100 ? 2048 : 1024;
    if (want !== texSize) {
      ctx.logoTexture?.dispose();
      ctx.logoTexture = createLogoTexture(want);
      texSize = want;
      hero?.onTexture?.(ctx.logoTexture);
    }
  }

  function resize() {
    ctx.W = container.clientWidth || innerWidth;
    ctx.H = container.clientHeight || innerHeight;
    renderer.setSize(ctx.W, ctx.H, false);
    ctx.pr = renderer.getPixelRatio();
    const [land, port] = spec.fit || [0.36, 0.44];
    ctx.logoPx = ctx.W >= ctx.H * 0.9 ? land * ctx.H : port * ctx.W;
    const u = ctx.logoPx;
    const oy = (ctx.H * opts.offsetY) / u;
    Object.assign(camera, { left: -ctx.W / 2 / u, right: ctx.W / 2 / u, top: ctx.H / 2 / u - oy, bottom: -ctx.H / 2 / u - oy });
    camera.updateProjectionMatrix();
    ctx.shared.uUnitPx.value = u * ctx.pr;
    ctx.shared.uRes.value.set(ctx.W * ctx.pr, ctx.H * ctx.pr);
    ctx.shared.uOffset.value = ctx.H * opts.offsetY * ctx.pr;
    ensureTexture();
    hero?.resize?.();
  }

  // pointer in logo units, with velocity (units per second)
  let lastMoveT = 0;
  function toUnits(e) {
    const r = container.getBoundingClientRect();
    return [
      (e.clientX - r.left - ctx.W / 2) / ctx.logoPx,
      (ctx.H / 2 - (e.clientY - r.top)) / ctx.logoPx + (ctx.H * opts.offsetY) / ctx.logoPx,
      r,
    ];
  }
  function onMove(e) {
    const [x, y, r] = toUnits(e);
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    const now = performance.now();
    const p = ctx.pointer;
    if (p.on) {
      const dt = Math.max(0.008, (now - lastMoveT) / 1000);
      p.vx = p.vx * 0.5 + ((x - p.x) / dt) * 0.5;
      p.vy = p.vy * 0.5 + ((y - p.y) / dt) * 0.5;
    }
    p.x = x;
    p.y = y;
    p.on = true;
    lastMoveT = now;
  }
  function onLeave() {
    ctx.pointer.on = false;
  }
  function onDown(e) {
    const [x, y] = toUnits(e);
    ctx.clicks.push({ x, y });
  }
  addEventListener('pointermove', onMove, { passive: true });
  container.addEventListener('pointerleave', onLeave);
  container.addEventListener('pointerdown', onDown);

  const hero = spec.setup(ctx);
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  io.observe(container);

  const INTRO = spec.introLength || 4;
  let resolveIntro;
  const introDone = new Promise((r) => (resolveIntro = r));
  function playIntro() {
    if (reduced) {
      ctx.introT = INTRO;
      hero.skipIntro?.();
      resolveIntro();
    } else ctx.introT = 0;
    return introDone;
  }

  let raf = 0;
  let last = performance.now();
  function frame(now) {
    if (!visible) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min((now - last) / 1000, opts.maxDt ?? 0.04));
    last = now;
    ctx.time += dt;
    ctx.shared.uTime.value = ctx.time;
    if (ctx.introT >= 0 && ctx.introT < INTRO) {
      ctx.introT += dt;
      if (ctx.introT >= INTRO) resolveIntro();
    }
    const r = container.getBoundingClientRect();
    ctx.scroll = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
    const p = ctx.pointer;
    p.vx *= Math.exp(-dt * 6);
    p.vy *= Math.exp(-dt * 6);
    p.speed = Math.hypot(p.vx, p.vy);
    hero.update(dt);
    ctx.clicks.length = 0;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  if (opts.autoplay) playIntro();

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    ro.disconnect();
    io.disconnect();
    removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerleave', onLeave);
    container.removeEventListener('pointerdown', onDown);
    hero.dispose();
    ctx.logoTexture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  return {
    playIntro,
    introDone,
    seek(t) {
      ctx.introT = t;
    },
    dispose,
  };
}

/** Deterministic scatter direction per particle, used when the hero scrolls away. */
export function scatterVectors(N, seed = 1) {
  const v = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const h = Math.sin((i + 1) * 12.9898 * seed) * 43758.5453;
    const a = (h - Math.floor(h)) * Math.PI * 2;
    const r = 1.5 + ((i * 7919) % 1000) / 400;
    v[i * 2] = Math.cos(a) * r - 1.2;
    v[i * 2 + 1] = Math.sin(a) * r * 0.6 + 0.4;
  }
  return v;
}
