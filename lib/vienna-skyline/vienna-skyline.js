/**
 * Vienna Skyline – animated Three.js footer header  (v4)
 * ------------------------------------------------------
 * Vector line-art skyline (razor sharp at any size), rotating Riesenrad,
 * flapping birds, drifting clouds, shimmering Danube and a draw-in reveal.
 * Colour follows your website's main colour automatically.
 *
 *   import { createViennaSkyline } from './vienna-skyline.js';
 *   const skyline = createViennaSkyline(document.querySelector('#footer-skyline'), {
 *     color: 'var(--primary-color)',    // any CSS colour / variable, or 'auto'
 *   });
 *   // skyline.destroy() when unmounting (React/SPA)
 */
import * as THREE from 'three';
import { BASE_SVG, WATER_SVG } from './vienna-skyline-art.js';

// ---- Scene geometry (world units = source-artwork pixels, y-up) -----------
const W = 2172;          // artwork width
const BASE_H = 416;      // skyline layer height
const WATER_H = 74;      // water layer height
const WHEEL = { x: 1442.5, y: 185.5 }; // Riesenrad hub
const GROUND_Y = 78;     // centre of the ground line
const GROUND_L = 18, GROUND_R = 2154; // where the drawn ground line ends

const DEFAULTS = {
  color: 'auto',            // '#1e88e5' | 'var(--brand)' | 'auto' (reads your CSS variables)
  fallbackColor: '#2fcb76',
  watchColor: true,         // follow live colour changes (e.g. dark-mode / theme switch)
  skyPadding: 70,           // sky above the tallest spire (world px)
  minHeight: 150,           // CSS px – on phones the sides get cropped instead of shrinking
  maxHeight: 420,           // CSS px – on big screens the art stops growing, ground + water extend
  birds: 13,
  clouds: 4,
  wheelSpeed: 0.06,         // radians per second
  reveal: true,             // draw-in animation when first scrolled into view
  interactive: true,        // birds dodge the pointer
  maxPixelRatio: 2,
};

// CSS variables checked (in this order) when color === 'auto'
const AUTO_VARS = [
  '--skyline-color', '--primary-color', '--color-primary', '--primary', '--main-color',
  '--brand-color', '--color-brand', '--brand', '--accent-color', '--accent', '--theme-color',
];

