import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, renderer } from './core.js';
import { drawRich } from './text.js';
import { makeSky, makeLake, MAIN_ONLY } from './lake.js';
import { makeBoat } from './boat.js';
import { hookShots } from './shots/hook.js';
import { boardShots } from './shots/board.js';
import { revealShots } from './shots/reveal.js';
import { tulipShots } from './shots/tulip.js';
import { paperShots } from './shots/paper.js';
import { hallShots } from './shots/hall.js';
import { coinShots } from './shots/coin.js';
import { stairShots } from './shots/stairs.js';
import { ridgeShots } from './shots/ridge.js';
import { pierShots } from './shots/pier.js';
import { dawnShots, backShots } from './shots/dawn.js';
import { SUBS, EVENTS, DUR, B } from './script.js';

export async function buildFilm() {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cam = new THREE.PerspectiveCamera(36, W / H, .5, 30000); cam.layers.enable(MAIN_ONLY);
  const world = new THREE.Scene(); const sky = makeSky(), lake = makeLake(); world.add(sky.mesh, lake.mesh);
  const ctx = { world, sky, lake, cam, makeBoat };
  ctx.lakeCommon = t => { sky.u.uT.value = t; lake.u.uT.value = t; };
  ctx.groups = []; ctx.hideOthers = g => { for (const k of ctx.groups) k.visible = k === g; if (ctx.setDawn) ctx.setDawn(0); lake.u.uRain.value = 0; lake.u.uGlit.value = 1; lake.u.uBroad.value = 1; lake.u.uFogK.value = 1; };
  const shots = [...hookShots(ctx), ...boardShots(ctx), ...revealShots(ctx), ...tulipShots(ctx)]; shots.push(...paperShots(ctx), ...hallShots(ctx), ...coinShots(ctx), ...stairShots(ctx), ...ridgeShots(ctx), ...pierShots(ctx)); shots.push(...dawnShots(ctx), ...backShots(ctx));
  shots.sort((a, b) => a.a - b.a);
  const ev = EVENTS;
  function title2(x, a, b, y, s1, s2, cx = W / 2, align = 'center') { drawRich(x, a, cx, y * UI, { size: s1, weight: 900, shadow: 24, align }); drawRich(x, `{y:${b}}`, cx, (y + s2 * 1.1) * UI, { size: s2, weight: 900, shadow: 30, glow: 'rgba(255,180,70,.75)', glowR: 40, align }); }
  function corner(x) { x.save(); x.textAlign = 'right'; x.font = `800 ${44 * UI}px NSerif`; x.fillStyle = '#F4EFE4'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12 * UI; if (x.letterSpacing !== undefined) x.letterSpacing = `${10 * UI}px`; x.fillText('倒 影', W - 70 * UI, H - 72 * UI); x.restore(); }
  const COVER = {
    a: { t: B(63.9), cam(c, pp) { pp.flash = 0; sky.u.uMoonK.value = 0; lake.u.uGlit.value = 0; c.lookAt(0, -18, -36); c.fov = 50; c.updateProjectionMatrix(); }, draw(x) { title2(x, '一天蒸发 2 万亿，', '钱去哪了？', 200, 100, 196); corner(x); } },
    b: { t: B(63.9), cam(c, pp) { pp.flash = 0; sky.u.uMoonK.value = 0; lake.u.uGlit.value = 0; c.lookAt(-32, -22, -36); c.fov = 48; c.updateProjectionMatrix(); }, draw(x) { title2(x, '一天蒸发 2 万亿，', '钱去哪了？', 118, 74, 138, 100 * UI, 'left'); corner(x); } },
    c: { t: B(33) + .02, cam(c, pp) { pp.flash = 0; c.position.set(0, 8, 44); c.lookAt(0, -40, -70); c.fov = 68; c.updateProjectionMatrix(); pp.exposure = 1.1; }, draw(x) { title2(x, '一天蒸发 2 万亿，', '钱去哪了？', 170, 100, 196); corner(x); } },
  };
  return {
    cover: null, coverT: k => COVER[k].t, coverCam(c, pp) { COVER[this.cover].cam(c, pp); },
    duration: DUR,
    shotAt(t) { let s = shots[0]; for (const x of shots) if (t >= x.a) s = x; return { shot: s, local: t - s.a }; },
    applyEvents(t, pp, cam) {
      for (const e of ev) { const d = t - e.t; if (d < -(e.pre || 0) || d > (e.len || 1.2)) continue; const k = d >= 0 ? Math.exp(-d * (e.decay || 6)) : ss(-(e.pre || 0), 0, d);
        if (e.flash) pp.flash += e.flash * k; if (e.ca) pp.ca += e.ca * k; if (e.warp) pp.warp += e.warp * k; if (e.bloom) pp.bloom += e.bloom * k; if (e.exp) pp.exposure *= 1 + e.exp * k; if (e.flashC) pp.flashC = e.flashC === 'teal' ? [.55, 1, .95] : e.flashC === 'gold' ? [1, .8, .45] : e.flashC === 'green' ? [.3, 1, .56] : e.flashC === 'cold' ? [.72, .84, 1] : [1, 1, 1];
        if (e.shake) { const s = e.shake * k * UI; pp.shakeX = (pp.shakeX || 0) + s * Math.sin(t * 97.3 + e.t); pp.shakeY = (pp.shakeY || 0) + s * Math.cos(t * 71.1 + e.t * 2.); }
      }
    },
    drawGlobalHud() {},
    drawSubs(x, t) {
      x.clearRect(0, 0, W, H);
      if (this.cover) { COVER[this.cover].draw(x); return; }
      let band = 0; for (const s of SUBS) { if (s.big) continue; band = Math.max(band, ss(s.a - .22, s.a, t) * (1 - ss(s.b + .22, s.b + .5, t))); }
      const { shot } = this.shotAt(t); const dk = shot.subDark ?? .86;
      if (band > 0) { const g = x.createLinearGradient(0, 1340 * UI, 0, 1920 * UI); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.38, `rgba(0,0,0,${.62 * dk * band})`); g.addColorStop(.6, `rgba(0,0,0,${.92 * dk * band})`); g.addColorStop(1, `rgba(0,0,0,${dk * band})`); x.fillStyle = g; x.fillRect(0, 1340 * UI, W, 580 * UI); }
      for (const s of SUBS) {
        if (t < s.a - .02 || t > s.b + .16) continue;
        const a = 1 - ss(s.b, s.b + .14, t), r = seg(t, s.a, s.a + Math.max(.28, s.zh.replace(/[{}|]|[yrgwbm]:/g, '').length * .035));
        const lines = s.zh.split('|').length;
        if (s.big) { const size = s.size || 120, cy = s.y || 900; if (!s.noHalo) { const g = x.createRadialGradient(W / 2, cy * UI, 0, W / 2, cy * UI, 720 * UI); g.addColorStop(0, `rgba(0,0,0,${.62 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); } drawRich(x, s.zh, W / 2, cy * UI, { size, weight: 900, alpha: a, reveal: r, shadow: 30, lh: 1.32 }); }
        else drawRich(x, s.zh, W / 2, (lines > 1 ? 1672 : 1736) * UI, { size: 70, weight: 700, alpha: a, reveal: r, shadow: 22, lh: 1.36 });
      }
    },
    eventList: () => EVENTS,
  };
}
