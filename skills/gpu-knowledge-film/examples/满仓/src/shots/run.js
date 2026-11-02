import * as THREE from 'three';
import { N, R, HERO, RICH, kAt, worth, lnU, lnD } from '../sim.js';
import { Y0, DY, R0, PEG_R, FLOOR_Y, U, ballAt, tintOf, radiusOf, moneyFmt, xAt, scaleOf, RAIL_Y, tilt } from '../machine.js';
import { GATE, DRAIN, delay, S1, run1, bandRow, flowRun, queueBall, queueX, queue, YQ, QS } from '../flow.js';
import { camSet, proj, tag, topShade, pxPerUnit, INK, RED_D, GREEN_D, RED_L, GREEN_L, WHITE } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E, rng } from '../core.js';
import { B } from '../script.js';

// 灯接在你的账户上
export const keyAt = med => Math.pow(clamp(med / 10000, 0, 1), .62);
export const medAt = row => { const n = Math.floor(row / 2) * 2, s = row / 2 - n / 2, a = S1[clamp(n, 0, 100)], b = S1[clamp(n + 2, 0, 100)]; return Math.exp(lerp(Math.log(a.median), Math.log(b.median), s)); };
const heroRow = t => clamp(run1(t - delay[HERO]), 0, 100);
const o = {};
export function heroPos(t) { ballAt(HERO, heroRow(t), 1, o); return { ...o }; }
export const M = { x: -3.5, y: Y0 - 25.1, z: 140, fov: 24 };
export function machineCam(cam, k = 1, fy = 0, fx = 0, zk = 0) { const z = 3.9 * Math.pow(M.z * (1 - zk) / 3.9, k); return camSet(cam, [lerp(fx, M.x, k), lerp(fy, M.y, k), z], [lerp(fx, M.x, k), lerp(fy, M.y, k), 0], M.fov); }
export const lampsAll = (c, v) => c.lamps.set(() => v);
// 灯管熄灭顺序
const ORDER = [5, 2, 8, 0, 10, 3, 7, 1, 9, 4, 6];
export const lampOff = i => lerp(68.15, 71.9, ORDER.indexOf(i) / 10);
export const lampOn = i => lerp(130.9, 132.7, ORDER.indexOf(10 - i) / 10);
export const lampLevel = (i, t, key) => { const off = t > lampOff(i) ? Math.exp(-(t - lampOff(i)) * 14) : 1, fl = t > lampOff(i) - .22 && t < lampOff(i) ? .55 + .45 * Math.sin(t * 90 + i) : 1; return .02 + (1.2 + 2.6 * key) * off * fl; };

function dark(pp, row) { const key = keyAt(medAt(row)); pp.vig = lerp(.1, .4, 1 - key); pp.threshold = lerp(4, 1.2, 1 - key); pp.exposure = lerp(1.3, 1, 1 - key); pp.bloom = lerp(.05, .12, 1 - key); pp.grain = lerp(.012, .02, 1 - key); pp.lift = [0, 0, 0]; pp.sat = 1.14; }

export function readout(x, t, row, a = 1, ink = false, y0 = 1408) {
  const n = Math.min(100, Math.max(1, Math.round(row))), m = S1[n];
  const c1 = ink ? INK : WHITE, cg = ink ? GREEN_D : GREEN_L, cr = ink ? RED_D : RED_L, sh = ink ? 0 : 14, h = ink ? 18 : 0;
  { const col = ink ? '236,239,242' : '0,0,0', g = x.createLinearGradient(0, (y0 - 110) * UI, 0, H); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.17, `rgba(${col},${.86 * a})`); g.addColorStop(1, `rgba(${col},${.92 * a})`); x.fillStyle = g; x.fillRect(0, (y0 - 110) * UI, W, H - (y0 - 110) * UI); }
  tag(x, `第 ${n} 局`, W / 2, y0 * UI, { size: 62, color: c1, alpha: a, shadow: sh, halo: h });
  tag(x, '你', 64 * UI, y0 * UI, { size: 62, color: c1, alpha: a, align: 'left', shadow: sh, halo: h });
  tag(x, moneyFmt(n < 2 ? 10000 : S1[n - n % 2].median), 64 * UI, (y0 + 94) * UI, { size: 96, color: cg, alpha: a, align: 'left', weight: 900, shadow: sh, halo: h });
  tag(x, '平均每人', W - 64 * UI, y0 * UI, { size: 62, color: c1, alpha: a, align: 'right', shadow: sh, halo: h });
  tag(x, moneyFmt(m.mean), W - 64 * UI, (y0 + 94) * UI, { size: 96, color: cr, alpha: a, align: 'right', weight: 900, shadow: sh, halo: h });
}

