import { N, R, HERO, RICH } from '../sim.js';
import { Y0, DY, R0, FLOOR_Y, U, tintOf, radiusOf, moneyFmt } from '../machine.js';
import { fin, S1, flowRun } from '../flow.js';
import { camSet, proj, tag, topShade, pxPerUnit, WHITE, RED_L, GREEN_L } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E, rng } from '../core.js';
import { B } from '../script.js';

const P0 = B(40), P1 = 86.7, P2 = 89.7, P3 = 93.7, P4 = B(48), P5 = B(49.3);
const GRID = { s: 1.2 }, RM = radiusOf(Math.log(S1[100].mean / 10000));
const gx = i => ((i % 100) - 49.5) * GRID.s, gz = i => (Math.floor(i / 100)) * GRID.s + 1.2;
const top = new Uint8Array(N); for (let i = 0; i < N; i++) if (10000 * Math.exp(fin.l[i]) > S1[100].mean) top[i] = 1;

function night(pp) { pp.vig = .4; pp.threshold = 1.1; pp.bloom = .13; pp.grain = .02; pp.lift = [0, 0, 0]; pp.sat = 1.16; }
export function plainBalls(balls, t, eq = 0, dimRest = 0, only = -1) {
  const red = tintOf(6);
  for (let i = 0; i < N; i++) {
    const r0 = fin.r[i], c = tintOf(fin.l[i]); const k = eq;
    if (k <= 0) { const off = only >= 0 ? i !== only : !top[i], d = dimRest && off ? 1 - dimRest * (only >= 0 ? .93 : .97) : 1; balls.set(i, fin.x[i], FLOOR_Y + r0, fin.z[i], r0, c[0] * d, c[1] * d, c[2] * d, Math.max(c[3], dimRest && off ? 1 : 0)); continue; }
    const r = lerp(r0, RM, k); balls.set(i, lerp(fin.x[i], gx(i), k), FLOOR_Y + r, lerp(fin.z[i], gz(i), k), r, lerp(c[0], red[0], k), lerp(c[1], red[1], k), lerp(c[2], red[2], k), lerp(c[3], 1, k));
  }
  balls.commit(N);
}
export function plainShots(c) {
  const { scene, balls, cam, plate, pegs, floor } = c;
  const base = (key = .004, strip = 1.25, fill = .05) => { c.setRoom(key, Math.max(key * .4, .012), strip); c.show({ plate: 1, pegs: 1, balls: 1, ballShadow: 0, mirror: 1, fill, tilt: 1, only: [floor] }); pegs.setF(1); plate.material.uniforms.uLine.value = 0; };
  const sh = [];
  // 贴地滑过：灰尘 → 石子 → 星球
  sh.push({ a: P0, scene, samples: 10, subDark: .7,
    update(t, l, pp) { base(.09, 2, .7); night(pp); pp.exposure = 1.2; plainBalls(balls, t); const k = E.io2(seg(t, P0, P1));
      camSet(cam, [lerp(-9, -3, k), FLOOR_Y + lerp(2.6, 3.4, k), lerp(19, 30, k)], [lerp(-5.5, 5.5, k), FLOOR_Y + lerp(.2, 7, k), lerp(5, 2, k)], lerp(30, 36, k)); return cam; },
    label(x, t) { const a = ss(83.4, 83.9, t) * (1 - ss(P1 - .3, P1, t)); tag(x, moneyFmt(S1[100].mean), W / 2, 300 * UI, { size: 150, color: RED_L, weight: 900, alpha: a, shadow: 24 }); tag(x, '平均每人', W / 2, 170 * UI, { size: 66, color: WHITE, alpha: a, shadow: 18 }); } });
  // 他：一粒灰，身后是星球的红光
  sh.push({ a: P1, scene, samples: 12, subDark: .7,
    update(t, l, pp) { base(.05, 2, .55); night(pp); plainBalls(balls, t, 0, 1, HERO); const hx = fin.x[HERO], hz = fin.z[HERO], k = seg(t, P1, P2);
      camSet(cam, [hx - .2 + .08 * k, FLOOR_Y + .09, hz + .62 - k * .14], [hx, FLOOR_Y + .05, hz], 22); pp.aperture = .004; pp.focus = .6; return cam; },
    label(x, t) { const a = ss(P1 + .1, P1 + .4, t); tag(x, '¥52', W / 2, 310 * UI, { size: 230, color: GREEN_L, weight: 900, alpha: a, shadow: 24 }); tag(x, '你', W / 2, 130 * UI, { size: 72, color: WHITE, alpha: a, shadow: 18 }); } });
  // 高处看：一百颗球
  sh.push({ a: P2, scene, samples: 12, subDark: .7,
    update(t, l, pp) { base(.09, 2, .5); night(pp); pp.exposure = 1.2; plainBalls(balls, t, 0, ss(P2 + .3, P2 + 1.2, t)); const k = seg(t, P2, P3);
      camSet(cam, [5 + k * 7, FLOOR_Y + 34 - k * 8, 42 - k * 8], [5 + k * 4, FLOOR_Y, 7], 30); return cam; },
    label(x, t) { const a = ss(P2 + .8, P2 + 1.3, t); topShade(x, 400, .74 * a); tag(x, '185', W / 2, 240 * UI, { size: 190, color: RED_L, weight: 900, alpha: a, shadow: 24 }); tag(x, '比平均数有钱的', W / 2, 90 * UI, { size: 66, color: WHITE, alpha: a, shadow: 18 }); } });
  // 平均数：一万颗一样大
  sh.push({ a: P3, scene, samples: 12, subDark: .7,
    update(t, l, pp) { base(.14, 1.6, .5); night(pp); pp.exposure = 1.2; const k = E.io3(seg(t, P3 + .2, P4 - .25)); plainBalls(balls, t, k); const q = seg(t, P3, P4);
      camSet(cam, [lerp(5, 0, q), lerp(FLOOR_Y + 37, FLOOR_Y + 62, q), lerp(42, 100, q)], [lerp(4, 0, q), FLOOR_Y, lerp(7, 40, q)], lerp(30, 34, q)); return cam; },
    label(x, t) { const a = ss(P4 - 1.2, P4 - .7, t); { const g = x.createLinearGradient(0, 0, 0, 430 * UI); g.addColorStop(0, `rgba(0,0,0,${.86 * a})`); g.addColorStop(.7, `rgba(0,0,0,${.7 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 430 * UI); } tag(x, moneyFmt(S1[100].mean), W / 2, 240 * UI, { size: 128, color: RED_L, weight: 900, alpha: a, shadow: 24 }); tag(x, '人人都是', W / 2, 110 * UI, { size: 66, color: WHITE, alpha: a, shadow: 18 }); } });
  // 没有人会熔掉它：一拍碎回去
  sh.push({ a: P4, scene, samples: 10, subDark: .7,
    update(t, l, pp) { base(.09, 2, .7); night(pp); pp.exposure = 1.2; const k = 1 - E.out5(seg(t, P4, P4 + .5)); plainBalls(balls, t, k); const q = E.out3(seg(t, P4, P5));
      camSet(cam, [lerp(0, 9, q), lerp(FLOOR_Y + 62, FLOOR_Y + 2.2, q), lerp(100, 44, q)], [lerp(0, 9, q), lerp(FLOOR_Y, FLOOR_Y + 8, q), lerp(40, 4, q)], lerp(34, 32, q)); return cam; } });
  return sh;
}
