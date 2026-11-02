import { Y0, tintOf, radiusOf, U } from '../machine.js';
import { camSet, tag, proj, RED_D, GREEN_D, INK } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
import { bright } from './hook.js';
// 平均每局 +5%：¥15,000 和 ¥6,000 熔成一团，再分成两颗 ¥10,500
const A = B(8), M1 = A + 1.7, M2 = A + 2.7, Z = A + 3.9;
const L1 = Math.log(1.5), L2 = Math.log(.6), L3 = Math.log(1.05), Y = Y0 + 30;
export function avgShots(c) {
  const { scene, cam, plate, melt, balls } = c;
  const posOf = t => {
    const a = E.io3(seg(t, A, M1)), b = E.io3(seg(t, M1 + .3, M2 + .5));
    const lx = lerp(-.24, 0, a), rx = lerp(.24, 0, a), w = lerp(0, 1, ss(M1 - .4, M1 + .3, t));
    const s1 = lerp(radiusOf(L1), radiusOf(L3), w), s2 = lerp(radiusOf(L2), radiusOf(L3), w);
    const c1 = lerp(tintOf(L1)[3], tintOf(L3)[3], w), c2 = lerp(tintOf(L2)[3], tintOf(L3)[3], w);
    const sp = lerp(0, .19, b);
    return [{ x: rx + sp * 1, y: Y, z: s1 + .04, r: s1, c: [...tintOf(L1).slice(0, 3), c1] }, { x: lx - sp * 1, y: Y, z: s2 + .04, r: s2, c: [...(b > 0 || w > .5 ? tintOf(L1) : tintOf(L2)).slice(0, 3), c2] }];
  };
  return [{ a: A, scene, samples: 12, ink: true,
    update(t, l, pp) { c.setRoom(1, 1, .2); c.show({ plate: 1, balls: 0, only: [melt.mesh] }); bright(pp); plate.material.uniforms.uLine.value = 0; melt.set(posOf(t), .07); const k = seg(t, A, Z + 1.2);
      camSet(cam, [0, Y - .1, 2.7 - .3 * k], [0, Y + .06, 0], 22); return cam; },
    label(x, t) { const ps = posOf(t), a1 = 1 - ss(M1 - .7, M1 - .2, t), a2 = ss(M2 + .4, M2 + .8, t); const [p, q] = [proj(cam, ps[0].x, ps[0].y + .25, .1), proj(cam, ps[1].x, ps[1].y + .25, .1)];
      tag(x, '¥15,000', p[0], p[1] - 40 * UI, { size: 76, color: RED_D, alpha: a1 }); tag(x, '¥6,000', q[0], q[1] - 40 * UI, { size: 76, color: GREEN_D, alpha: a1 });
      tag(x, '¥10,500', p[0], p[1] - 40 * UI, { size: 76, alpha: a2 }); tag(x, '¥10,500', q[0], q[1] - 40 * UI, { size: 76, alpha: a2 });
      tag(x, '+5%', W / 2, 330 * UI, { size: 190, color: RED_D, weight: 900, alpha: a2 }); } }];
}