export function createViennaSkyline(container, userOpts = {}) {
  const o = { ...DEFAULTS, ...userOpts };
  const H = BASE_H + WATER_H + o.skyPadding;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let colorHex = resolveColor(o.color, container, o.fallbackColor);

  // ---- Renderer / camera ---------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  // Canvas is absolutely positioned and the container height is pure CSS,
  // so JS only READS layout → no ResizeObserver / layout loops.
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', display: 'block' });
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Animated Vienna skyline with Riesenrad and flying birds');
  const prevStyle = container.getAttribute('style');
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  Object.assign(container.style, {
    width: '100%', aspectRatio: `${W} / ${H}`,
    minHeight: o.minHeight + 'px', maxHeight: o.maxHeight + 'px',
    overflow: 'hidden', lineHeight: '0',
  });
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
  const view = { left: 0, right: W, scale: 1 };

  const uniforms = {
    uTime: { value: 0 },
    uReveal: { value: o.reveal && !reduceMotion ? 0 : 1 },
    uViewL: { value: 0 },
    uViewW: { value: W },
    uGlow: { value: new THREE.Vector3(...hexToRGB(colorHex)) },
  };
  let visible = false, raf = 0, stillRaf = 0, last = 0, t = 0, revealStart = -1, ready = false;
  let cssW = 0, cssH = 0;

  const lineMat = () => new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, depthTest: false, depthWrite: false });

  // ---- Clouds --------------------------------------------------------------
  const clouds = [];
  for (let i = 0; i < o.clouds; i++) {
    const tex = cloudTexture(rand(120, 220), i);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(tex.userData.w, tex.userData.h), lineMat());
    mesh.material.map = tex;
    mesh.position.set(rand(0, W), rand(H - 190, H - 90), 0);
    mesh.renderOrder = 0;
    mesh.userData = { speed: rand(4, 10), targetOpacity: rand(0.22, 0.4) };
    scene.add(mesh);
    clouds.push(mesh);
  }

  // ---- Riesenrad (drawn behind the skyline so the trees overlap it) --------
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL.x, WHEEL.y, 0);
  scene.add(wheel);

  const rotorTex = rotorTexture();
  const rotor = new THREE.Mesh(new THREE.PlaneGeometry(rotorTex.userData.size, rotorTex.userData.size), lineMat());
  rotor.material.map = rotorTex;
  rotor.renderOrder = 1;
  wheel.add(rotor);

  const cabinTex = cabinTexture();
  const cabins = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), lineMat());
    c.material.map = cabinTex;
    c.renderOrder = 2;
    c.userData.a = (i / 16) * Math.PI * 2;
    wheel.add(c);
    cabins.push(c);
  }

  const frameTex = frameTexture();
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(frameTex.userData.w, frameTex.userData.h), lineMat());
  frame.material.map = frameTex;
  frame.renderOrder = 3;
  frame.position.set(frameTex.userData.cx, frameTex.userData.cy, 0);
  scene.add(frame);
  const wheelMats = [rotor.material, frame.material, ...cabins.map((c) => c.material)];

  // ---- Skyline + water: vector SVG rasterised at the exact screen resolution
  const baseCanvas = document.createElement('canvas');
  const waterCanvas = document.createElement('canvas');
  const baseTex = new THREE.CanvasTexture(baseCanvas);
  const waterTex = new THREE.CanvasTexture(waterCanvas);
  for (const tx of [baseTex, waterTex]) {
    tx.colorSpace = THREE.NoColorSpace;
    tx.generateMipmaps = false;
    tx.minFilter = THREE.LinearFilter;
    tx.magFilter = THREE.LinearFilter;
  }
  waterTex.wrapS = THREE.MirroredRepeatWrapping;

  const vert = /* glsl */`
    varying vec2 vUv; varying float vX;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vX = wp.x;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const revealGLSL = /* glsl */`
    uniform float uReveal; uniform float uViewL; uniform float uViewW;
    float revealX(float x){ return clamp((x - uViewL) / uViewW, 0.0, 1.0); }`;

  const baseMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uMap: { value: baseTex }, uReveal: uniforms.uReveal, uViewL: uniforms.uViewL, uViewW: uniforms.uViewW, uGlow: uniforms.uGlow },
    vertexShader: vert,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec3 uGlow;
      ${revealGLSL}
      varying vec2 vUv; varying float vX;
      void main(){
        vec4 c = texture2D(uMap, vUv);
        float x = revealX(vX) + (1.0 - vUv.y) * 0.03;
        float edge = uReveal * 1.15 - 0.075;
        float vis = 1.0 - smoothstep(edge - 0.035, edge + 0.035, x);
        float pen = smoothstep(0.07, 0.0, abs(x - edge)) * step(uReveal, 0.999);
        vec3 rgb = mix(c.rgb, min(uGlow * 1.25, 1.0), pen * 0.6);
        gl_FragColor = vec4(rgb, c.a * vis);
      }`,
  });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(W, BASE_H), baseMat);
  base.position.set(W / 2, WATER_H + BASE_H / 2, 0);
  base.renderOrder = 4;
  scene.add(base);

  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uMap: { value: waterTex }, uTime: uniforms.uTime, uReveal: uniforms.uReveal, uViewL: uniforms.uViewL, uViewW: uniforms.uViewW },
    vertexShader: vert,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform float uTime;
      ${revealGLSL}
      varying vec2 vUv; varying float vX;
      void main(){
        vec2 uv = vUv;
        float row = floor(uv.y * 18.0);
        uv.x += sin(uTime * 0.6 + row * 1.7) * 0.006 + sin(uTime * 1.3 + vX * 0.004 + row) * 0.0015;
        vec4 c = texture2D(uMap, uv);
        float shimmer = 0.62 + 0.38 * sin(vX * 0.025 - uTime * 1.6 + row * 2.3);
        float vis = 1.0 - smoothstep(uReveal * 1.15 - 0.11, uReveal * 1.15 - 0.04, revealX(vX));
        gl_FragColor = vec4(c.rgb, c.a * shimmer * vis);
      }`,
  });
  // centre tile + mirrored tiles left/right so the river continues on wide screens
  const waterTiles = [-1, 0, 1].map((k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, WATER_H), waterMat);
    m.position.set(W / 2 + k * W, WATER_H / 2, 0);
    if (k !== 0) m.scale.x = -1;
    m.renderOrder = 4;
    scene.add(m);
    return m;
  });

  // ground line continuation for screens wider than the artwork
  const groundMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const groundL = new THREE.Mesh(new THREE.PlaneGeometry(1, 3.6), groundMat);
  const groundR = new THREE.Mesh(new THREE.PlaneGeometry(1, 3.6), groundMat.clone());
  for (const g of [groundL, groundR]) { g.renderOrder = 4; g.position.y = GROUND_Y; scene.add(g); }

  // ---- Birds (instanced, wings flap in the vertex shader) ------------------
  const birdGeo = birdGeometry(12);
  const flapAttr = new THREE.InstancedBufferAttribute(new Float32Array(o.birds), 1);
  const alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(o.birds), 1);
  birdGeo.setAttribute('iFlap', flapAttr);
  birdGeo.setAttribute('iAlpha', alphaAttr);
  const birdMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Vector3(...hexToRGB(colorHex)) } },
    vertexShader: /* glsl */`
      attribute float aT; attribute float aSide; attribute float aEdge;
      attribute float iFlap; attribute float iAlpha;
      varying float vAlpha;
      void main(){
        float a = iFlap, t = aT;
        float x = aSide * t * (1.0 - 0.14 * abs(a));
        float y = 0.22 * t - 0.36 * t * t + a * (0.62 * t - 0.14 * t * t);
        y += aEdge * 0.075 * (1.0 - 0.88 * t);
        vAlpha = iAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(x, y, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vAlpha;
      void main(){ gl_FragColor = vec4(uColor, vAlpha); }`,
  });
  const birds = new THREE.InstancedMesh(birdGeo, birdMat, o.birds);
  birds.frustumCulled = false;
  birds.renderOrder = 6;
  scene.add(birds);

  const flockCount = Math.max(1, Math.round(o.birds / 4.5));
  const flocks = [];
  for (let f = 0; f < flockCount; f++) flocks.push({ ...newFlock(), x: ((f + 0.5) / flockCount) * W + rand(-120, 120) });
  const birdState = [];
  for (let i = 0; i < o.birds; i++) birdState.push(newBird(flocks[i % flockCount]));

  function newFlock() {
    return { dir: Math.random() < 0.5 ? 1 : -1, x: 0, y: rand(GROUND_Y + 190, H - 70), speed: rand(38, 62), drift: rand(-6, 6), depth: rand(0.7, 1.15) };
  }
  function newBird(flock) {
    const k = flock.depth;
    return {
      flock, ox: rand(-90, 90), oy: rand(-35, 35), x: 0, y: 0,
      size: rand(20, 30) * k, phase: Math.random() * Math.PI * 2, freq: rand(2.6, 3.8),
      amp: 1, targetAmp: 1, modeT: rand(0.5, 3), bob: Math.random() * 10, dodgeX: 0, dodgeY: 0, alpha: 0.85 * k,
    };
  }

  // ---- Pointer interaction -------------------------------------------------
  const pointer = { x: -9999, y: -9999, active: false };
  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = view.left + ((e.clientX - r.left) / r.width) * (view.right - view.left);
    pointer.y = H - ((e.clientY - r.top) / r.height) * H;
    pointer.active = true;
    wake();
  }
  function onPointerLeave() { pointer.active = false; }
  if (o.interactive) {
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
  }

  // ---- Artwork (bundled in vienna-skyline-art.js – nothing to fetch) ------
  const svgBase = BASE_SVG, svgWater = WATER_SVG;
  let destroyed = false;

  let rasterK = 0, rasterColor = null, rasterBusy = false, rasterAgain = false;
  async function rasterize(force = false) {
    if (!svgBase || destroyed) return;
    if (rasterBusy) { rasterAgain = true; return; }
    const maxTex = Math.min(renderer.capabilities.maxTextureSize, 8192);
    const need = Math.min(view.scale * renderer.getPixelRatio(), maxTex / W);
    const k = Math.ceil(need * 4) / 4; // quantise → fewer re-rasters while resizing
    if (!force && rasterColor === colorHex && k <= rasterK && k > rasterK * 0.6) return;
    rasterBusy = true;
    try {
      const color = colorHex;
      const [ib, iw] = await Promise.all([svgToImage(recolor(svgBase, color)), svgToImage(recolor(svgWater, color))]);
      if (destroyed) return;
      drawTo(baseCanvas, baseTex, ib, Math.round(W * k), Math.round(BASE_H * k));
      drawTo(waterCanvas, waterTex, iw, Math.round(W * k), Math.round(WATER_H * k));
      rasterK = k; rasterColor = color;
      if (!ready) { ready = true; wake(); }
      requestRender();
    } catch (e) {
      console.error('[vienna-skyline] could not draw the skyline artwork', e);
    } finally {
      rasterBusy = false;
      if (rasterAgain) { rasterAgain = false; rasterize(); }
    }
  }
  function drawTo(cv, tex, img, w, h) {
    const resized = cv.width !== w || cv.height !== h;
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    if (resized) tex.dispose();
    tex.needsUpdate = true;
  }

  // ---- Colour --------------------------------------------------------------
  function applyColor(hex) {
    colorHex = hex;
    for (const m of [...wheelMats, groundL.material, groundR.material, ...clouds.map((c) => c.material)]) m.color.set(hex);
    birdMat.uniforms.uColor.value.set(...hexToRGB(hex));
    uniforms.uGlow.value.set(...hexToRGB(hex));
    rasterize(true);
    requestRender();
  }
  let colorCheckT = 0;

  // ---- Layout --------------------------------------------------------------
  function resize() {
    resizeRaf = 0;
    const newW = container.clientWidth || window.innerWidth;
    const newH = container.clientHeight || Math.round(newW * (H / W));
    if (newW === cssW && newH === cssH) return;
    cssW = newW; cssH = newH;
    renderer.setSize(cssW, cssH, false);
    // The full height is always visible (top never cut). Wider screens show more
    // on the sides, narrow screens crop the sides.
    const s = cssH / H;
    const vw = cssW / s;
    view.scale = s; view.left = W / 2 - vw / 2; view.right = W / 2 + vw / 2;
    camera.left = view.left; camera.right = view.right; camera.top = H; camera.bottom = 0;
    camera.updateProjectionMatrix();
    uniforms.uViewL.value = Math.max(view.left, 0) ; uniforms.uViewW.value = Math.min(view.right, W) - Math.max(view.left, 0);
    // extend the ground line beyond the artwork
    const lw = GROUND_L - view.left, rw = view.right - GROUND_R;
    groundL.visible = lw > 0; groundR.visible = rw > 0;
    if (lw > 0) { groundL.scale.x = lw + 2; groundL.position.x = view.left + lw / 2 + 1; }
    if (rw > 0) { groundR.scale.x = rw + 2; groundR.position.x = GROUND_R + rw / 2 - 1; }
    rasterize();
    requestRender();
  }
  let resizeRaf = 0;
  const onResize = () => { if (!resizeRaf) resizeRaf = requestAnimationFrame(resize); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  resize();
  requestAnimationFrame(resize);

  // ---- Loop ----------------------------------------------------------------
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);

  function update(dt) {
    t += dt;
    uniforms.uTime.value = t;

    if (o.watchColor) {
      colorCheckT += dt;
      if (colorCheckT > 1) {
        colorCheckT = 0;
        const c = resolveColor(o.color, container, o.fallbackColor);
        if (c !== colorHex) applyColor(c);
      }
    }

    // reveal (waits until the vector art is rasterised)
    if (ready && uniforms.uReveal.value < 1) {
      if (revealStart < 0) revealStart = t;
      uniforms.uReveal.value = easeInOut(Math.min(1, (t - revealStart) / 2.6));
    }
    const rv = ready ? uniforms.uReveal.value : 0;
    const wheelVis = smooth(0.55, 0.8, rv);
    for (const m of wheelMats) m.opacity = wheelVis;
    groundL.material.opacity = 0.92 * smooth(0.0, 0.1, rv);
    groundR.material.opacity = 0.92 * smooth(0.9, 1.0, rv);
    const cloudVis = smooth(0.2, 1.0, rv);

    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      const half = c.geometry.parameters.width / 2;
      if (c.position.x - half > view.right + 50) c.position.x = view.left - 50 - half;
      c.material.opacity = c.userData.targetOpacity * cloudVis;
    }

    rotor.rotation.z -= o.wheelSpeed * dt;
    const rot = rotor.rotation.z;
    for (const c of cabins) {
      const a = c.userData.a + rot;
      c.position.set(Math.cos(a) * 100, Math.sin(a) * 100, 0);
      c.rotation.z = Math.sin(t * 1.3 + c.userData.a * 3) * 0.05;
    }

    for (const f of flocks) {
      f.x += f.dir * f.speed * dt;
      f.y += f.drift * dt;
      if (f.y < GROUND_Y + 170 || f.y > H - 50) f.drift *= -1;
      const off = f.dir > 0 ? f.x > view.right + 160 : f.x < view.left - 160;
      if (off) {
        const dir = -f.dir;
        Object.assign(f, newFlock(), { dir, x: dir < 0 ? view.right + 100 + rand(0, 600) : view.left - 100 - rand(0, 600) });
      }
    }
    const birdVis = smooth(0.4, 1.0, rv);
    for (let i = 0; i < birdState.length; i++) {
      const b = birdState[i];
      b.modeT -= dt;
      if (b.modeT <= 0) {
        const glide = Math.random() < 0.35;
        b.targetAmp = glide ? 0.12 : 1;
        b.modeT = glide ? rand(0.8, 2.2) : rand(1.2, 3.5);
      }
      let freq = b.freq;
      if (pointer.active) {
        const dx = b.x - pointer.x, dy = b.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150) {
          const d = Math.sqrt(d2) || 1, push = (1 - d / 150) * 240;
          b.dodgeX += (dx / d) * push * dt;
          b.dodgeY += (dy / d) * push * dt + 60 * dt;
          b.targetAmp = 1; freq *= 1.9; b.modeT = Math.max(b.modeT, 0.6);
        }
      }
      b.dodgeX *= 1 - Math.min(1, dt * 0.5);
      b.dodgeY *= 1 - Math.min(1, dt * 0.5);
      b.amp += (b.targetAmp - b.amp) * Math.min(1, dt * 3);
      b.phase += dt * freq * Math.PI * 2 * (0.35 + 0.65 * b.amp);

      const f = b.flock;
      b.bob += dt;
      const nx = f.x + b.ox + b.dodgeX;
      const ny = f.y + b.oy + b.dodgeY + Math.sin(b.bob * 0.9 + i) * 6 - Math.sin(b.phase) * b.amp * 1.2;
      const vy = (ny - b.y) / Math.max(dt, 1e-3);
      b.x = nx; b.y = ny;

      flapAttr.array[i] = Math.sin(b.phase) * b.amp + (1 - b.amp) * 0.18;
      alphaAttr.array[i] = b.alpha * birdVis;
      pos.set(b.x, b.y, 0);
      q.setFromAxisAngle(zAxis, THREE.MathUtils.clamp(vy * 0.004, -0.25, 0.25) * f.dir);
      scl.set(b.size, b.size, 1);
      m4.compose(pos, q, scl);
      birds.setMatrixAt(i, m4);
    }
    birds.instanceMatrix.needsUpdate = true;
    flapAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  function frame_(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (visible && !document.hidden && !reduceMotion) raf = requestAnimationFrame(frame_);
  }
  function wake() {
    if (!raf && visible && !document.hidden && !reduceMotion) { last = 0; raf = requestAnimationFrame(frame_); }
  }
  // CHANGED FOR THIS SITE: the still render waits for the next frame.
  // It used to run inline, and `resize()` is called further up the module,
  // before the loop's own `const`s exist — so under prefers-reduced-motion
  // the very first call reached `update()` too early and threw a temporal
  // dead zone ReferenceError straight out of createViennaSkyline. The caller
  // reads that as "no WebGL" and the city was never drawn at all for anyone
  // who asks for less motion. A frame later everything is defined, and one
  // frame is still not an animation.
  function stillRender() { stillRaf = 0; update(0.016); renderer.render(scene, camera); }
  function requestRender() {
    if (reduceMotion) {
      uniforms.uReveal.value = 1;
      if (!stillRaf) stillRaf = requestAnimationFrame(stillRender);
      return;
    }
    if (!raf) raf = requestAnimationFrame(frame_);
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }, { rootMargin: '100px' });
  io.observe(container);
  const onVis = () => wake();
  document.addEventListener('visibilitychange', onVis);
  // reduced motion: still follow theme changes
  const colorTimer = reduceMotion && o.watchColor ? setInterval(() => {
    const c = resolveColor(o.color, container, o.fallbackColor);
    if (c !== colorHex) applyColor(c);
  }, 1000) : 0;

  // ---- Public API ----------------------------------------------------------
  return {
    replay() { uniforms.uReveal.value = 0; revealStart = -1; wake(); },
    /** any CSS colour: '#e63946', 'rgb(...)', 'var(--brand)', or 'auto' */
    setColor(value) { o.color = value; applyColor(resolveColor(value, container, o.fallbackColor)); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf); cancelAnimationFrame(resizeRaf); cancelAnimationFrame(stillRaf); clearInterval(colorTimer);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) { obj.material.map?.dispose(); obj.material.dispose(); }
      });
      baseTex.dispose(); waterTex.dispose();
      renderer.dispose();
      canvas.remove();
      if (prevStyle === null) container.removeAttribute('style'); else container.setAttribute('style', prevStyle);
    },
  };
}

// ============================================================================
// Colour helpers
// ============================================================================
let _cctx = null;
function resolveColor(input, el, fallback) {
  let v = input;
  if (!v || v === 'auto') {
    v = null;
    const cs = getComputedStyle(el);
    for (const name of AUTO_VARS) { const x = cs.getPropertyValue(name).trim(); if (x) { v = x; break; } }
    if (!v) return fallback;
  }
  // let the browser resolve var(), hsl(), oklch(), named colours …
  const probe = document.createElement('i');
  probe.style.display = 'none';
  probe.style.color = v;
  if (!probe.style.color) return fallback;
  el.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  // …then normalise to hex through a 1×1 canvas (handles every colour syntax)
  if (!_cctx) { const c = document.createElement('canvas'); c.width = c.height = 1; _cctx = c.getContext('2d', { willReadFrequently: true }); }
  _cctx.clearRect(0, 0, 1, 1);
  _cctx.fillStyle = '#000'; _cctx.fillStyle = computed;
  _cctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = _cctx.getImageData(0, 0, 1, 1).data;
  if (a === 0) return fallback;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function recolor(svg, hex) { return svg.replace(/color="[^"]*"/, `color="${hex}"`); }
// Load the SVG as an image: data: URL first (allowed by most Content-Security-Policies),
// blob: URL as fallback.
function svgToImage(text) {
  const load = (src, cleanup = () => {}) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { cleanup(); res(img); };
    img.onerror = () => { cleanup(); rej(new Error('svg image failed')); };
    img.src = src;
  });
  return load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text)).catch(() => {
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    return load(url, () => URL.revokeObjectURL(url));
  });
}

// ============================================================================
// Procedural textures (drawn white, tinted by material colour)
// ============================================================================
const K = 5; // canvas px per world px

function canvasTex(wWorld, hWorld, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(wWorld * K); c.height = Math.ceil(hWorld * K);
  const ctx = c.getContext('2d');
  ctx.scale(K, K);
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineCap = ctx.lineJoin = 'round';
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function rotorTexture() {
  const size = 200, c = size / 2;
  const tex = canvasTex(size, size, (ctx) => {
    ctx.translate(c, c);
    ring(ctx, 90, 2.6);
    ring(ctx, 84.5, 1.6);
    const spokes = 24;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2, a2 = a + Math.PI / spokes, a3 = a + (2 * Math.PI) / spokes;
      ctx.lineWidth = 1.2;
      line(ctx, Math.cos(a) * 11, Math.sin(a) * 11, Math.cos(a) * 84.5, Math.sin(a) * 84.5);
      ctx.lineWidth = 0.9;
      line(ctx, Math.cos(a) * 84.5, Math.sin(a) * 84.5, Math.cos(a2) * 90, Math.sin(a2) * 90);
      line(ctx, Math.cos(a2) * 90, Math.sin(a2) * 90, Math.cos(a3) * 84.5, Math.sin(a3) * 84.5);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.lineWidth = 1.4;
      line(ctx, Math.cos(a) * 90, Math.sin(a) * 90, Math.cos(a) * 94, Math.sin(a) * 94);
    }
  });
  tex.userData.size = size;
  return tex;
}

function cabinTexture() {
  return canvasTex(18, 18, (ctx) => {
    ctx.translate(9, 9);
    ctx.lineWidth = 1.3;
    roundRect(ctx, -6, -4, 12, 8.5, 1.8); ctx.stroke();
    ctx.lineWidth = 0.9;
    line(ctx, -6.5, -5.6, 6.5, -5.6);
    line(ctx, -2, -4, -2, 4.5); line(ctx, 2, -4, 2, 4.5);
    line(ctx, -6, 0.5, 6, 0.5);
    ctx.globalAlpha = 0.25; roundRect(ctx, -6, -4, 12, 8.5, 1.8); ctx.fill();
  });
}

function frameTexture() {
  const w = 130, h = 122, x0 = WHEEL.x - 65, yTop = WHEEL.y + 12;
  const L = (wx) => wx - x0, T = (wy) => yTop - wy;
  const hub = [L(WHEEL.x), T(WHEEL.y)], gy = T(GROUND_Y) - 1.5;
  const tex = canvasTex(w, h, (ctx) => {
    for (const [outer, inner] of [[L(1398), L(1410)], [L(1487), L(1475)]]) {
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.moveTo(hub[0] - 3, hub[1]); ctx.lineTo(outer, gy); ctx.lineTo(inner, gy); ctx.lineTo(hub[0] + 3, hub[1]); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 2.2;
      line(ctx, hub[0], hub[1], outer, gy);
      line(ctx, hub[0], hub[1], inner, gy);
      ctx.lineWidth = 0.9;
      for (let k = 0.3; k < 0.95; k += 0.16) {
        line(ctx, hub[0] + (outer - hub[0]) * k, hub[1] + (gy - hub[1]) * k,
          hub[0] + (inner - hub[0]) * (k + 0.08), hub[1] + (gy - hub[1]) * (k + 0.08));
      }
    }
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(hub[0], hub[1], 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hub[0], hub[1], 11.5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.3;
    roundRect(ctx, hub[0] - 10, gy - 6, 20, 6, 1); ctx.stroke();
    line(ctx, hub[0] - 13, gy - 6.5, hub[0] + 13, gy - 6.5);
  });
  tex.userData = { w, h, cx: x0 + w / 2, cy: yTop - h / 2 };
  return tex;
}

function cloudTexture(width, seed) {
  const bumps = [];
  const n = 4 + (seed % 3);
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const r = width * (0.1 + 0.1 * Math.sin(u * Math.PI)) * rand(0.85, 1.15);
    maxR = Math.max(maxR, r);
    bumps.push([width * (0.12 + u * 0.76), 0, r]);
  }
  const h = maxR * 1.9 + 12;
  for (const b of bumps) b[1] = h - 6 - b[2] * 0.9;
  const tex = canvasTex(width, h, (ctx) => {
    ctx.lineWidth = 1.6;
    for (const [x, y, r] of bumps) { ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.stroke(); }
    ctx.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of bumps) { ctx.beginPath(); ctx.arc(x, y, r - 0.9, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    line(ctx, bumps[0][0] - bumps[0][2], h - 6, bumps[n - 1][0] + bumps[n - 1][2], h - 6);
  });
  tex.userData.w = width; tex.userData.h = h;
  return tex;
}

function birdGeometry(seg) {
  const pos = [], aT = [], aSide = [], aEdge = [], idx = [];
  for (const side of [-1, 1]) {
    const start = aT.length;
    for (let i = 0; i <= seg; i++) for (const e of [-1, 1]) { pos.push(0, 0, 0); aT.push(i / seg); aSide.push(side); aEdge.push(e); }
    for (let i = 0; i < seg; i++) { const a = start + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(aEdge, 1));
  g.setIndex(idx);
  return g;
}

// ---- helpers ---------------------------------------------------------------
function ring(ctx, r, lw) { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function rand(a, b) { return a + Math.random() * (b - a); }
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function hexToRGB(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
