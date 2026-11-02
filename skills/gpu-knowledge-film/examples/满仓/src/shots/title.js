import { N } from '../sim.js';
import { Y0, R0, U } from '../machine.js';
import { SILO } from '../silo.js';
import { GATE, fillRain, flowRun } from '../flow.js';
import { camSet, tag } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
import { bright } from './hook.js';

const RAIN_A = 23.0, RAIN_B = GATE - .25;
export function titleShots(c) {
  const { scene, balls, cam, plate, silo } = c;
  const base = o => { c.setRoom(1, 1, .2); c.show({ plate: 1, pegs: 0, balls: 1, ballShadow: 0, only: [silo], ...o }); plate.material.uniforms.uLine.value = 0; };
  const sh = [];
  // 一镜到底：先贴着黑色字壁看钢珠堆起来，再拉开，才看出是“仓”字
  sh.push({ a: 23.1, scene, samples: 14, samplesMid: 10, ink: true,
    update(t, l, pp) { base({}); silo.userData.front.visible = true; bright(pp); fillRain(balls, t, RAIN_A, RAIN_B); const k = E.io3(seg(t, 24.4, 28.2)), q = seg(t, 23.1, GATE);
      camSet(cam, [lerp(.5, 0, k), lerp(SILO.bot + 2.6, SILO.cy - 1.1, k), lerp(8.6, 33, k) - q * 1.2], [lerp(.2, 0, k), lerp(SILO.bot + 2.9, SILO.cy - 1.1, k), 2], 26); return cam; } });
  // 闸门开：字里的球流空
  sh.push({ a: GATE, scene, samples: 16, ink: true,
    update(t, l, pp) { base({}); silo.userData.front.visible = true; bright(pp); flowRun(balls, t); const k = seg(t, GATE, B(18));
      camSet(cam, [0, SILO.cy, 24.2 + k * .8], [0, SILO.cy, 2], 28.4); return cam; } });
  return sh;
}
