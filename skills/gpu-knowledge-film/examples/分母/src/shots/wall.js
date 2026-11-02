import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp } from '../core.js';
import { COLS, ROWS, CW, CH, WALL_W, WALL_H, YOU, youPos, REMAIN } from '../world.js';
import { RT } from '../script.js';

const fmt = n => n.toLocaleString('en-US');
export function counter(x, str, y, { size = 150, color = '#FFD27A', glow = 'rgba(255,190,90,.85)', label = '', a = 1, cx = W / 2, plate = 0 } = {}) {
  x.save(); x.globalAlpha = a;
  if (plate) { const gr = x.createRadialGradient(cx, (y + 10) * UI, 0, cx, (y + 10) * UI, 640 * UI); gr.addColorStop(0, `rgba(0,0,0,${plate})`); gr.addColorStop(.55, `rgba(0,0,0,${plate * .72})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `700 ${size * UI}px JB`; x.fillStyle = color; x.shadowColor = glow; x.shadowBlur = size * .22 * UI; x.fillText(str, cx, y * UI); x.shadowBlur = 0; x.fillText(str, cx, y * UI);
  if (label) { x.font = `700 ${64 * UI}px NSans`; x.fillStyle = '#FFF6E8'; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 18 * UI; x.fillText(label, cx, (y + 96) * UI); } x.restore();
}
export const remainAt = t => { let n = REMAIN[0]; for (let k = 1; k <= 10; k++) if (t >= RT[k]) n = REMAIN[k]; return n; };

export function wallShots(ctx) {
  const { scene, wall, sky, city, cam, star } = ctx;
  const U = wall.u;
  // 统一设置：亮起 @ 27.96；十轮熄灯
  const base = (t) => {
    star.hide(); U.uWallB.value = 1; U.uGlassK.value = 1; U.uIdle.value = 0; U.uT.value = t; sky.u.uT.value = t; city.u.uT.value = t; city.gu.uT.value = t;
    U.uYouOpen.value = 0; U.uYouGain.value = 1.4; U.uOnT.value = 27.96; U.uOnK.value = .0165; U.uOnC.value.set(YOU.col, YOU.row); U.uRevT.value = 999; U.uAll.value = 0; U.uMaskAmt.value = 0; U.uDim.value = 1; U.uMoon.value = 1;
    for (let k = 1; k <= 10; k++) { U.uRound.value[k] = RT[k]; U.uSweep.value[k] = k === 1 ? .0034 : .0016; }
    U.uRound.value[0] = 999; U.uRound.value[11] = 999;
    U.uTint.value = 0;
  };
  const cen = new THREE.Vector3(0, 600, 0);
  const setCam = (p, l, fov = 30, near = 2, far = 60000) => { cam.position.set(...p); cam.up.set(0, 1, 0); cam.lookAt(...l); cam.fov = fov; cam.near = near; cam.far = far; cam.updateProjectionMatrix(); return cam; };

  // 5：全墙从你这一盏点燃
  const s5 = {
    a: 27.96, b: 31.46, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t); U.uMoon.value = 3.2; U.uIdle.value = .08; U.uWallB.value = 1.6; U.uGlassK.value = .42;
      const on = seg(u, 0, 3.4); star.show(1 - ss(.2, 1.6, u), 2240, cam);
      const d = 2240 - 240 * E.out2(seg(u, 0, 3.5));
      setCam([.0, 600, d], [0, 600, 0]);
      pp.bloom = .16 + .1 * on; pp.threshold = 1.0; pp.vig = .45; pp.exposure = 1 - .22 * on;
      return cam;
    },
    hud(x, u, t, h) { const a0 = ss(0, .3, u); const gr = x.createLinearGradient(0, 0, 0, 640 * UI); gr.addColorStop(0, `rgba(0,0,0,${.92 * a0})`); gr.addColorStop(.74, `rgba(0,0,0,${.8 * a0})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 640 * UI); const n = Math.round(100000 * E.io2(seg(u, .2, 3.3))); counter(x, fmt(n), 300, { size: 170, a: a0, color: '#FFF0D8', label: '部手机' }); h.gain = 2.0; },
  };
  // 掠射：沿着墙看过去
  const s5b = {
    a: 31.46, b: 33.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t);
      const k = E.io2(seg(u, 0, 2.5));
      cam.up.set(0, 1, 0); cam.position.set(-30 + 22 * k, 8 + 14 * k, 64 - 10 * k); cam.lookAt(-14 + 10 * k, 150 + 30 * k, 0); cam.fov = 84; cam.near = 1; cam.far = 60000; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = 1.0; pp.vig = .6; pp.exposure = .95;
      return cam;
    },
  };
  // 6–7：红一半，绿一半（第一轮：市场涨，红对绿错）
  const s6 = {
    a: 33.96, b: 40.46, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t); U.uTint.value = ss(0, .35, u); U.uTintR.value = 1; U.uMarketUp.value = 1; U.uTCt.value = 34.1; U.uTWt.value = 37.1; U.uTC0.value.set(0, 400); U.uTW0.value.set(250, 0); U.uTK.value = .0045;
      const k = u / 6.5; setCam([lerp(-340, 300, E.io2(k)), lerp(640, 560, k), lerp(1900, 1760, k)], [lerp(-60, 50, k), 600, 0], 31);
      pp.bloom = .10 + .05 * ss(5, 6.5, u); pp.threshold = 1.2; pp.vig = .42; pp.exposure = 1.0; pp.sat = 1.22; pp.contrast = 1.10;
      return cam;
    },
    hud(x, u, t, h) {
      const a1 = ss(.1, .4, u) * (1 - ss(2.75, 3.0, u)), a2 = ss(3.1, 3.4, u); const a0 = Math.max(a1, a2); const gr = x.createLinearGradient(0, 0, 0, 640 * UI); gr.addColorStop(0, `rgba(0,0,0,${.92 * a0})`); gr.addColorStop(.74, `rgba(0,0,0,${.8 * a0})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 640 * UI);
      if (a1 > 0) counter(x, '明天 涨', 300, { size: 170, a: a1, color: '#FF6A55', glow: 'rgba(255,60,40,.9)', label: '50,000 部手机' });
      if (a2 > 0) counter(x, '明天 跌', 300, { size: 170, a: a2, color: '#3FE08E', glow: 'rgba(30,230,120,.9)', label: '50,000 部手机' });
      h.gain = 2.2;
    },
  };
  // 8：爆发，绿窗全灭，窗户拼出片名
  const s8 = {
    a: 40.46, b: 44.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t); U.uRound.value[1] = RT[1]; U.uOrig.value[1].set(125, 200); U.uSweep.value[1] = .0030;
      U.uTint.value = 1 - ss(.5, 1.2, u); U.uTintR.value = 1; U.uMarketUp.value = 1; U.uTCt.value = -99; U.uTWt.value = -99;
      U.uMaskAmt.value = E.io2(seg(u, .9, 2.0)) * 1.18;
      const k = E.out3(seg(u, 0, 4.5));
      setCam([lerp(36, 0, k), lerp(606, 600, k), lerp(2120, lerp(2460, 2320, k), ss(.85, 1.5, u))], [0, 600, 0], 30);
      pp.bloom = .10 + .24 * ss(.9, 2, u); pp.threshold = .85; pp.radius = 1.05; pp.vig = .42; pp.exposure = 1.0; pp.sat = 1.14; pp.contrast = 1.08;
      return cam;
    },
  };
  // 9：沿墙横移，半数已黑
  const s9 = {
    a: 44.96, b: 47.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t);
      const k = u / 3;
      const x0 = youPos.x + lerp(-46, -10, k);
      setCam([x0, youPos.y + 14, 58], [x0 + 16, youPos.y + 2, 0], 40, 1);
      U.uYouGain.value = 1.2; pp.bloom = .16; pp.threshold = 1; pp.vig = .5;
      return cam;
    },
  };
  // 11：一道分数线从上往下扫，扫过的地方灭掉一半
  const SW = .75;                       // 每轮扫过的时长
  const s11 = {
    a: 55.96, b: 63.96, scene, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      base(t); for (let k = 6; k <= 10; k++) { U.uSweep.value[k] = SW / 400; U.uOrig.value[k].set(125, 400 + 1600); U.uRound.value[k] = RT[k] - 1600 * SW / 400; }
      for (let k = 1; k <= 5; k++) U.uRound.value[k] = RT[k];
      const k = u / 8; setCam([lerp(-30, 30, k), lerp(610, 590, k), lerp(1240, 1140, E.io2(k))], [0, 600, 0], 30);
      U.uMoon.value = 1.5; U.uYouGain.value = 1.8; pp.bloom = .34; pp.threshold = .5; pp.vig = .4; pp.exposure = 1.35; pp.radius = .95;
      return cam;
    },
    hud(x, u, t, h) {
      let cur = 6; for (let k = 6; k <= 10; k++) if (t >= RT[k]) cur = k;
      const d = t - RT[cur]; const sc = 1 + .22 * Math.exp(-d * 7);
      const gr = x.createLinearGradient(0, 0, 0, 520 * UI); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(.7, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 520 * UI);
      x.save(); x.translate(W / 2, 290 * UI); x.scale(sc, sc); x.translate(-W / 2, -290 * UI); counter(x, fmt(remainAt(t)), 290, { size: 190, color: '#FFD27A', label: `第 ${cur} 个交易日，还亮着` }); x.restore();
      // 扫线
      if (d >= 0 && d < SW + .1) { const y = -60 + d / SW * 2000; const a = 1 - ss(SW - .05, SW + .1, d); x.save(); x.globalAlpha = a; const g = x.createLinearGradient(0, (y - 140) * UI, 0, (y + 6) * UI); g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(1, 'rgba(255,214,150,.20)'); x.fillStyle = g; x.fillRect(0, (y - 140) * UI, W, 146 * UI); x.fillStyle = '#FFF0D0'; x.shadowColor = 'rgba(255,200,120,1)'; x.shadowBlur = 36 * UI; x.fillRect(0, y * UI, W, 7 * UI); x.restore(); }
      h.gain = 2.4;
    },
  };
  // 12：黑墙 97 颗星
  const s12 = {
    a: 63.96, b: 66.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t); U.uMoon.value = 3.5; U.uYouGain.value = 3.2;
      const k = E.io3(seg(u, 0, .55)); setCam([30 - 30 * k, 590 + 10 * k, 1140 + 1060 * k], [0, 600, 0], 30);
      star.show(.7 * k, 1900, cam);
      pp.bloom = .36; pp.threshold = .6; pp.vig = .4; pp.exposure = 1.2;
      return cam;
    },
    hud(x, u, t, h) {
      const gr = x.createLinearGradient(0, 0, 0, 900 * UI); gr.addColorStop(0, 'rgba(0,0,0,.82)'); gr.addColorStop(.75, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 900 * UI);
      const f = E.out3(seg(u, .55, 1.0)); counter(x, '97', 300, { size: 220, a: ss(0, .15, u), color: '#FFE0A6' });
      if (f > 0) { x.save(); x.globalAlpha = f; x.fillStyle = '#FFF4DF'; x.shadowColor = 'rgba(255,220,160,.9)'; x.shadowBlur = 20 * UI; const w = W * .62 * f; x.fillRect(W / 2 - w / 2, 352 * UI, w, 10 * UI); x.restore(); counter(x, '100,000', 530, { size: 170, a: f, color: '#F4F1EA', glow: 'rgba(255,255,255,.5)' }); const l = ss(1.25, 1.55, u); if (l > 0) { x.save(); x.globalAlpha = l; x.textAlign = 'center'; x.font = `900 ${80 * UI}px NSerif`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 18 * UI; x.fillText('这个数，叫分母', W / 2, 660 * UI); x.restore(); } }
      h.gain = 2.2; },
  };
  // 14：真实案件
  const s14 = {
    a: 72.46, b: 76.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      base(t); U.uOnT.value = -999; U.uAll.value = 0; U.uRevT.value = 73.46; U.uRevC.value.set(125, 0); U.uRevK.value = .0024; for (let k = 1; k <= 10; k++) { U.uRound.value[k] = -999; U.uSweep.value[k] = 0; }
      U.uRound.value[11] = 999; U.uTint.value = 0; U.uYouGain.value = 2.6; U.uDim.value = 1; U.uMoon.value = 3.2;
      const k = u / 4.5; const k2 = E.io2(seg(u, 1.0, 4)); setCam([lerp(-30, 180, k2), lerp(600, 90, k2), lerp(2180, 980, k2)], [lerp(0, 0, k2), lerp(600, 740, k2), 0], lerp(30, 40, k2));
      pp.bloom = .30 - .16 * k2; pp.threshold = lerp(.55, 1, k2); pp.vig = .55; pp.sat = lerp(1, .8, k2); pp.exposure = lerp(1.25, .62, k2); pp.gain = [.92, .98, 1.08];
      return cam;
    },
    hud(x, u, t, h) {
      const a = ss(1.3, 1.6, u) * (1 - ss(4.2, 4.5, u)); if (a <= 0) return;
      const gr = x.createRadialGradient(W / 2, 620 * UI, 0, W / 2, 620 * UI, 1180 * UI); gr.addColorStop(0, `rgba(0,0,0,${.97 * a})`); gr.addColorStop(.5, `rgba(0,0,0,${.92 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      counter(x, '110,000+', 440, { size: 176, color: '#F4F7FF', glow: 'rgba(160,200,255,.8)', label: '人受害', a }); counter(x, '27 亿元', 800, { size: 176, color: '#FF4A38', glow: 'rgba(255,50,30,.85)', label: '涉案金额', a }); h.gain = 5.2;
    },
  };
  return [s5, s5b, s6, s8, s9, s11, s12, s14];
}
