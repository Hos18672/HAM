// Shared helpers: turn the traced logo paths into Three.js shapes or particle targets.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { LOGO_LAYERS, LOGO_CENTER, LOGO_RADIUS } from './logo-data.js';

export { LOGO_LAYERS };

/** Matrix that maps logo pixel space (y-down) to a unit circle centred at 0 (y-up).
 *  z is flipped as well so the transform stays a proper rotation and face winding survives. */
export function logoToUnitMatrix() {
  const s = 1 / LOGO_RADIUS;
  return new THREE.Matrix4()
    .makeScale(s, -s, -s)
    .multiply(new THREE.Matrix4().makeTranslation(-LOGO_CENTER[0], -LOGO_CENTER[1], 0));
}

/** Returns [{ id, shapes: THREE.Shape[] }] ordered back → front. Shapes are in pixel space. */
export function getLogoShapeLayers() {
  const loader = new SVGLoader();
  return LOGO_LAYERS.map((layer) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${layer.d}"/></svg>`;
    // three r185+ moved SVG hole detection into ShapePath.toShapes()
    const toShapes = (p) => (Number(THREE.REVISION) >= 185 ? p.toShapes() : SVGLoader.createShapes(p));
    const shapes = loader.parse(svg).paths.flatMap(toShapes);
    return { id: layer.id, shapes };
  });
}

/**
 * Sample points uniformly inside the logo.
 * Returns { x, y, layer } typed arrays; x/y are normalised (ring radius = 1, y-up).
 */
export function sampleLogoPoints(count, resolution = 900) {
  const res = resolution;
  const scale = res / 640;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = res;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const layers = LOGO_LAYERS.map((layer) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, res, res);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fill(new Path2D(layer.d), 'nonzero');
    const data = ctx.getImageData(0, 0, res, res).data;
    let n = 0;
    const idx = new Uint32Array(res * res);
    for (let i = 0; i < res * res; i++) if (data[i * 4 + 3] > 127) idx[n++] = i;
    return { id: layer.id, idx: idx.subarray(0, n) };
  });

  const totalArea = layers.reduce((a, l) => a + l.idx.length, 0);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const layer = new Uint8Array(count);
  let k = 0;
  layers.forEach((l, li) => {
    const n = li === layers.length - 1 ? count - k : Math.round((count * l.idx.length) / totalArea);
    for (let j = 0; j < n && k < count; j++, k++) {
      const p = l.idx[(Math.random() * l.idx.length) | 0];
      const px = ((p % res) + Math.random()) / scale;
      const py = (Math.floor(p / res) + Math.random()) / scale;
      x[k] = (px - LOGO_CENTER[0]) / LOGO_RADIUS;
      y[k] = -(py - LOGO_CENTER[1]) / LOGO_RADIUS;
      layer[k] = li;
    }
  });
  return { x, y, layer, layerIds: layers.map((l) => l.id) };
}

export const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Draw the logo onto a square canvas. The canvas spans logo units [-pad, pad] on both axes
 * (ring radius = 1), so uv = 0.5 + xy / (2 * pad) in a shader.
 * @param {number} size  canvas size in px
 * @param {object} [o]
 * @param {string[]} [o.layers]  layer ids to draw (default: all)
 * @param {'fill'|'stroke'} [o.mode='fill']
 * @param {number} [o.lineWidth]  stroke width in logo pixels (640-space)
 * @param {string} [o.color='#fff']
 * @param {string} [o.background]  fill the canvas first
 * @param {string} [o.filter]  canvas filter, e.g. 'blur(8px)'
 */
