import * as THREE from 'three';
import { W, H, UI, clamp, ss, seg, E, lerp } from '../core.js';
import { GREEN, RED, drawScreen, camSet } from '../ctx.js';
import { tag, WHITE } from '../util.js';
import { night } from './mid.js';
import { PHONE } from '../world.js';

const FLIP0 = 132.2, FLIP1 = 134.1;
export function endShots(c) {
  const { room, cam, ph, hand, V } = c, P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const flipPose = t => { const k = E.io3(seg(t, FLIP0, FLIP1)), a = k * Math.PI, lift = Math.sin(k * Math.PI) * .62; for (const g of [ph.a, ph.b]) { g.position.set(k * .42, PHONE.h / 2 + lift + ss(.9, 1, k) * 0 , 0); g.rotation.set(0, 0, 0); g.rotation.order = 'YXZ'; g.rotation.y = .14; g.rotation.z = -a; } ph.b.position.y = PHONE.h / 2 + lift; return k; };
  return [
    // 回到开头：同一个低机位，同一束光
    { a: 124.6, scene: room.scene, samples: 10, samplesDraft: 3, update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); ph.a.visible = ph.b.visible = true; drawScreen('chart'); c.poseCommon(t, GREEN, 1); night(pp, 1); const k = E.io2(seg(t, 124.6, 128.2)); const q = [lerp(2.3, 1.7, k), lerp(.74, .66, k), lerp(5.0, 4.3, k)]; camSet(cam, q, [0, .78, 0], 30, -.03); pp.aperture = .012; pp.focus = 5; return cam; } },
    // 同一根手指，同一个按钮
    { a: 128.15, scene: room.scene, samples: 10, samplesDraft: 3, update(t, l, pp) { c.only(); c.layPhone(); ph.a.visible = ph.b.visible = true; drawScreen('chart'); c.poseCommon(t, GREEN, .92); night(pp, .92); const k = E.out3(seg(t, 128.2, 129.8)), leave = E.io2(seg(t, 131.2, 132.1)); const tip = V(lerp(.95, .05, k) + leave * .6, lerp(.9, .14, k) + leave * .8, lerp(1.7, .69, k) + leave * .7); c.finger(tip); const q = [.5, 2.05, 1.92]; camSet(cam, q, [.03, .05, .42], 18, .05); pp.aperture = .03; pp.focus = 2.8; return cam; } },
    // 翻过来：光柱像灯塔扫过整间屋子
    { a: 132.05, scene: room.scene, samples: 10, samplesDraft: 3, subDark: .4, update(t, l, pp) { c.only(); ph.a.visible = ph.b.visible = true; const k = flipPose(t); drawScreen('chart'); const p = ph.a.position; c.poseCommon(t, GREEN, lerp(1.4, 0, ss(.86, .98, k))); night(pp, 1.05); pp.bloom = .22;
        const edge = V(p.x + Math.cos(k * Math.PI) * .4, p.y + Math.sin(k * Math.PI) * .36 + .02, .3); c.noFinger();
        camSet(cam, [1.5, .78, 7.4], [.2, 1.5, 0], 34, -.02); pp.aperture = .006; pp.focus = 7.6; return cam; } },
    // 第二天：第一次有了不是手机的光
    { a: 134.1, scene: room.scene, samples: 12, samplesDraft: 3, subDark: .34, subTop: .62, subTopHold: 150,
      update(t, l, pp) { c.only(); c.noFinger(); ph.a.visible = ph.b.visible = true; flipPose(FLIP1 + 1); drawScreen('sold', 0); const d = E.in2(seg(t, 135.6, 150)) * 1; c.poseCommon(t, GREEN, 0); ph.scr.color.setRGB(0, 0, 0); room.U.uDawn.value = d * .44; room.sunL.intensity = d * 1.4; room.sunL.color.setRGB(1, .72, .44); room.key.intensity = 0; night(pp, 1); pp.vig = lerp(.62, .42, d); pp.bloom = lerp(.16, .22, d); pp.fade = ss(158.6, 160.6, t);
        // 150 秒硬切：手机背面的特写，扣着的手机是全片的答案
        if (t < 150) { const k = E.io2(seg(t, 138, 150)); camSet(cam, [lerp(1.5, 1.2, k), lerp(.78, .7, k), lerp(7.4, 6.2, k)], [.25, lerp(1.2, 1.1, k), 0], 34, -.02); pp.aperture = .006; pp.focus = 7.2; }
        else { const k = E.io2(seg(t, 150, 159)); camSet(cam, [lerp(1.5, 1.34, k), lerp(.46, .4, k), lerp(2.5, 2.1, k)], [.5, lerp(.34, .3, k), 0], 30, -.03); pp.aperture = .03; pp.focus = 2.4; pp.exposure *= .8; }
        if (d > .01) pp.fx = [{ fx: 'rays', k: d * .8, c: [.5, .6], decay: .972, thr: 1.1, col: [1, .74, .46] }];
        return cam; },
      label(x, t) { const a = ss(152.5, 153.2, t) * (1 - ss(158.2, 158.9, t)); if (a <= 0) return; { const g = x.createLinearGradient(0, 1500 * UI, 0, 1920 * UI); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.35, `rgba(0,0,0,${.78 * a})`); g.addColorStop(1, `rgba(0,0,0,${.86 * a})`); x.fillStyle = g; x.fillRect(0, 1500 * UI, W, 420 * UI); } x.save(); x.globalAlpha = a * .92; x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `500 ${37 * UI}px NSans`; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 16 * UI; x.fillText('大盘指上证指数收盘点位，1996-12-16 至 2026-10-28，', W / 2, 1660 * UI); x.fillText('未含分红和费用。“你”的操作和金额为虚构示意。', W / 2, 1714 * UI); x.fillText('历史数据不代表未来，不构成投资建议。', W / 2, 1768 * UI); x.restore(); } },
  ];
}
