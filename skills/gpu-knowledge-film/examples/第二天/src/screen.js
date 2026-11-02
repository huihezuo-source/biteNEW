import * as THREE from 'three';
import { DATA } from './data.js';
import { clamp, ss, lerp } from './core.js';

// 手机屏幕：一张画布，每帧按状态画一次
const c = document.createElement('canvas'); c.width = 540; c.height = 1170;
const x = c.getContext('2d');
export const screenTex = new THREE.CanvasTexture(c); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = 8;
const G = '#14E67A', R = '#FF3A30', W_ = '#F2F5F2', DIM = '#6F8C7E';
let last = '';
const font = (s, w = 800, f = 'NSans') => `${w} ${s}px ${f}`;
function top(a = 1) {
  x.globalAlpha = a; x.fillStyle = W_; x.font = font(30, 700, 'JB'); x.textAlign = 'left'; x.fillText('14:50', 34, 52);
  x.textAlign = 'right'; x.font = font(26, 500); x.fillStyle = DIM; x.fillText('2025-04-07', 506, 52); x.globalAlpha = 1;
}
// 真实日线：2025-04-07 之前 40 天，最后一根是 −7.34%
function kline(y0, y1, cut = 1) {
  const a = DATA.before.slice(-24), n = a.length, lo = Math.min(...a) * .985, hi = Math.max(...a) * 1.006, Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0), bw = 460 / n;
  for (let i = 1; i < n; i++) {
    if (i / (n - 1) > cut) break;
    const up = a[i] >= a[i - 1], xx = 40 + i * bw, yo = Y(a[i - 1]), yc = Y(a[i]);
    x.fillStyle = up ? R : G; x.fillRect(xx, Math.min(yo, yc), bw * .7, Math.max(3, Math.abs(yc - yo)));
  }
  return [40 + (n - 1) * bw + bw * .35, Y(a[n - 1])];
}
function sellBtn(g = 1) {
  x.save(); x.globalAlpha = 1; x.fillStyle = `rgba(20,230,122,${.9 * g + .1})`; x.beginPath(); x.roundRect(40, 1000, 460, 116, 24); x.fill();
  x.fillStyle = '#02140B'; x.font = font(62, 900); x.textAlign = 'center'; x.fillText('卖 出', 270, 1080); x.restore();
}
export function drawScreen(mode, k = 0) {
  const key = mode + Math.round(k * 200); if (key === last) return; last = key;
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#020604'; x.fillRect(0, 0, 540, 1170); x.textBaseline = 'alphabetic';
  if (mode === 'chart' || mode === 'chart0') {
    const g = x.createLinearGradient(0, 200, 0, 1000); g.addColorStop(0, 'rgba(10,120,70,.0)'); g.addColorStop(1, 'rgba(10,160,90,.28)'); x.fillStyle = g; x.fillRect(0, 0, 540, 1170);
    top(); x.textAlign = 'left'; x.fillStyle = DIM; x.font = font(30, 500); x.fillText('上证指数', 36, 130);
    x.fillStyle = G; x.font = font(96, 800, 'JB'); x.fillText('−7.34%', 32, 236);
    const [sx, sy] = kline(310, 900, 1);
    x.save(); x.strokeStyle = W_; x.lineWidth = 3; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(36, sy + 2); x.lineTo(506, sy + 2); x.stroke(); x.restore();
    x.fillStyle = W_; x.beginPath(); x.arc(sx - 24, sy + 54, 30, 0, 7); x.fill(); x.fillStyle = '#033'; x.font = font(36, 900); x.textAlign = 'center'; x.fillText('卖', sx - 24, sy + 67);
    if (mode === 'chart') sellBtn();
  } else if (mode === 'heat') {          // 个股热力图：缩小的绿色城市俯视
    const cols = 16, rows = 34, s = 30, ox = (540 - cols * s) / 2, oy = (1170 - rows * s) / 2;
    let h = 12345; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { h = (h * 1103515245 + 12345) & 0x7fffffff; const r = (h >> 8) % 100; x.fillStyle = r < 58 ? '#0DFF84' : r < 96 ? '#0B9455' : '#FF3A30'; x.fillRect(ox + i * s + 2, oy + j * s + 2, s - 4, s - 4); }
  } else if (mode === 'clock') {
    x.fillStyle = W_; x.font = font(150, 800, 'JB'); x.textAlign = 'center'; x.fillText('14:50', 270, 470);
    x.font = font(38, 500); x.fillStyle = DIM; x.fillText('还有 10 分钟收盘', 270, 556);
    x.fillStyle = G; x.font = font(60, 800, 'JB'); x.fillText('−8,640 元', 270, 720); x.font = font(30, 500); x.fillStyle = DIM; x.fillText('今日盈亏', 270, 770);
    sellBtn(.6 + .4 * Math.sin(k * 20));
  } else if (mode === 'after') {         // 卖出之后：S 标在最低点，右边一路红
    top(); x.textAlign = 'left'; x.fillStyle = DIM; x.font = font(30, 500); x.fillText('你卖出之后', 36, 130);
    const a = DATA.apr.closes.slice(0, 60), lo = 3060, hi = 3360, Y = v => 960 - (v - lo) / (hi - lo) * 660, n = Math.max(2, Math.round(a.length * k)), bw = 460 / a.length;
    for (let i = 1; i < n; i++) { const up = a[i] >= a[i - 1]; x.fillStyle = up ? R : G; x.fillRect(40 + i * bw, Math.min(Y(a[i]), Y(a[i - 1])), bw * .72, Math.max(3, Math.abs(Y(a[i]) - Y(a[i - 1])))); }
    x.fillStyle = W_; x.beginPath(); x.arc(52, Y(a[0]) + 46, 28, 0, 7); x.fill(); x.fillStyle = '#033'; x.font = font(34, 900); x.textAlign = 'center'; x.fillText('卖', 52, Y(a[0]) + 58);
  } else if (mode === 'sold') {
    x.fillStyle = W_; x.font = font(66, 800); x.textAlign = 'center'; x.globalAlpha = k; x.fillText('已成交', 270, 560); x.globalAlpha = 1;
  }
  screenTex.needsUpdate = true;
}
