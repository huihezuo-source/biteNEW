import { N, R, HERO, kAt, worth } from '../sim.js';
import { Y0, DY, R0, PEG_R, FLOOR_Y, xAt, tintOf, U, radiusOf, moneyFmt } from '../machine.js';
import { fin, S1 } from '../flow.js';
import { plainBalls } from './plain.js';
import { machineCam, lampsAll } from './run.js';
import { camSet, proj, tag, pxPerUnit, INK, RED_D, GREEN_D, RED_L, GREEN_L, WHITE } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E } from '../core.js';
import { B } from '../script.js';

const T0 = B(1, 3), HIT1 = B(3), HIT2 = B(5), M0 = 11.9, PULL = 13.4, END = B(8);
const L15 = Math.log(1.5), L06 = Math.log(.6);
const pegY = n => Y0 - n * DY;
const ZB = .17;

// 回到第一局：10000 → 15000 → 9000
function hero(t) {
  const out = {}, rOf = radiusOf;
  if (t < HIT1) {
    const k = seg(t, T0, HIT1), r = rOf(0);
    out.x = -.014; out.y = pegY(0) + r + PEG_R + .95 * (1 - k * k); out.l = 0;
  } else if (t < HIT2) {
    const k = (t - HIT1) / (HIT2 - HIT1), l = L15 * ss(0, .1, k), r = rOf(l);
    out.x = lerp(-.014, xAt(1, 1) - .012, k); out.y = lerp(pegY(0) + rOf(0) + PEG_R, pegY(1) + r + PEG_R, k * k) + .3 * 4 * k * (1 - k); out.l = l;
  } else {
    const k = clamp((t - HIT2) / (HIT2 - HIT1)), l = L15 + L06 * ss(0, .1, k), r = rOf(l);
    out.x = lerp(xAt(1, 1) - .012, xAt(2, 1), k); out.y = lerp(pegY(1) + rOf(L15) + PEG_R, pegY(2) + r + PEG_R, k * k) + .26 * 4 * k * (1 - k); out.l = l;
  }
  out.r = rOf(out.l); out.z = ZB + out.r * .1; return out;
}
export function bright(pp) { pp.exposure = 1.3; pp.threshold = 4.; pp.vig = .1; pp.bloom = .05; pp.grain = .012; pp.contrast = 1.05; pp.lift = [0, 0, 0]; pp.sat = 1.12; }
const night = pp => { pp.vig = .4; pp.threshold = 1.1; pp.bloom = .13; pp.grain = .02; pp.lift = [0, 0, 0]; pp.sat = 1.16; pp.exposure = 1.25; };

