// Shared timeline for the loaders: eases the shown progress toward the real progress,
// then runs hold → finale → exit phases.
export function createLoaderClock({ minDuration = 2.4, hold = 0.3, finale = 0.9, exit = 1.3, startAt = 0 } = {}) {
  let target = startAt;
  let shown = startAt;
  let phase = 'loading';
  let phaseTime = 0;
  const lengths = { hold, finale, exit };
  const next = { hold: 'finale', finale: 'exit', exit: 'done' };

  return {
    set(p) {
      target = Math.max(target, Math.min(1, Math.max(0, p)));
    },
    get shown() {
      return shown;
    },
    get phase() {
      return phase;
    },
    /** Advance by dt seconds. Returns { phase, t (0–1 within the phase), entered (phase just started) }. */
    tick(dt) {
      let entered = false;
      phaseTime += dt;
      if (phase === 'loading') {
        const speed = Math.min(1 / minDuration, (target - shown) * 3 + 0.04);
        shown = Math.min(target, shown + speed * dt);
        if (shown >= 0.9999 && target >= 1) {
          phase = 'hold';
          phaseTime = 0;
          entered = true;
        }
      } else if (phase !== 'done' && phaseTime >= lengths[phase]) {
        phase = next[phase];
        phaseTime = 0;
        entered = true;
      }
      const len = lengths[phase];
      return { phase, t: len ? Math.min(phaseTime / len, 1) : 1, entered };
    },
  };
}

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInCubic = (t) => t * t * t;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export const hexToVec3 = (THREE, h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
