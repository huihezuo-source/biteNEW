import { N, R, kAt, lnU, lnD } from '../sim.js';
import { Y0, tintOf } from '../machine.js';
import { S1, curve } from '../flow.js';
import { camSet, tag, topShade, INK, WHITE, RED_L } from '../util.js';
import { W, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
// 一万颗球排成方阵：玩一次，全体变大或变小。没有钉子，没有格阵
const COLS = 87, S = .24, YG = Y0 + 70, HG = 115 * S, u = lnU(1), d = lnD(1);
const K = [[37.3, 0], [38.3, 1], [41.5, 2], [45, 3], [49, 5], [52, 14], [56, 34], [60.6, 66], [64.8, 100]];
export const roundAt = t => clamp(curve(K, t), 0, 100);
export const keyAt = med => Math.pow(clamp(med / 100000, 0, 1), .42);
const medAt = r => { const n = Math.floor(r / 2) * 2, s = r / 2 - n / 2, a = S1[clamp(n, 0, 100)], b = S1[clamp(n + 2, 0, 100)]; return Math.exp(lerp(Math.log(a.median), Math.log(b.median), s)); };
export function runShots(c) {
  const { scene, balls, cam, plate } = c;
  const A = B(18), P1 = 72.1;
  const put = r => { const n = Math.floor(r), s = r - n, m = s * s * (3 - 2 * s); for (let i = 0; i < N; i++) { const b = (R + 1) * i, k0 = kAt[b + n], k1 = kAt[b + Math.min(R, n + 1)], l0 = k0 * u + (n - k0) * d, l1 = k1 * u + (Math.min(R, n + 1) - k1) * d, l = lerp(l0, l1, m), rad = .108 * Math.exp(l / 3), q = tintOf(l), x = ((i % COLS) - (COLS - 1) / 2) * S, y = YG + (Math.floor(i / COLS) - 57) * S; balls.set(i, x, y, rad + .02, rad, q[0], q[1], q[2], q[3]); } balls.commit(N); };
  const inkK = t => 1 - ss(49.4, 50.6, t);
  return [{ a: A, scene, samples: 10, inkK, subDark: .94,
    update(t, l, pp) { const r = roundAt(t), key = Math.max(.1, keyAt(medAt(r))); c.setRoom(key, key, lerp(.25, 1.2, 1 - key)); c.show({ plate: 1, balls: 1, fill: .12 }); plate.material.uniforms.uLine.value = 0; pp.vig = lerp(.1, .4, 1 - key); pp.threshold = lerp(4, 1.2, 1 - key); pp.exposure = lerp(1.3, 1.1, 1 - key); pp.bloom = lerp(.05, .12, 1 - key); pp.grain = lerp(.012, .02, 1 - key); pp.lift = [0, 0, 0]; pp.sat = 1.16; put(r);
      const z = Math.exp(lerp(Math.log(9.5), Math.log(68), E.io2(seg(t, 41.5, 53)))); camSet(cam, [0, YG, z], [0, YG, 0], 24); return cam; },
    label(x, t) { const r = Math.max(1, Math.round(roundAt(t))), k = inkK(t); if (t < 38.2) return; if (k < .5) topShade(x, 300, .6); if (t < 68.4) tag(x, `第 ${r} 次`, W / 2, 170 * UI, { size: 100, weight: 900, color: k > .5 ? INK : WHITE, shadow: k > .5 ? 0 : 16, halo: k > .5 ? 18 : 0 }); const a = ss(68.6, 69.1, t); if (a > 0) tag(x, '34 人', W / 2, 200 * UI, { size: 170, color: RED_L, weight: 900, alpha: a, shadow: 22 }); } }];
}