export function drawLogoCanvas(size, o = {}) {
  const pad = o.pad ?? 1.05;
  const canvas = o.canvas || document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: !!o.readback });
  if (o.background) {
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, size, size);
  }
  const s = size / (2 * pad * LOGO_RADIUS);
  ctx.setTransform(s, 0, 0, s, size / 2 - LOGO_CENTER[0] * s, size / 2 - LOGO_CENTER[1] * s);
  if (o.filter) ctx.filter = o.filter;
  for (const layer of LOGO_LAYERS) {
    if (o.layers && !o.layers.includes(layer.id)) continue;
    const path = new Path2D(layer.d);
    if (o.mode === 'stroke') {
      ctx.strokeStyle = o.color || '#fff';
      ctx.lineWidth = o.lineWidth ?? 2;
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    } else {
      ctx.fillStyle = o.color || '#fff';
      ctx.fill(path, 'nonzero');
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  return canvas;
}

/** Pack up to 4 grayscale canvases (same size) into one RGBA texture. */
export function packChannels(size, canvases) {
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const octx = out.getContext('2d');
  const img = octx.createImageData(size, size);
  canvases.forEach((c, ch) => {
    if (!c) return;
    const d = c.getContext('2d').getImageData(0, 0, size, size).data;
    for (let i = 0; i < size * size; i++) img.data[i * 4 + ch] = d[i * 4 + 3];
  });
  if (!canvases[3]) for (let i = 0; i < size * size; i++) img.data[i * 4 + 3] = 255;
  octx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** Fit helper: world units visible vertically so the logo (diameter 2) takes `frac` of the short side. */
export function fitViewHeight(aspect, fracLandscape = 0.56, fracPortrait = 0.78) {
  return aspect >= 1 ? 2 / fracLandscape : 2 / fracPortrait / aspect;
}

/**
 * Sample every outline of the logo as a polyline (for pen / neon / stroke effects).
 * Returns [{ layer, pts: Float32Array [x0,y0,x1,y1,…] in logo units (y up), length }].
 * @param {number} step  sample spacing in 640-space pixels
 */
export function sampleLogoContours(step = 1.6, minLength = 12) {
  const out = [];
  const num = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  for (const layer of LOGO_LAYERS) {
    for (const sub of layer.d.match(/M[^M]+/g) || []) {
      // flatten M / L / C / Z into a dense polyline (640-space)
      const poly = [];
      let x = 0;
      let y = 0;
      for (const [, cmd, args] of sub.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
        const n = (args.match(num) || []).map(Number);
        if (cmd === 'M' || cmd === 'L') {
          for (let i = 0; i + 1 < n.length; i += 2) poly.push((x = n[i]), (y = n[i + 1]));
        } else if (cmd === 'C') {
          for (let i = 0; i + 5 < n.length; i += 6) {
            const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6);
            const steps = Math.max(2, Math.ceil((Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / 2));
            for (let k = 1; k <= steps; k++) {
              const t = k / steps;
              const u = 1 - t;
              poly.push(
                u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
              );
            }
            x = x3;
            y = y3;
          }
        } else if (cmd === 'Z' && poly.length >= 2) {
          poly.push(poly[0], poly[1]);
        }
      }
      // resample evenly by arc length
      const cum = [0];
      for (let i = 2; i < poly.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(poly[i] - poly[i - 2], poly[i + 1] - poly[i - 1]));
      const len = cum[cum.length - 1];
      if (len < minLength) continue;
      const count = Math.max(8, Math.ceil(len / step));
      const pts = new Float32Array((count + 1) * 2);
      let j = 0;
      for (let i = 0; i <= count; i++) {
        const target = (i / count) * len;
        while (j < cum.length - 2 && cum[j + 1] < target) j++;
        const seg = cum[j + 1] - cum[j] || 1;
        const f = Math.min(1, Math.max(0, (target - cum[j]) / seg));
        const px = poly[j * 2] + (poly[j * 2 + 2] - poly[j * 2]) * f;
        const py = poly[j * 2 + 1] + (poly[j * 2 + 3] - poly[j * 2 + 1]) * f;
        pts[i * 2] = (px - LOGO_CENTER[0]) / LOGO_RADIUS;
        pts[i * 2 + 1] = -(py - LOGO_CENTER[1]) / LOGO_RADIUS;
      }
      out.push({ layer: layer.id, pts, length: len / LOGO_RADIUS });
    }
  }
  return out;
}

/** Logo radius in CSS px for a full-screen loader (matches the other loaders). */
export const loaderLogoRadius = (w, h) => (w >= h ? 0.28 * h : 0.39 * w);

/** Returns (x, y) → coverage 0–1 of the given layers at a point in logo units. */
export function createLogoSampler(size = 800, layers = null, pad = 1.08) {
  const c = drawLogoCanvas(size, { pad, layers, readback: true });
  const d = c.getContext('2d').getImageData(0, 0, size, size).data;
  return (x, y) => {
    const u = Math.floor((0.5 + x / (2 * pad)) * size);
    const v = Math.floor((0.5 - y / (2 * pad)) * size);
    if (u < 0 || v < 0 || u >= size || v >= size) return 0;
    return d[(v * size + u) * 4 + 3] / 255;
  };
}