export function hookShots(c) {
  const { scene, balls, cam, plate, pegs, floor } = c;
  const sh = [];
  // 冷开场：先给结果
  const coldBase = (key, strip, fill) => { c.setRoom(key, Math.max(key * .4, .012), strip); c.show({ plate: 1, pegs: 1, balls: 1, ballShadow: 0, mirror: 1, fill, only: [floor] }); pegs.setF(1); plate.material.uniforms.uLine.value = 0; };
  sh.push({ a: 0, scene, samples: 12, subDark: .7,
    update(t, l, pp) { coldBase(.1, 2, .8); night(pp); plainBalls(balls, 85); const k = seg(t, 0, 2.05); camSet(cam, [lerp(-3, 1, k), FLOOR_Y + 4 + k * .6, 36 - k * 1.5], [lerp(6.5, 8, k), FLOOR_Y + 8.2, 0], 40); return cam; },
    label(x, t) { tag(x, moneyFmt(S1[100].mean), W / 2, 270 * UI, { size: 160, color: RED_L, weight: 900, shadow: 26 }); tag(x, '平均每人', W / 2, 130 * UI, { size: 72, color: WHITE, shadow: 18 }); } });
  sh.push({ a: 2.05, scene, samples: 14, subDark: .7,
    update(t, l, pp) { coldBase(.05, 2, .55); night(pp); pp.exposure = 1; plainBalls(balls, 85, 0, 1, HERO); const hx = fin.x[HERO], hz = fin.z[HERO], k = seg(t, 2.05, T0); camSet(cam, [hx - .2 + .08 * k, FLOOR_Y + .09, hz + .62 - k * .14], [hx, FLOOR_Y + .05, hz], 22); pp.aperture = .004; pp.focus = .6; return cam; },
    label(x, t) { tag(x, '¥52', W / 2, 310 * UI, { size: 230, color: GREEN_L, weight: 900, shadow: 26 }); tag(x, '你', W / 2, 130 * UI, { size: 72, color: WHITE, shadow: 18 }); } });
  // 白棚：同一机位比例，球原地胀缩
  const base = hi => { c.setRoom(1, 1, .2); c.show({ plate: 1, pegs: 1, hi, balls: 1 }); plate.material.uniforms.uLine.value = 0; pegs.setF(1); };
  const put = t => { const o = hero(t), a = tintOf(o.l); balls.set(0, o.x, o.y, o.z, o.r, a[0], a[1], a[2], a[3]); balls.commit(1); return o; };
  const kick = (pp, t, h) => { if (t >= h && t < h + .3) { const e = 7 * UI * Math.exp(-(t - h) * 12); pp.shakeX = e * Math.sin(t * 90); pp.shakeY = e * Math.cos(t * 77); } };
  const ring = (x, t) => { const o = hero(t), p = proj(cam, o.x, o.y, o.z), r = R0 * pxPerUnit(cam, o.z); x.save(); x.strokeStyle = 'rgba(16,19,22,.55)'; x.lineWidth = 3 * UI; x.setLineDash([14 * UI, 12 * UI]); x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.stroke(); x.restore(); };
  sh.push({ a: T0, scene, samples: 16, ink: true,
    update(t, l, pp) { base(1); bright(pp); const o = put(t), f = ss(HIT1 - .9, HIT1, t); camSet(cam, [o.x + .05, o.y - .02 - f * .04, 1.95], [o.x, o.y - .02 - f * .04, .05], 24); pp.aperture = .0028; pp.focus = 1.78; kick(pp, t, HIT1); kick(pp, t, HIT2); return cam; },
    label(x, t) { const a0 = 1 - ss(HIT1, HIT1 + .15, t), a1 = ss(HIT1 + .05, HIT1 + .3, t) * (1 - ss(HIT2, HIT2 + .15, t)), a2 = ss(HIT2 + .05, HIT2 + .3, t);
      if (t > HIT1) ring(x, t);
      tag(x, '¥10,000', W / 2, 300 * UI, { size: 112, alpha: a0, halo: 24, weight: 900 });
      tag(x, '+50%', W / 2, 210 * UI, { size: 170, color: RED_D, alpha: a1, weight: 900, halo: 26 }); tag(x, '¥15,000', W / 2, 360 * UI, { size: 92, alpha: a1, halo: 22 });
      tag(x, '−40%', W / 2, 210 * UI, { size: 170, color: GREEN_D, alpha: a2, weight: 900, halo: 26 }); tag(x, '¥9,000', W / 2, 360 * UI, { size: 92, alpha: a2, halo: 22 }); } });
  // 左右对称，球一颗颗撞上去，一右一左
  const seq = [1, 0, 0, 1, 0, 1];
  sh.push({ a: M0, scene, samples: 16, ink: true,
    update(t, l, pp) { base(1); bright(pp);
      const T = .50608, t0 = M0 - .35; let n = 0; const yp = pegY(1), xp = xAt(1, 1);
      for (let i = 0; i < 6; i++) { const s = (t - t0 - i * T * .5) / (T * 1.7); if (s < 0 || s > 1.8) continue; const dir = seq[i] ? 1 : -1, r0 = radiusOf(0);
        let x, y, l2 = 0;
        if (s < .4) { const k = s / .4; x = xp - .008 * dir; y = yp + r0 + PEG_R + 1.2 * (1 - k * k); }
        else { const k = (s - .4) / .6; l2 = (dir > 0 ? L15 : L06) * ss(0, .22, k); x = xp + dir * .52 * k; y = yp + r0 + PEG_R + .36 * 4 * k * (1 - k) - .55 * k * k; }
        const a = tintOf(l2); balls.set(n++, x, y, ZB, radiusOf(l2), a[0], a[1], a[2], a[3]); }
      balls.commit(n);
      camSet(cam, [xp, yp + .2, 3.9], [xp, yp + .2, 0], 24); pp.aperture = .003; pp.focus = 3.75; return cam; },
    label(x, t) { const a = ss(M0, M0 + .2, t); tag(x, '往左', 250 * UI, 300 * UI, { size: 92, color: GREEN_D, alpha: a }); tag(x, '50%', 250 * UI, 420 * UI, { size: 92, color: GREEN_D, alpha: a, weight: 900 }); tag(x, '往右', 1190 * UI, 300 * UI, { size: 92, color: RED_D, alpha: a }); tag(x, '50%', 1190 * UI, 420 * UI, { size: 92, color: RED_D, alpha: a, weight: 900 }); } });
  // 拉开，一颗球走完一百局，身后留下一条线；灯板在顶上
  const WALK0 = PULL + .5, WALK1 = END - .22, rowOf = t => clamp(2 + 98 * E.in2(seg(t, WALK0, WALK1)), 2, 100);
  const pos = r => { const n = Math.min(R - 1, Math.floor(r)), s_ = r - n, k0 = kAt[HERO * (R + 1) + n], k1 = kAt[HERO * (R + 1) + n + 1]; return [lerp(xAt(n, k0), xAt(n + 1, k1), s_), Y0 - r * DY]; };
  sh.push({ a: PULL, scene, samples: 12, ink: true,
    update(t, l, pp) { c.setRoom(1, 1, .2); c.show({ plate: 1, pegs: 1, balls: 1, lamps: 1 }); pegs.setF(1); lampsAll(c, 3); bright(pp); plate.material.uniforms.uLine.value = ss(WALK0, WALK0 + .6, t);
      const k = E.io3(seg(t, PULL, WALK0 + .5)); machineCam(cam, k, pegY(1), xAt(1, 1));
      const r = rowOf(t), p = pos(r), a = tintOf(Math.log(worth(HERO, Math.floor(r)) / 10000)); balls.set(0, p[0], p[1] + .1, .2, lerp(.4, .26, seg(t, WALK0, WALK1)), a[0], a[1], a[2], a[3]); balls.commit(1); return cam; },
    label(x, t) { const r = rowOf(t), a = ss(WALK0, WALK0 + .4, t); if (a <= 0) return; x.save(); x.globalAlpha = a; x.strokeStyle = '#101316'; x.lineWidth = 4 * UI; x.lineJoin = 'round'; x.beginPath(); for (let q = 2; q <= r; q += 1) { const p = pos(q), s = proj(cam, p[0], p[1], .2); q === 2 ? x.moveTo(s[0], s[1]) : x.lineTo(s[0], s[1]); } const p = pos(r), s = proj(cam, p[0], p[1], .2); x.lineTo(s[0], s[1]); x.stroke(); x.restore();
      tag(x, `第 ${Math.max(1, Math.round(r))} 局`, Math.min(s[0] + 220 * UI, W - 200 * UI), Math.min(s[1], 1400 * UI), { size: 74, alpha: a, halo: 22, weight: 900 }); } });
  return sh;
}
