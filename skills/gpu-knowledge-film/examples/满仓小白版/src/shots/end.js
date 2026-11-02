import { fillRain } from '../flow.js';
import { SILO } from '../silo.js';
import { N } from '../sim.js';
import { camSet, tag } from '../util.js';
import { W, H, UI, lerp, ss, seg } from '../core.js';
import { B } from '../script.js';
import { bright } from './one.js';
import { drawRich } from '../text.js';
// 回到钢仓：这一次只灌一半
const A = B(56), D = 124.5;
export function endShots(c) {
  const { scene, balls, cam, plate, silo } = c;
  return [{ a: A, scene, samples: 12, samplesMid: 10, ink: true,
    update(t, l, pp) { c.setRoom(1, 1, .2); c.show({ plate: 1, balls: 1, ballShadow: 0, only: [silo] }); silo.userData.front.visible = true; plate.material.uniforms.uLine.value = 0; bright(pp); fillRain(balls, t, A + .3, 123, Math.floor(N / 2)); camSet(cam, [0, SILO.cy - 1.25, 34 + seg(t, A, 130.6) * 1.4], [0, SILO.cy - 1.25, 2], 26); pp.fade = ss(129.8, 130.6, t); return cam; },
    label(x, t) { const a = ss(D, D + .6, t); if (a > 0) drawRich(x, '致每一个，满过仓的人。', W / 2, 1700 * UI, { size: 84, weight: 900, ink: true, alpha: a }); const b = ss(D + 1, D + 1.6, t); tag(x, '思想实验，不构成投资建议', W / 2, 1800 * UI, { size: 46, weight: 500, color: '#2E3338', alpha: b }); } }];
}
