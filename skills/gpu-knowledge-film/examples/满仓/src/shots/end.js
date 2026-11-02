import { Y0, DY, R0, PEG_R, tintOf, radiusOf, moneyFmt, xAt, U } from '../machine.js';
import { S1, S25, fillRain } from '../flow.js';
import { SILO } from '../silo.js';
import { N } from '../sim.js';
import { camSet, proj, tag, pxPerUnit, INK, RED_D, GREEN_D } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
import { bright } from './hook.js';
import { drawRich } from '../text.js';

const A = B(72), H1 = 149.8, H2 = 152.7, H4 = 158.0;
const YY = Y0 + 30, lnv = v => Math.log(v / 10000);
export function endShots(c) {
  const { scene, balls, cam, plate, silo } = c;
  const sh = [];
  // 你和平均数：同一比例，一个长一个缩，最后挨在一起
  const you = t => Math.exp(lerp(Math.log(52), Math.log(18610), E.io3(seg(t, A + .3, H1 - .2)))), avg = t => Math.exp(lerp(Math.log(S1[100].mean), Math.log(S25[100].mean), E.io3(seg(t, H1 + .1, H2 - .3))));
  sh.push({ a: A, scene, samples: 12, ink: true,
    update(t, l, pp) { c.setRoom(1, 1, .2); c.show({ plate: 1, balls: 1 }); plate.material.uniforms.uLine.value = 0; bright(pp); const ry = radiusOf(lnv(you(t))), ra = radiusOf(lnv(avg(t))), a = tintOf(lnv(you(t))), b = tintOf(lnv(avg(t))), m = E.io3(seg(t, H1 + .1, H2 - .3));
      balls.set(0, lerp(-.44, -.2, m), YY - .1, ry + .02, ry, a[0], a[1], a[2], a[3]); balls.set(1, lerp(.3, .2, m), YY - .1, ra + .02, ra, b[0], b[1], b[2], b[3]); balls.commit(2);
      camSet(cam, [0, YY + .08, 5.3], [0, YY + .08, 0], 24); return cam; },
    label(x, t) { const ym = you(t), am = avg(t), m = E.io3(seg(t, H1 + .1, H2 - .3)), p = proj(cam, lerp(-.44, -.2, m), YY - .1, 0), q = proj(cam, lerp(.3, .2, m), YY - .1, 0);
      tag(x, '你', 380 * UI, 300 * UI, { size: 84, weight: 900 }); tag(x, moneyFmt(ym), 380 * UI, 420 * UI, { size: 104, color: ym > 10000 ? RED_D : GREEN_D, weight: 900 });
      tag(x, '平均数', 1060 * UI, 300 * UI, { size: 84, weight: 900 }); tag(x, moneyFmt(am), 1060 * UI, 420 * UI, { size: 104, color: RED_D, weight: 900 }); } });
  // 回到钢仓：这一次只灌四分之一
  const RA = H2 + .1, RB = 156.6;
  sh.push({ a: H2, scene, samples: 12, samplesMid: 10, ink: true,
    update(t, l, pp) { c.setRoom(1, 1, .2); c.show({ plate: 1, balls: 1, ballShadow: 0, only: [silo] }); silo.userData.front.visible = true; plate.material.uniforms.uLine.value = 0; bright(pp); fillRain(balls, t, RA, RB, Math.floor(N / 4)); camSet(cam, [0, SILO.cy - 1.25, 34 + seg(t, H2, 162.9) * 1.4], [0, SILO.cy - 1.25, 2], 26); pp.fade = ss(162.1, 162.9, t); return cam; },
    subDark: .7,
    label(x, t) { const a = ss(H4 + .05, H4 + .6, t); if (a <= 0) return; drawRich(x, '致每一个，满过仓的人。', W / 2, 1636 * UI, { size: 84, weight: 900, ink: true, alpha: a }); const b = ss(H4 + 1, H4 + 1.6, t); tag(x, 'Peters 2019 · Kelly 1956 · Bessembinder 2023', W / 2, 1722 * UI, { size: 42, weight: 500, color: '#2E3338', alpha: b }); tag(x, '第一财经 2026-10-28 · 财联社 2026-10-25', W / 2, 1778 * UI, { size: 42, weight: 500, color: '#2E3338', alpha: b }); tag(x, '思想实验与统计示意，不构成投资建议', W / 2, 1834 * UI, { size: 42, weight: 500, color: '#2E3338', alpha: b }); } });
  return sh;
}