// 第一局那一团：点位两两不相交
const SP = (() => { const r = rng(31), a = []; for (let i = 0; i < 6000 && a.length < 90; i++) { const p = [(r() - .5) * 1.5, (r() - .5) * 1.1, r() * .9]; if (a.every(q => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > .33)) a.push(p); } return a; })();
export function runShots(c) {
  const { scene, balls, cam, plate, pegs, rod } = c;
  const tiltAt = t => ss(B(32) + .3, B(32) + 1.8, t);
  const base = (t, line = 1, o2 = {}) => { const key = keyAt(medAt(bandRow(t))); c.setRoom(key, key, lerp(.25, 1.1, 1 - key)); c.show({ plate: 1, pegs: 1, balls: 1, tilt: tiltAt(t), ...o2 }); pegs.setF(1); plate.material.uniforms.uLine.value = line; };
  const heroCam = h => camSet(cam, [h.x + .26, h.y - .07, 1.5], [h.x, h.y - .02, h.z * .5], 26);
  const ringR = (x, h) => { const p = proj(cam, h.x, h.y, h.z), r = R0 * pxPerUnit(cam, h.z); x.save(); x.strokeStyle = 'rgba(244,241,234,.92)'; x.lineWidth = 3.5 * UI; x.setLineDash([16 * UI, 13 * UI]); x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.stroke(); x.setLineDash([]); x.restore(); tag(x, '¥10,000', p[0], p[1] + r + 46 * UI, { size: 62, color: WHITE, shadow: 14 }); };
  const sh = [];
  // 闸门之下：第一根钉子把水柱劈开
  const A1 = B(18), A2 = 41.3, A3 = 44.8, A4 = B(24);
  sh.push({ a: A1, scene, samples: 14, ink: true,
    update(t, l, pp) { base(t, 0, { hi: 1 }); dark(pp, bandRow(t)); const r = Math.max(0, bandRow(t)); let n = 0; for (let j = 0; j < SP.length; j++) { const i = j * 137 % N; ballAt(i, r, 1, o); const q = tintOf(o.lnW); balls.set(n++, o.x + SP[j][0], o.y + SP[j][1], o.r + .1 + SP[j][2], o.r, q[0], q[1], q[2], q[3]); } balls.commit(n); const k = seg(t, A1, A2);
      camSet(cam, [.55 - .5 * k, Y0 - .1 - .7 * k, 3.2 + 2.2 * k], [-.05, Y0 + .1 - .75 * k, 0], 30); pp.aperture = .006; pp.focus = 3.4; return cam; } });
  sh.push({ a: A2, scene, samples: 12, ink: true,
    update(t, l, pp) { base(t, 1); dark(pp, bandRow(t)); flowRun(balls, t); const k = seg(t, A2, A3);
      camSet(cam, [-.4, Y0 - 1.6 - 1.4 * k, 9.5 + 3 * k], [-.2, Y0 - 1.5 - 1.4 * k, 0], 30); return cam; },
    label(x, t) { readout(x, t, bandRow(t), ss(A2, A2 + .4, t), true); } });
  sh.push({ a: A3, scene, samples: 12, ink: true,
    update(t, l, pp) { base(t, 1); dark(pp, bandRow(t)); flowRun(balls, t); const k = seg(t, A3, A4); const r = bandRow(t);
      camSet(cam, [-.6, Y0 - r * DY * .86 - 1.6, 20 + 4 * k], [-.6, Y0 - r * DY * .86 - 2.6, 0], 30); return cam; },
    label(x, t) { readout(x, t, bandRow(t), 1, true); } });
  // 第 20 局：一拍排成一队
  const Q1 = B(24), Q2 = 50.5, Q3 = 55.4;
  const YC = YQ + 2.2;
  sh.push({ a: Q1, scene, samples: 16,
    update(t, l, pp) { base(t, 1); dark(pp, 20); queueBall(balls, t, Q1, Q2 - .1); camSet(cam, [-.6 + seg(t, Q1, Q2) * 2, YC, 24], [-.6, YC - .8, 0], 30); return cam; },
    label(x, t) { readout(x, t, 20, 1, false); } });
  // 沿着队伍飞：从最穷的飞到第 5000 位
  const qx = t => { const k = E.io3(seg(t, Q2, Q3 - .8)); return lerp(queueX(250), queueX(4999), k); };
  const rk = t => Math.round(lerp(250, 4999, E.io3(seg(t, Q2, Q3 - .8))));
  sh.push({ a: Q2, scene, samples: 24, samplesMid: 12,
    update(t, l, pp) { base(t, 0, { hi: 1 }); dark(pp, 20); queueBall(balls, t, Q1, Q2 - .1, qx(t)); const xc = qx(t), k = ss(Q3 - 1.3, Q3 - .4, t);
      camSet(cam, [xc - lerp(1.5, .25, k), YQ + lerp(.34, .28, k), lerp(1.25, 1.75, k)], [xc + lerp(1.6, 0, k), YQ + lerp(.06, .14, k), .5], lerp(40, 30, k)); pp.aperture = .004 * k; pp.focus = 1.3; return cam; },
    label(x, t) { topShade(x, 400, .72); const r = rk(t), ks = ss(Q3 - .9, Q3 - .5, t); const ids = rankMoney(r); tag(x, moneyFmt(ids), W / 2, 280 * UI, { size: 130, color: GREEN_L, weight: 900, shadow: 16 }); tag(x, `第 ${(r + 1).toLocaleString('en-US')} 位`, W / 2, 130 * UI, { size: 72, color: WHITE, shadow: 16 });
      if (ks > 0) { const q = proj(cam, queueX(4999), YQ + radiusOf(queue.l[HERO]), .5 + radiusOf(queue.l[HERO])); x.save(); x.globalAlpha = ks; x.strokeStyle = WHITE; x.lineWidth = 4 * UI; x.beginPath(); x.arc(q[0], q[1], 170 * UI, 0, 7); x.stroke(); x.restore(); tag(x, '你', q[0], q[1] - 240 * UI, { size: 96, color: WHITE, alpha: ks, weight: 900, shadow: 16 }); } } });
  // 跟着你
  const HA = Q3, C1 = B(32), C2 = 68.0, C3 = 71.5, C3b = 74.7, C4 = 77.6;
  sh.push({ a: HA, scene, samples: 16, samplesMid: 10,
    update(t, l, pp) { base(t, 0, { hi: 1 }); dark(pp, bandRow(t)); flowRun(balls, t, 1, { skip: 120, jit: .55, must: [HERO] }); heroCam(heroPos(t)); pp.aperture = .005; pp.focus = 1.4; return cam; },
    label(x, t) { topShade(x, 420, .74); const h = heroPos(t), p = proj(cam, h.x, h.y, h.z), row = heroRow(t), n = Math.floor(row + .6), ku = kAt[HERO * (R + 1) + n];
      ringR(x, h);
      tag(x, moneyFmt(worth(HERO, n)), W / 2, 300 * UI, { size: 130, color: GREEN_L, weight: 900, shadow: 16 });
      tag(x, `涨 ${ku} 次  跌 ${n - ku} 次`, W / 2, 150 * UI, { size: 70, color: WHITE, shadow: 16 }); } });
  // 板子是歪的：钢杆就是这条歪线
  sh.push({ a: C1, scene, samples: 12,
    update(t, l, pp) { base(t, 1, { lamps: 1, rod: 1 }); c.lamps.set(i => lampLevel(i, t, keyAt(medAt(bandRow(t))))); rod.setF(1); dark(pp, bandRow(t)); flowRun(balls, t); machineCam(cam); return cam; },
    label(x, t) { const a = ss(C1 + .2, C1 + .7, t), p1 = proj(cam, 0, Y0 - 80 * DY, 0), q1 = proj(cam, xAt(80, 40), Y0 - 80 * DY, .6);
      tag(x, '本金线', p1[0] + 26 * UI, p1[1], { size: 66, color: WHITE, align: 'left', alpha: a, shadow: 14, weight: 900 }); tag(x, '你', q1[0] - 40 * UI, q1[1], { size: 84, color: GREEN_L, align: 'right', alpha: a, shadow: 14, weight: 900 }); } });
  // 灯板：一盏盏灭
  sh.push({ a: C2, scene, samples: 12,
    update(t, l, pp) { const key = keyAt(medAt(bandRow(t))), kk = lerp(1, .55, ss(C2, C3, t)); c.setRoom(key * kk, key * kk, lerp(.25, 1.1, 1 - key)); c.show({ plate: 1, pegs: 1, balls: 1, lamps: 1 }); pegs.setF(1); plate.material.uniforms.uLine.value = 0; c.lamps.set(i => lampLevel(i, t, key)); dark(pp, bandRow(t)); pp.bloom = .2; pp.threshold = 1; flowRun(balls, t); const k = seg(t, C2, C3);
      camSet(cam, [-4.2 + k * .8, Y0 - 7, 62 - k * 3], [-4.2 + k * .8, Y0 - 7, 0], 24); return cam; },
    label(x, t) { tag(x, moneyFmt(medAt(bandRow(t))), W / 2, 640 * UI, { size: 130, color: GREEN_L, weight: 900, shadow: 18 }); tag(x, '你的账户', W / 2, 510 * UI, { size: 66, color: WHITE, shadow: 16 }); } });
  // 第 50 局：还是贴着你，同样的镜头距离，球已经小了一圈
  sh.push({ a: C3, scene, samples: 16, samplesMid: 10,
    update(t, l, pp) { base(t, 0, { hi: 1 }); dark(pp, bandRow(t)); flowRun(balls, t, 1, { skip: 120, jit: .55, must: [HERO] }); heroCam(heroPos(t)); pp.aperture = .005; pp.focus = 1.4; return cam; },
    label(x, t) { topShade(x, 420, .74); ringR(x, heroPos(t));
      tag(x, moneyFmt(worth(HERO, 50)), W / 2, 300 * UI, { size: 150, color: GREEN_L, weight: 900, shadow: 16 }); tag(x, '第 50 局', W / 2, 150 * UI, { size: 70, color: WHITE, shadow: 16 }); } });
  // 平均数：跟着那颗红球
  sh.push({ a: C3b, scene, samples: 16,
    update(t, l, pp) { base(t, 1); dark(pp, bandRow(t)); flowRun(balls, t); const k = seg(t, C3b, C4), b = {}; ballAt(RICH, clamp(run1(t - delay[RICH]), 0, 99.9), 1, b);
      camSet(cam, [b.x - 2 + k, b.y + 1.8, 19 + b.r * 2.2], [b.x + .2, b.y - .5, 0], 30, -.05); return cam; },
    label(x, t) { readout(x, t, bandRow(t), 1, false); } });
  // 冲到底：贴着板子往上看，球迎面砸下来
  sh.push({ a: C4, scene, samples: 24, samplesMid: 10,
    update(t, l, pp) { base(t, 1); dark(pp, bandRow(t)); flowRun(balls, t); const k = seg(t, C4, B(40));
      camSet(cam, [4, FLOOR_Y + 3 + k * 5, 26 - k * 6], [5, FLOOR_Y + 15 - 6 * k, 0], 44, .06); return cam; },
    label(x, t) { readout(x, t, bandRow(t), 1 - ss(B(39.5), B(40), t), false); } });
  return sh;
}
function rankMoney(r) { const u = lnU(1), d = lnD(1); // 第 r 位的钱：在排序里取
  const k = rankK[Math.min(N - 1, r)]; return 10000 * Math.exp(k * u + (20 - k) * d); }
const rankK = (() => { const a = new Int32Array(N); for (let i = 0; i < N; i++) a[queue.rank[i]] = kAt[i * (R + 1) + 20]; return a; })();
