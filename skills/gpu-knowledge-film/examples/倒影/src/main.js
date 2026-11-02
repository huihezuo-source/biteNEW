import * as THREE from 'three';
import { W, H, QUALITY, FPS, renderer, halton, clamp } from './core.js';
import { sceneRT, accumRT, accumClear, accumAdd, hudOver, postProcess, defaults } from './post.js';
import { loadFonts, hud, subs } from './text.js';
import { buildFilm } from './film.js';

const log = m => fetch('/log', { method: 'POST', body: String(m) });
window.onerror = (m, s, l) => log(`ERR ${m} @${s}:${l}`);

const SHUTTER = .55;              // 快门（占一帧的比例）
const perm = [0, 5, 2, 7, 1, 6, 3, 4, 8, 13, 10, 15, 9, 14, 11, 12, 16, 21, 18, 23, 17, 22, 19, 20, 24, 29, 26, 31, 25, 30, 27, 28];
const jx = Array.from({ length: 64 }, (_, i) => halton(i + 1, 2) - .5), jy = Array.from({ length: 64 }, (_, i) => halton(i + 1, 3) - .5);
const lx = [], ly = []; for (let i = 0; i < 64; i++) { const r = Math.sqrt(halton(i + 1, 5)), a = halton(i + 1, 7) * Math.PI * 2; lx.push(r * Math.cos(a)); ly.push(r * Math.sin(a)); }

let film;
function renderAt(t) {
  const { shot, local } = film.shotAt(t);
  const base = QUALITY === 'draft' ? 2 : QUALITY === 'mid' ? 4 : 8;
  const N = Math.min(32, QUALITY === 'draft' ? Math.min(base, shot.samplesDraft || base) : (shot.samples || base));
  let pp;
  accumClear();
  for (let j = 0; j < N; j++) {
    const frac = (perm[j % 32] + .5) / N;
    const tj = t + frac * SHUTTER / FPS;
    pp = defaults();
    const cam = shot.update(tj, tj - shot.a, pp, t);
    film.applyEvents(tj, pp, cam);
    if (film.cover) film.coverCam(cam, pp);
    // 亚像素抖动 + 镜头光圈
    const ap = pp.aperture || 0, fd = pp.focus || 1;
    if (N > 1) {
      cam.setViewOffset(W, H, jx[j] + (pp.shakeX || 0), jy[j] + (pp.shakeY || 0), W, H);
    } else cam.setViewOffset(W, H, (pp.shakeX || 0), (pp.shakeY || 0), W, H);
    cam.updateProjectionMatrix();
    if (ap > 0 && N > 1) {
      const dx = lx[j] * ap, dy = ly[j] * ap;
      const e = cam.matrixWorld.elements; const rx = new THREE.Vector3(e[0], e[1], e[2]), ry = new THREE.Vector3(e[4], e[5], e[6]);
      cam.position.addScaledVector(rx, dx).addScaledVector(ry, dy); cam.updateMatrixWorld(true);
      cam.projectionMatrix.elements[8] -= cam.projectionMatrix.elements[0] * dx / fd;
      cam.projectionMatrix.elements[9] -= cam.projectionMatrix.elements[5] * dy / fd;
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }
    renderer.setRenderTarget(sceneRT); renderer.setClearColor(0x000000, 1); renderer.clear();
    shot.draw ? shot.draw(cam, tj) : renderer.render(shot.scene, cam);
    accumAdd(1 / N);
    if (ap > 0 && N > 1) { const dx = lx[j] * ap, dy = ly[j] * ap; const e = cam.matrixWorld.elements; cam.position.addScaledVector(new THREE.Vector3(e[0], e[1], e[2]), -dx).addScaledVector(new THREE.Vector3(e[4], e[5], e[6]), -dy); }
  }
  hud.clear();
  if (!film.cover) shot.hud && shot.hud(hud.x, t - shot.a, t, hud);
  film.drawGlobalHud(hud.x, t, hud);
  hud.commit(); hudOver(hud.tex, hud.gain);
  film.drawSubs(subs.x, t); subs.tex.needsUpdate = true;
  postProcess(pp, subs.tex, Math.floor(t * FPS) % 977);
}

const gl = renderer.getContext();
const px = new Uint8Array(W * H * 4);
function read() { renderer.setRenderTarget(null); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; }

window.FILM = {
  isReady: false, duration: 0,
  async stills(ts, prefix) {
    const out = [];
    for (const t of ts) { renderAt(t); read(); const name = `${prefix}_${t.toFixed(2).padStart(6, '0')}.jpg`; await fetch(`/still?name=${encodeURIComponent(name)}&w=${W}&h=${H}`, { method: 'POST', body: px }); out.push(name); }
    return out.length;
  },
  async run(f0, f1) {
    for (let f = f0; f < f1; f++) { renderAt(f / FPS); read(); let ok = false; for (let k = 0; k < 8 && !ok; k++) { try { const r = await fetch(`/frame?i=${f - f0}`, { method: 'POST', body: px, keepalive: false }); ok = r.ok; } catch (e) { await new Promise(res => setTimeout(res, 150 * (k + 1))); } } if (!ok) throw new Error('frame ' + f); }
  },
  eventList() { return film.eventList(); },
  async coverShot(kind, name) { film.cover = kind; const t = film.coverT(kind); renderAt(t); read(); await fetch(`/still?name=${encodeURIComponent(name)}&w=${W}&h=${H}`, { method: 'POST', body: px }); film.cover = null; },
};

(async () => {
  await loadFonts();
  film = await buildFilm();
  window.FILM.duration = film.duration;
  // 预热：把所有镜头编译一遍
  window.FILM.isReady = true;
  console.log('#ready', W, H, QUALITY, film.duration);
})().catch(e => { log('INIT ' + (e.stack || e)); console.error(e); });
