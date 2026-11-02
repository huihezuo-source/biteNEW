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
const K1 = [[GATE + .3, 0], [36.6, .6], [38.2, 1], [40.2, 2], [42.2, 3], [44, 5], [46, 10], [47.35, 20], [53.7, 20.3], [63.55, 38], [69.9, 50], [75.9, 50.3], [76.6, 58], [78, 100]];
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
const LAND = 78;                   // run1(x)=100 的 x
export const fin = { x: new Float32Array(N), z: new Float32Array(N), r: new Float32Array(N), l: new Float32Array(N), order: null };
{
  const a = Math.log(1.5), b = Math.log(.6), r = rng(4242);
  for (let i = 0; i < N; i++) { const k = kAt[i * (R + 1) + R], l = k * a + (R - k) * b; fin.l[i] = l; fin.r[i] = radiusOf(l); fin.x[i] = xAt(R, k) + (r() + r() - 1) * 1.5; fin.z[i] = Math.max(fin.r[i] + .3, .6 + r() * 11); }
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
// 第二跑：同样的左右，仓位 25%
const K2 = [[132.2, 0], [134.2, 2], [136, 8], [137.6, 18], [140.8, 34], [142.4, 70], [143.4, 100]];
export const run2 = x => curve(K2, x);
export const band2 = t => clamp(run2(t - 1.0), 0, 100);
export const delay2 = Float32Array.from({ length: N }, (_, i) => 2 * slot.rank[i] / N);
// 第二跑落地：钟形山。按到达先后一层层垒，深度八排
export const heap = { x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N) };
{
  const r = rng(808), bins = new Map();
  const ids = Array.from({ length: N }, (_, i) => i).sort((p, q) => delay2[p] - delay2[q]);
  for (const i of ids) { const k = kAt[i * (R + 1) + R]; const j = bins.get(k) || 0; bins.set(k, j + 1);
    const col = j % 3, dep = Math.floor(j / 3) % 8, lay = Math.floor(j / 24);
    heap.x[i] = xAt(R, k, .25) + (col - 1) * .3 + (r() - .5) * .04 + (lay % 2 ? .08 : -.08); heap.y[i] = FLOOR_Y + .17 + lay * .27; heap.z[i] = .22 + dep * .3 + (lay % 2 ? .1 : 0); }
}
const LAND2 = 143.4;
export function flowRun2(balls, t, f, opt = {}) {
  const skip = opt.skip || 1, jit = opt.jit || 0; let n = 0;
  const add = i => { const x = t - delay2[i]; let row = run2(x); if (row <= 0) return; if (row > 2 && row < 100 && i !== HERO) { const n_ = Math.floor(row), k_ = kAt[i * (R + 1) + n_], dv = 2 * k_ - n_; row -= Math.min(.3 * dv * dv / (n_ + 6), 8); row = Math.max(row, .01); }
    ballAt(i, Math.min(row, 99.999), f, o, i === HERO ? 0 : jit); const c = tintOf(o.lnW * 3.6);
    if (x > LAND2) { const k = E.out3(clamp((x - LAND2) / .55)), by = Math.exp(-(x - LAND2) * 6) * Math.abs(Math.sin((x - LAND2) * 13)) * .3; balls.set(n++, lerp(o.x, heap.x[i], k), lerp(o.y, heap.y[i], k) + by, lerp(o.z, heap.z[i], k), o.r, c[0], c[1], c[2], c[3]); return; }
    balls.set(n++, o.x, o.y, o.z, o.r, c[0], c[1], c[2], c[3]); };
  for (let i = 0; i < N; i += skip) add(i);
  if (skip > 1 && opt.must) for (const i of opt.must) add(i);
  balls.commit(n); return n;
}

// 第 20 局排成一队：从穷到富，你站第 5000 位
export const YQ = Y0 - 20 * DY - .7, QS = .2;
export const queue = { rank: new Int32Array(N), l: new Float32Array(N) };
{
  const u = lnU(1), d = lnD(1), ids = Array.from({ length: N }, (_, i) => i), ll = i => kAt[i * (R + 1) + 20] * u + (20 - kAt[i * (R + 1) + 20]) * d;
  ids.sort((p, q) => ll(p) - ll(q) || p - q); const h = ids.indexOf(HERO); ids.splice(h, 1); ids.splice(4999, 0, HERO);
  ids.forEach((id, r) => { queue.rank[id] = r; queue.l[id] = ll(id); });
}
export const queueX = rank => (rank - 4999) * QS;
export const queueBall = (balls, t, t0, t1, cullX) => {
  let n = 0;
  for (let i = 0; i < N; i++) { const qx = queueX(queue.rank[i]), k = E.io3(clamp((t - t0 - jx[i] * .3 - .15) / (t1 - t0 - .3)));
    if (cullX !== undefined && Math.abs(qx - cullX) > 900 && k >= 1) continue;
    ballAt(i, 20, 1, o); const c = tintOf(queue.l[i]), r = radiusOf(queue.l[i]);
    balls.set(n++, lerp(o.x, qx, k), lerp(o.y, YQ + r, k), lerp(o.z, .5 + r, k), r, c[0], c[1], c[2], c[3]); }
  balls.commit(n);
};
// 融资：杠杆推过 100%，同样的一万颗球沿板子往左滑，化成灰
export const run3 = x => curve([[119.5, 0], [121.8, 22], [125.5, 88]], x);
export function flowRun3(balls, t, fOf) {
  let n = 0;
  for (let i = 0; i < N; i += 2) { const x = t - delay2[i] * .7, row = run3(x); if (row <= 0) continue; const f = fOf(x); ballAt(i, Math.min(row, 99.9), f, o); const c = tintOf(o.lnW); balls.set(n++, o.x, o.y, o.z, Math.max(o.r, .075), c[0], c[1], c[2], c[3]); }
  balls.commit(n);
}
