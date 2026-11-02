import { N, HERO } from '../sim.js';
import { Y0, FLOOR_Y, U, tintOf } from '../machine.js';
import { fin } from '../flow.js';
import { camSet, tag, topShade, WHITE, RED_L, GREEN_L } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
const P0 = B(32), P1 = 72.1, P2 = 75.7, P3 = B(40);
const top = new Uint8Array(N); for (let i = 0; i < N; i++) if (fin.l[i] > 0) top[i] = 1;
const G = fin.order[0], gx = fin.x[G], gr = fin.r[G];
function night(pp) { pp.vig = .4; pp.threshold = 1.1; pp.bloom = .13; pp.grain = .02; pp.lift = [0, 0, 0]; pp.sat = 1.16; pp.exposure = 1.25; }
export function plainBalls(balls, t, dimRest = 0, only = -1) { for (let i = 0; i < N; i++) { const r0 = fin.r[i], c = tintOf(fin.l[i]), off = only >= 0 ? i !== only : !top[i], d = dimRest && off ? 1 - dimRest * .93 : 1; balls.set(i, fin.x[i], FLOOR_Y + r0, fin.z[i], r0, c[0] * d, c[1] * d, c[2] * d, Math.max(c[3], dimRest && off ? 1 : 0)); } balls.commit(N); }
export function plainShots(c) {
  const { scene, balls, cam, plate, pegs, floor } = c;
  const base = (key = .09, strip = 2, fill = .7) => { c.setRoom(key, Math.max(key * .4, .012), strip); c.show({ plate: 1, pegs: 1, balls: 1, ballShadow: 0, mirror: 1, fill, only: [floor] }); pegs.setF(1); plate.material.uniforms.uLine.value = 0; };
  return [
    { a: P1, scene, samples: 12, subDark: .7,
      update(t, l, pp) { base(.1, 2, .3); night(pp); plainBalls(balls, t); const k = seg(t, P1, P2); camSet(cam, [gx - 7 - k * 3, FLOOR_Y + 2.6, gr * 3.4 + 9], [gx - 1.4, FLOOR_Y + gr * .85, 1], 34); return cam; } },
    { a: P2, scene, samples: 14, subDark: .7,
      update(t, l, pp) { base(.16, 2, .7); night(pp); pp.exposure = 1.2; plainBalls(balls, t, .85, HERO); const hx = fin.x[HERO], hz = fin.z[HERO], k = seg(t, P2, P3); camSet(cam, [hx - .12, FLOOR_Y + .06, hz + .36 - k * .08], [hx, FLOOR_Y + .018, hz], 22); pp.aperture = .002; pp.focus = .34; return cam; },
      label(x, t) { const a = ss(78.6, 79, t); if (a > 0) tag(x, '¥0.06', W / 2, 320 * UI, { size: 210, color: GREEN_L, weight: 900, alpha: a, shadow: 24 }); } },
  ];
}
