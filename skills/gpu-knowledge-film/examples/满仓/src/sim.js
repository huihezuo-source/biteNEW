// 《满仓》的赌局：一万人，一百局，种子固定。片中所有数字都从这里算出来。
export const N = 10000, R = 100, START = 10000, SEED = 1956;
export const lnU = f => Math.log(1 + .5 * f), lnD = f => Math.log(1 - .4 * f);
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const bits = new Uint8Array(N * R);     // 1 = 往右（涨）
export const kAt = new Uint8Array(N * (R + 1)); // 前 n 局往右的次数
{ const r = mulberry(SEED); for (let i = 0; i < N; i++) { let k = 0; for (let n = 0; n < R; n++) { const b = r() < .5 ? 1 : 0; bits[i * R + n] = b; kAt[i * (R + 1) + n] = k; k += b; } kAt[i * (R + 1) + R] = k; } }
export const worth = (i, n, f = 1) => { const k = kAt[i * (R + 1) + n]; return START * Math.exp(k * lnU(f) + (n - k) * lnD(f)); };
export function stats(f = 1) {
  const out = []; const a = new Float64Array(N);
  for (let n = 0; n <= R; n++) {
    let s = 0, lose = 0; for (let i = 0; i < N; i++) { const w = worth(i, n, f); a[i] = w; s += w; if (w < START - 1e-6) lose++; }
    const b = Float64Array.from(a).sort(); out.push({ n, mean: s / N, median: (b[N / 2 - 1] + b[N / 2]) / 2, lose, max: b[N - 1], min: b[0], share: b[N - 1] / s });
  }
  return out;
}
// 中间那个人：一百局后正好 50 涨 50 跌，第 20、50 局也正好涨跌各半，且一路最贴近“涨跌各半”
export const HERO = (() => { let best = -1, bd = 1e9; const K = n => i => kAt[i * (R + 1) + n]; for (let i = 0; i < N; i++) { if (K(R)(i) !== 50 || K(20)(i) !== 10 || K(50)(i) !== 25) continue; let d = 0; for (let n = 1; n < R; n++) d = Math.max(d, Math.abs(K(n)(i) - n / 2)); if (d < bd) { bd = d; best = i; } } return best; })();
export const RICH = (() => { let b = 0; for (let i = 1; i < N; i++) if (kAt[i * (R + 1) + R] > kAt[b * (R + 1) + R]) b = i; return b; })();
