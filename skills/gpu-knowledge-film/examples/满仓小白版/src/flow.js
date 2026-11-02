import { N, R, START, kAt, HERO, lnU, lnD, stats, worth } from './sim.js';
import { Y0, DY, R0, ballAt, tintOf, radiusOf, FLOOR_Y, zj, xAt, jx, jy } from './machine.js';
import { SILO, slot } from './silo.js';
import { lerp, clamp, ss, E, rng } from './core.js';
import { B } from './script.js';

export const GATE = B(16);                // 闸门：片名那一下
export const DRAIN = 3.4;                 // 全部流空用时
export const delay = Float32Array.from({ length: N }, (_, i) => DRAIN * slot.rank[i] / N);
export const S1 = stats(1), S25 = stats(.25);

// 第一跑：x = t − delay，row = RUN1(x)
// 读数停表：第 20 局、第 50 局波带收拢，停住
const K1 = [[GATE + .3, 0], [36.6, .6], [38.2, 1], [40.2, 2], [42.2, 3], [44, 5], [46, 8], [49, 14], [55, 35], [59, 62], [61.6, 100]];
export function curve(K, x) { if (x <= K[0][0]) return K[0][1] + (x - K[0][0]) * .5; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) { const [a, u] = K[i - 1], [b, v] = K[i]; return lerp(u, v, (x - a) / (b - a)); } return K[K.length - 1][1]; }
export const run1 = x => curve(K1, x);
export const bandRow = t => clamp(run1(t - DRAIN * .5), 0, 100);   // 读数：波带的中间

const o = {};
// 落进仓：从高到低，下落。rain=[Ta,Tb]
const G = 26;
export function fillRain(balls, t, Ta, Tb, upto = N) {
  let m = 0;
  for (let i = 0; i < N; i++) {
    if (slot.rank[i] >= upto) continue;
    const tf = Ta + (Tb - Ta) * Math.pow(slot.rank[i] / upto, .9) + jx[i] * 1.1, d = tf - t;
    let y = slot.y[i]; if (d > 0) y += 8.5 * d + .9 * d * d; else { const b = -d; if (b < .3) y += .14 * Math.exp(-b * 8) * Math.abs(Math.sin(b * 22)); }
    balls.set(m++, slot.x[i], y, slot.z[i], y > 200 ? 0 : R0, 1, 1, 1, 0);
  }
  balls.commit(m);
}
// 闸门之后：仓里下沉 → 漏斗 → 上板 → 第 100 局落地散开
const LAND = 61.6;                   // run1(x)=100 的 x
export const fin = { x: new Float32Array(N), z: new Float32Array(N), r: new Float32Array(N), l: new Float32Array(N), order: null };
{
  const a = Math.log(1.5), b = Math.log(.5), r = rng(4242);
  for (let i = 0; i < N; i++) { const k = kAt[i * (R + 1) + R], l = k * a + (R - k) * b; fin.l[i] = l; fin.r[i] = radiusOf(l) * 5; fin.x[i] = (k - 50) * .62 - 5 + (r() + r() - 1) * .9; fin.z[i] = Math.max(fin.r[i] + .3, .6 + r() * 11); }
  fin.order = Array.from({ length: N }, (_, i) => i).sort((p, q) => fin.r[q] - fin.r[p]);
  // 大球贴着板子排开，只在 x 方向互相推，给镜头留出地面
  const top = fin.order.slice(0, 260), zmax = i => Math.max(fin.r[i] + .3, 8.5 - fin.r[i]);
  for (const i of top) fin.z[i] = Math.min(fin.z[i], zmax(i));
  for (let it = 0; it < 300; it++) for (let p = 0; p < top.length; p++) for (let q = p + 1; q < top.length; q++) { const i = top[p], j = top[q], dx = fin.x[j] - fin.x[i], dz = fin.z[j] - fin.z[i], d = Math.hypot(dx, dz) + 1e-6, m = fin.r[i] + fin.r[j] + .04; if (d < m) { const push = m - d, wj = p === 0 ? 1 : .5, wi = p === 0 ? 0 : .5; const ux = (dx >= 0 ? 1 : -1) * Math.max(Math.abs(dx / d), .55), uz = dz / d * .6; fin.x[j] += ux * push * wj; fin.x[i] -= ux * push * wi; fin.z[j] = clamp(fin.z[j] + uz * push * wj, fin.r[j] + .3, zmax(j)); fin.z[i] = clamp(fin.z[i] - uz * push * wi, fin.r[i] + .3, zmax(i)); } }
}
export function flowRun(balls, t, f = 1, opt = {}) {
  const drop = (t - GATE) * (SILO.levelTop - SILO.bot) / DRAIN; const skip = opt.skip || 1, jit = opt.jit || 0; let n = 0;
  const add = i => {
    const enter = GATE + delay[i], yy = slot.y[i] - drop;
    if (t < enter + .22 && yy > SILO.bot - .4) { balls.set(n++, slot.x[i], Math.max(yy, SILO.bot + R0), slot.z[i], R0, 1, 1, 1, 0); return; }
    if (t < enter + .22) return;
    const x = t - delay[i]; let row = run1(x); if (row > 2 && row < 100 && i !== HERO) { const n_ = Math.floor(row), k_ = kAt[i * (R + 1) + n_], dv = 2 * k_ - n_; row -= Math.min(.24 * dv * dv / (n_ + 6), 7); }
    if (row < 0) { const k = clamp(1 + row * 2); balls.set(n++, lerp(slot.x[i], 0, k), Y0 + .3 + 2.6 * (1 - k), lerp(slot.z[i], .2, k), R0, 1, 1, 1, 0); return; }
    if (x > LAND) { landBall(balls, n++, i, x - LAND, o); return; }
    ballAt(i, row, f, o, i === HERO ? 0 : jit); const c = tintOf(o.lnW); balls.set(n++, o.x, o.y, o.z, o.r, c[0], c[1], c[2], c[3]);
  };
  for (let i = 0; i < N; i += skip) add(i);
  if (skip > 1 && opt.must) for (const i of opt.must) add(i);
  balls.commit(n); return n;
}
function landBall(balls, n, i, dt, o) {
  ballAt(i, R - .001, 1, o);
  const k = E.out3(clamp(dt / 1.0)), r = fin.r[i], h = Math.exp(-dt * 3.2) * Math.abs(Math.cos(dt * 9)) * (1 - k * .4) * Math.min(2.2, r * 3 + .5);
  const c = tintOf(fin.l[i]);
  balls.set(n, lerp(o.x, fin.x[i], k), Math.max(FLOOR_Y + r, lerp(o.y, FLOOR_Y + r, Math.min(1, dt * 3)) + h * Math.min(1, dt * 6)), lerp(o.z, fin.z[i], k), r, c[0], c[1], c[2], c[3]);
}
