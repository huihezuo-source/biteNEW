import * as THREE from 'three';
import { W, H, UI, clamp, ss, E } from './core.js';

export async function loadFonts() {
  const sample = '分母十万扇窗涨跌连续交易日他说中了次第一二三四五六七八九百千亿元你的是不有在这那和一个人0123456789%+-¥,.，。：？！';
  await Promise.all([
    document.fonts.load(`900 64px NSerif`, sample), document.fonts.load(`700 64px NSerif`, sample), document.fonts.load(`500 64px NSerif`, sample),
    document.fonts.load(`500 64px NSans`, sample), document.fonts.load(`800 64px NSans`, sample), document.fonts.load(`700 64px JB`, '0123456789,.%+-¥'), document.fonts.load(`400 64px JB`, 'ABCDEF0123456789'),
    document.fonts.load(`400 64px LoraV`, 'Abraham Wald 1943'), document.fonts.load(`italic 500 64px LoraI`, 'Semper Augustus'),
  ]);
  await document.fonts.ready;
}

// —— 进 Bloom 的屏幕层（大数字、标注）——
export const hud = (() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = true; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return { c, x, tex, dirty: false, gain: 1,
    clear() { x.clearRect(0, 0, W, H); this.dirty = false; this.gain = 1; },
    commit() { tex.needsUpdate = true; } };
})();

// —— 字幕层（色调映射之后，最清楚）——
export const subs = (() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = true; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  return { c, x, tex };
})();

const COL = { y: '#FFC860', r: '#FF5A4A', g: '#3FE08E', w: '#FFFFFF', b: '#8FD0FF', m: '#FF7FA0' };
// 文本语法：普通字 + {y:高亮}；竖线 | 换行
export function parseRich(s) {
  const lines = s.split('|').map(l => {
    const out = []; let i = 0, cur = '#F4F1EA';
    while (i < l.length) {
      if (l[i] === '{') { const e = l.indexOf('}', i); const inner = l.slice(i + 1, e); const m = inner.match(/^([yrgwbm]):(.*)$/); const col = m ? COL[m[1]] : COL.y; const txt = m ? m[2] : inner; for (const ch of txt) out.push({ ch, col }); i = e + 1; }
      else { out.push({ ch: l[i], col: cur }); i++; }
    }
    return out;
  });
  return lines;
}
export function richWidth(x, chars, track = 0) { let w = 0; for (const c of chars) w += x.measureText(c.ch).width + track; return w - track; }

export function drawRich(x, s, cx, y, opt = {}) {
  const { size = 72, weight = 700, family = 'NSerif', lh = 1.42, align = 'center', alpha = 1, reveal = 1, track = 0, shadow = 0, shadowC = 'rgba(0,0,0,.95)', glow = null } = opt;
  const lines = parseRich(s);
  x.save(); x.font = `${weight} ${size * UI}px ${family}`; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const total = lines.reduce((n, l) => n + l.length, 0); let idx = 0;
  lines.forEach((chars, li) => {
    const w = richWidth(x, chars, track * UI); let px = align === 'center' ? cx - w / 2 : align === 'right' ? cx - w : cx;
    const py = y + li * size * lh * UI;
    for (const c of chars) {
      const k = clamp(reveal * (total + 6) - idx); idx++;
      if (k > 0) {
        x.globalAlpha = alpha * k; x.fillStyle = c.col;
        if (shadow) { x.shadowColor = shadowC; x.shadowBlur = shadow * UI; x.shadowOffsetY = 2 * UI; }
        if (glow) { x.shadowColor = glow; x.shadowBlur = (opt.glowR || 26) * UI; }
        x.fillText(c.ch, px, py);
        if (shadow) x.fillText(c.ch, px, py);
      }
      px += x.measureText(c.ch).width + track * UI;
    }
  });
  x.restore();
}

// 世界里的字：贴在平面上的画布
export function textPlane(str, { size = 200, weight = 900, family = 'NSerif', color = '#fff', pad = 40, track = 0, gain = 1, grad = null, height = 1, additive = true } = {}) {
  const c = document.createElement('canvas'); const x = c.getContext('2d');
  x.font = `${weight} ${size}px ${family}`;
  let w = 0; for (const ch of str) w += x.measureText(ch).width + track; w -= track;
  c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(size * 1.3 + pad * 2);
  x.font = `${weight} ${size}px ${family}`; x.textBaseline = 'middle';
  if (grad) { const g = x.createLinearGradient(0, pad, 0, c.height - pad); grad.forEach(([k, col]) => g.addColorStop(k, col)); x.fillStyle = g; } else x.fillStyle = color;
  let px = pad; for (const ch of str) { x.fillText(ch, px, c.height / 2); px += x.measureText(ch).width + track; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
  m.color.setScalar(gain);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * c.width / c.height, height), m);
  mesh.userData.aspect = c.width / c.height;
  return mesh;
}

// 只存在于水里的字：挂在水面上方、上下翻转，倒影里读起来才是正的
export function waterText(str, opt) { const m = textPlane(str, opt); m.scale.y = -1; m.layers.set(1); return m; }
