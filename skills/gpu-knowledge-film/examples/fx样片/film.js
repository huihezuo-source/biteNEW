import * as THREE from 'three';
import { W, H, UI, renderer, clamp, ss, E } from './core.js';
import { TRANSITIONS } from './fx_transitions.js';
import { timeline, transitionMat } from './fx.js';

const LIST = [
  ['Overexposure', '爆白换世界'], ['FilmBurn', '胶片烧'], ['BurnThrough', '烧穿'], ['InkBleed', '墨迹洇开'], ['WaterDrop', '水滴'],
  ['Ripple', '水波'], ['CrossZoom', '径向冲焦'], ['WhipPan', '甩镜'], ['WhipSpin', '旋转甩镜'], ['Tunnel', '隧道'],
  ['Shatter', '碎裂'], ['Disintegrate', '崩解成沙'], ['PaperTear', '撕纸'], ['GlitchDisplace', '故障错位'], ['StripDatamoshGlitch', '数据花屏'],
  ['TvTurnOff', '关电视'], ['LightStreaks', '光条'], ['DreamyZoom', '梦境推近'], ['DefocusBlur', '失焦换场'], ['Morph', '液化形变'],
  ['DoomMelt', '融化下落'], ['Wind', '风吹散'], ['Refraction', '玻璃折射'], ['GooeyWipe', '黏液抹开'],
];
const ALL = Object.keys(TRANSITIONS).filter(k => k !== 'LissajousTiles').map(k => [k, k]); LIST.length = 0; LIST.push(...ALL);
const SEG = .5, TR = .5;
function candle() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020304);
  const n = 64, g = new THREE.BoxGeometry(1, 1, 1), up = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, .28, .22) }), dn = new THREE.MeshBasicMaterial({ color: new THREE.Color(.12, 2.2, .7) });
  const a = new THREE.InstancedMesh(g, up, n), b = new THREE.InstancedMesh(g, dn, n), m = new THREE.Matrix4(); let v = 0, ia = 0, ib = 0;
  for (let i = 0; i < n; i++) { const d = Math.sin(i * 1.7) * .5 + Math.sin(i * .37) * .9, h = .3 + Math.abs(d) * 1.1; v += d * .32; m.makeScale(.34, h, .34); m.setPosition((i - n / 2) * .55, v, -Math.abs(i - n / 2) * .2); (d > 0 ? a : b).setMatrixAt(d > 0 ? ia++ : ib++, m); }
  a.count = ia; b.count = ib; s.add(a, b);
  const c = new THREE.PerspectiveCamera(36, W / H, .1, 200);
  return { scene: s, cam: t => { c.position.set(Math.sin(t * .23) * 9, 2 + Math.sin(t * .31) * 2, 18); c.lookAt(0, .5, 0); return c; } };
}
function orb() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x05070a);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: .42, metalness: .1 })); f.rotation.x = -Math.PI / 2; s.add(f);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(1, .62, .16), roughness: .22, metalness: .92, emissive: new THREE.Color(.5, .2, .03) })); ball.position.y = 1.5; s.add(ball);
  const L = new THREE.SpotLight(0xfff0d8, 900, 40, .42, .6, 2); L.position.set(3, 12, 4); s.add(L, L.target); L.target.position.set(0, 1, 0);
  s.add(new THREE.HemisphereLight(0x3a4a60, 0x05060a, 1.2));
  const c = new THREE.PerspectiveCamera(32, W / H, .1, 200);
  return { scene: s, cam: t => { c.position.set(Math.sin(t * .5) * 9, 3.4, Math.cos(t * .5) * 9); c.lookAt(0, 1.5, 0); return c; } };
}
function stars() {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x01020a); const n = 9000, p = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), .6) * 26, a = i * 2.399 + r * .45; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = (Math.random() - .5) * 1.6; p[i * 3 + 2] = Math.sin(a) * r; const k = 1 - r / 26; col[i * 3] = .6 + 3 * k; col[i * 3 + 1] = .7 + 2 * k; col[i * 3 + 2] = 1.6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .12, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.add(pts);
  const c = new THREE.PerspectiveCamera(40, W / H, .1, 200);
  return { scene: s, cam: t => { pts.rotation.y = t * .12; c.position.set(0, 10, 22); c.lookAt(0, 0, 0); return c; } };
}
export async function buildFilm() {
  // 全部转场先编译一遍，报错的列出来
  const bad = []; renderer.debug.onShaderError = (gl, prog, vs, fs) => { bad.push((gl.getShaderInfoLog(fs) || '').slice(0, 160)); };
  const names = Object.keys(TRANSITIONS); const failed = [];
  const tmp = new THREE.WebGLRenderTarget(8, 8);
  const { blit } = await import('./core.js');
  for (const k of names) { const n0 = bad.length; try { blit(transitionMat(k), tmp); } catch (e) { bad.push(String(e)); } if (bad.length > n0) failed.push(k + ': ' + bad[bad.length - 1].replace(/\s+/g, ' ')); }
  renderer.debug.onShaderError = null;
  fetch('/log', { method: 'POST', body: `转场编译 ${names.length} 个，失败 ${failed.length}\n` + failed.join('\n') });

  const W3 = [candle(), orb(), stars()];
  const shots = LIST.map((_, i) => { const w = W3[i % 3]; return { a: i * SEG, b: (i + 1) * SEG, scene: w.scene, samples: 4, update(t, l, pp) { return w.cam(t); } }; });
  const FX = [['shock', '冲击波'], ['rays', '体积光'], ['glitch', '故障'], ['ink', '一帧墨纸'], ['lens', '桶形畸变']];
  const t0 = LIST.length * SEG;
  FX.forEach(([fx], i) => { const w = W3[(i + 1) % 3], a = t0 + i * 2.2; shots.push({ a, b: a + 2.2, scene: w.scene, samples: 4, update(t, l, pp) {
    const k = clamp(l / 1.4); pp.fx = pp.fx || [];
    if (fx === 'shock') pp.fx.push({ fx, k: E.out3(k) * 1.3, c: [.5, .55], w: .13, amp: .05, split: .02, col: [.9, .7, .4] });
    if (fx === 'rays') pp.fx.push({ fx, k: 2.4 * ss(0, .5, l), c: [.5, .62], decay: .975, thr: .9, col: [1, .85, .6] });
    if (fx === 'glitch') pp.fx.push({ fx, k: l % .7 < .28 ? .9 : 0 });
    if (fx === 'ink') pp.fx.push({ fx, k: Math.floor(l * 30) % 18 < 2 ? 1 : 0, thr: .35 });
    if (fx === 'lens') pp.fx.push({ fx, k: 1.2 * Math.exp(-l * 3), c: [.5, .5] });
    return w.cam(t); } }); });
  const total = t0 + FX.length * 2.2;
  const shotAt = t => { let s = shots[0]; for (const x of shots) if (t >= x.a) s = x; return s; };
  const trs = LIST.slice(1).map(([name], i) => ({ at: (i + 1) * SEG, dur: TR, name, ease: E.io2 }));
  const labelAt = t => { if (t >= t0) return FX[Math.min(FX.length - 1, Math.floor((t - t0) / 2.2))]; for (let i = 1; i < LIST.length; i++) if (Math.abs(t - i * SEG) < .25) return LIST[i]; return null; };
  return {
    cover: null, duration: total, transitionAt: timeline(trs, t => shotAt(t)),
    shotAt(t) { const s = shotAt(t); return { shot: s, local: t - s.a }; },
    applyEvents() {}, drawGlobalHud() {}, eventList: () => [],
    drawSubs(x, t) { x.clearRect(0, 0, W, H); const L = labelAt(t); if (!L) return; x.save(); x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 24 * UI; x.font = `800 ${112 * UI}px JB`; x.fillText(L[0], W / 2, 1760 * UI); x.restore(); },
  };
}
