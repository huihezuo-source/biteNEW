import { Y0, tintOf, U } from '../machine.js';
import { camSet, proj, tag, pxPerUnit, INK, RED_D, GREEN_D, RED_L, GREEN_L, WHITE } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';
export function bright(pp) { pp.exposure = 1.3; pp.threshold = 4.; pp.vig = .1; pp.bloom = .05; pp.grain = .012; pp.contrast = 1.05; pp.lift = [0, 0, 0]; pp.sat = 1.12; }
const YY = Y0 + 30, rv = v => .42 * Math.cbrt(v / 1e5), wan = v => '¥' + Math.round(v).toLocaleString('en-US'), tv = v => tintOf(Math.log(v / 1e5));
const T1 = B(1, 3), T2 = B(5);
const fix = (cam, z = 4.2) => camSet(cam, [0, YY + .1, z], [0, YY + .1, 0], 24);
function ring(x, cam, cx = 0, cy = 0, v = 1e5, ink = true) { const p = proj(cam, cx, YY + cy, .5), r = rv(v) * pxPerUnit(cam, .5); x.save(); x.strokeStyle = ink ? 'rgba(16,19,22,.6)' : 'rgba(244,241,234,.7)'; x.lineWidth = 4 * UI; x.setLineDash([16 * UI, 13 * UI]); x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.stroke(); x.restore(); }
export function oneShots(c) {
  const { scene, balls, cam, plate, melt } = c;
  const white = o => { c.setRoom(1, 1, .2); c.show({ plate: 1, balls: 1, ...o }); plate.material.uniforms.uLine.value = 0; };
  const sh = [];
  // 一颗球，一个数：涨了变大，跌了变小
  const val = t => { const a = ss(T1, T1 + .35, t), b = ss(T2, T2 + .35, t); return Math.exp(lerp(lerp(Math.log(1e5), Math.log(1.5e5), a), Math.log(.75e5), b)); };
  sh.push({ a: 0, scene, samples: 12, ink: true,
    update(t, l, pp) { white({}); bright(pp); const v = val(t), r = rv(v), q = tv(v); balls.set(0, 0, YY, r + .02, r, q[0], q[1], q[2], q[3]); balls.commit(1); fix(cam); return cam; },
    label(x, t) { const v = val(t), tg = t < T1 ? 100000 : t < T2 ? 150000 : 75000; tag(x, wan(t < T1 + .35 || (t > T2 && t < T2 + .35) ? v : tg), W / 2, 300 * UI, { size: 130, weight: 900, color: t < T1 ? INK : t < T2 ? RED_D : GREEN_D }); if (t > T2 - 3) ring(x, cam); if (t > 14.8) tag(x, '虚线是本来的十万', W / 2, 420 * UI, { size: 66, alpha: ss(12.8, 13.1, t) }); } });
  // 为什么：涨五万，跌七万五
  const A = B(8), M = 19.85, E0 = 23.1;
  sh.push({ a: A, scene, samples: 12, ink: true,
    update(t, l, pp) { white({ balls: 0, only: [melt.mesh] }); bright(pp); fix(cam, 5);
      const red = [...tintOf(2).slice(0, 3), 0], g = tintOf(-1);
      if (t < M) { const k = E.io3(seg(t, A + .9, A + 2.2)), r = rv(1e5), s = rv(5e4), m = lerp(r, rv(1.5e5), ss(.8, 1, k)); melt.set([{ x: -.25 * (1 - k), y: YY, z: m + .02, r: m, c: [1, 1, 1, 0] }, { x: lerp(.72, .1, k), y: YY, z: s + .02, r: s * (1 - ss(.75, 1, k) * .9), c: [...tintOf(2)] }], .12); }
      else { const k = E.io3(seg(t, M + .5, M + 2.2)), r = rv(1.5e5), s = rv(7.5e4), m = lerp(r, s, ss(0, .4, k)); melt.set([{ x: lerp(0, -.3, k), y: YY, z: m + .02, r: m, c: [1, 1, 1, 0] }, { x: lerp(.1, 1.15, k), y: YY, z: s + .02, r: s * ss(0, .3, k), c: [...g] }], .12); }
      return cam; },
    label(x, t) { if (t < M) { tag(x, '+5 万', W / 2, 300 * UI, { size: 150, weight: 900, color: RED_D, alpha: ss(A + .3, A + .7, t) }); } else { tag(x, '−7.5 万', W / 2, 300 * UI, { size: 150, weight: 900, color: GREEN_D, alpha: ss(M + .1, M + .5, t) }); } } });
  // 回不来：同一个机位，虚线圈是本金
  const C = B(40), H1 = 84.8, H2 = 88.2, H3 = 90.8, H4 = 94.2, H5 = B(48);
  const dark = pp => { pp.vig = .4; pp.threshold = 1.3; pp.bloom = .1; pp.grain = .02; pp.lift = [0, 0, 0]; pp.exposure = 1.1; pp.sat = 1.14; };
  const v2 = t => { if (t < H1 + .4) return 1e5; if (t < H2) return Math.exp(lerp(Math.log(1e5), Math.log(5e4), E.io3(seg(t, H1 + .4, H1 + 1.3)))); if (t < H3) return Math.exp(lerp(Math.log(5e4), Math.log(1e5), E.io3(seg(t, H2 + .1, H2 + 1.6)))); if (t < H4) return Math.exp(lerp(Math.log(1e5), Math.log(1e4), E.io3(seg(t, H3 + .1, H3 + .9)))); return Math.exp(lerp(Math.log(1e4), Math.log(1e5), E.io2(seg(t, H4, H5 - .2)))); };
  sh.push({ a: C, scene, samples: 12,
    update(t, l, pp) { c.setRoom(.55, .13, 1.4); c.show({ balls: 1, ballShadow: 0 }); dark(pp); const v = v2(t), r = rv(v), q = tv(v * (v < 1e5 ? 1 : 1)); balls.set(0, 0, YY, r, r, q[0], q[1], q[2], q[3]); balls.commit(1); fix(cam); return cam; },
    label(x, t) { ring(x, cam, 0, 0, 1e5, false); const big = t < H1 ? '' : t < H2 ? '−50%' : t < H3 ? '+100%' : t < H4 ? '−90%' : '+900%', col = t < H2 ? GREEN_L : t < H3 ? RED_L : t < H4 ? GREEN_L : RED_L; if (big) tag(x, big, W / 2, 320 * UI, { size: 170, weight: 900, color: col, shadow: 16 }); } });
  // 留一半：灯重新亮起
  const D = B(48), S0 = 102.8, S1 = 106.2;
  sh.push({ a: D, scene, samples: 12, ink: true,
    update(t, l, pp) { const on = ss(D, D + 1.4, t); c.setRoom(lerp(.3, 1, on), on, .2); c.show({ plate: 1, balls: 0, only: [melt.mesh] }); plate.material.uniforms.uLine.value = 0; bright(pp); fix(cam, lerp(5.4, 6.3, E.io3(seg(t, S0, S0 + 1.3))));
      const k = E.io3(seg(t, S0, S0 + 1.3)), d = E.io3(seg(t, S1, S1 + 1)), R5 = rv(5e4), m = lerp(rv(1e5), R5, ss(0, .35, k)), rr = Math.exp(lerp(Math.log(R5), Math.log(rv(2.5e4)), d));
      melt.set([{ x: lerp(0, -.52, k), y: YY, z: m + .02, r: m, c: [1, 1, 1, 0] }, { x: lerp(0, .52, k), y: YY, z: rr + .02, r: lerp(.001, rr, ss(0, .3, k)), c: [...tintOf(-1 * d)] }], .1); return cam; },
    label(x, t) { const a = ss(S0 + 1, S0 + 1.4, t), d = ss(S1, S1 + .5, t); tag(x, '留着', 400 * UI, 300 * UI, { size: 84, alpha: a, weight: 900 }); tag(x, '¥50,000', 400 * UI, 420 * UI, { size: 100, alpha: a, weight: 900 }); tag(x, '押上', 1040 * UI, 300 * UI, { size: 84, alpha: a, weight: 900 }); tag(x, wan(lerp(50000, 25000, d)), 1040 * UI, 420 * UI, { size: 100, alpha: a, weight: 900, color: d > 0 ? GREEN_D : INK }); tag(x, '一共 ¥75,000', W / 2, 1400 * UI, { size: 120, weight: 900, alpha: ss(S1 + .6, S1 + 1, t) }); } });
  return sh;
}
