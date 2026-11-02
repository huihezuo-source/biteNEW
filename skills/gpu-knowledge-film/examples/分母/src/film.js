import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, renderer } from './core.js';
import { drawRich } from './text.js';
import { COLS, ROWS, CW, CH, WALL_W, WALL_H, YOU, youPos, REMAIN, buildWindows, makeMask, makeWall, makeSky, makeCity, makeStar } from './world.js';
import { makeEnv, makeScreen, makePhone, makeRoom } from './phone.js';
import { openShots } from './shots/open.js';
import { wallShots } from './shots/wall.js';
import { sieveShot } from './shots/sieve.js';
import { coinsShots } from './shots/coins.js';
import { bomberShots } from './shots/bomber.js';
import { deepShots } from './shots/deep.js';
import { fundsShots } from './shots/funds.js';
import { farmShots } from './shots/farm.js';
import { feedShots } from './shots/feed.js';
import { reversalShots } from './shots/reversal.js';
import { beliefShots } from './shots/belief.js';
import { closeShots } from './shots/close.js';
import { SUBS, EVENTS, DUR } from './script.js';

export async function buildFilm() {
  const win = buildWindows();
  const mask = makeMask((x, w, h) => { x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 178px NSerif`; x.fillText('分', w / 2, h * .262); x.fillText('母', w / 2, h * .742); x.fillRect(w * .07, h * .4935, w * .86, h * .013); });
  const wall = makeWall(win.tex, mask), sky = makeSky(), city = makeCity();
  const scene = new THREE.Scene(); scene.add(sky.mesh, wall.mesh, city.mesh, city.ground);
  const envRoom = makeEnv('room');
  const screen = makeScreen(); const phone = makePhone(screen.tex, envRoom);
  const room = makeRoom(new THREE.Vector3(youPos.x, youPos.y, 0), envRoom, screen); scene.add(room.room, phone.group);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cam = new THREE.PerspectiveCamera(30, W / H, 1, 60000);
  const star = makeStar(youPos); scene.add(star.sprite);
  const ctx = { scene, wall, sky, city, room, phone, screen, cam, win, star, P0: new THREE.Vector3(youPos.x, youPos.y + room.DT + .0045, -1.0) };
  const T0 = performance.now(); const mark = n => console.log('#built', n, Math.round(performance.now() - T0), 'ms');
  const shots = [...openShots(ctx), ...wallShots(ctx)]; mark('wall'); shots.push(...sieveShot(ctx)); mark('sieve'); shots.push(...coinsShots(ctx)); mark('coins'); shots.push(...bomberShots(ctx)); mark('bomber'); shots.push(...deepShots(ctx)); mark('deep'); shots.push(...fundsShots(ctx)); shots.push(...farmShots(ctx)); mark('farm'); shots.push(...feedShots(ctx)); mark('feed'); shots.push(...reversalShots(ctx)); mark('rev'); shots.push(...beliefShots(ctx)); shots.push(...closeShots(ctx)); mark('close');
  shots.sort((a, b) => a.a - b.a);

  const ev = EVENTS;
  const COVER = {
    a: { t: 64.7, cam(c, pp) { c.position.set(0, 760, 2240); c.lookAt(0, 760, 0); pp.exposure = 1.3; pp.bloom = .42; pp.threshold = .5; pp.flash = 0; pp.warp = 0; star.show(1, 3000, c); },
      draw(x) { title2(x, '连对 10 次的老师，', '分母是多少？', 430, 104, 196); corner(x); } },
    b: { t: 133.45, cam(c, pp) { pp.flash = 0; pp.warp = 0; pp.exposure = 1.1; },
      draw(x) { title2(x, '连对 10 次的老师，', '分母是多少？', 236, 100, 186); corner(x); } },
    b2: { t: 133.45, cam(c, pp) { pp.flash = 0; pp.warp = 0; pp.exposure = 1.1; },
      draw(x) { title2(x, '你看到的每一个奇迹，', '分母都是你', 236, 92, 186); corner(x); } },
    c: { t: 133.45, cam(c, pp) { c.up.set(0, 1, 0); c.position.set(-340, 170, 860); c.lookAt(-340, 214, -300); c.fov = 34; c.updateProjectionMatrix(); pp.flash = 0; pp.warp = 0; pp.exposure = 1.45; pp.bloom = .34; pp.threshold = .7; },
      draw(x) { title2L(x, '连对 10 次的老师，', '分母是多少？', 100, 352, 74, 136); corner(x); } },
    d: { t: 64.7, cam(c, pp) { c.position.set(-1500, 420, 1500); c.lookAt(-120, 620, 0); c.fov = 30; c.updateProjectionMatrix(); pp.exposure = 1.3; pp.bloom = .4; pp.threshold = .5; pp.flash = 0; star.show(1, 3200, c); },
      draw(x) { title2L(x, '连对 10 次的老师，', '分母是多少？', 150, 410, 74, 136); corner(x); } },
    e: { t: 42.9, cam(c, pp) { c.position.set(0, 600, 2460); c.lookAt(0, 600, 0); pp.flash = 0; },
      draw(x) { corner(x); } },
  };
  function title2(x, a, b, y, s1, s2) { const gr = x.createLinearGradient(0, 0, 0, (y + 340) * UI); gr.addColorStop(0, 'rgba(0,0,0,.72)'); gr.addColorStop(.7, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, (y + 340) * UI);
    drawRich(x, a, W / 2, y * UI, { size: s1, weight: 900, shadow: 24 }); drawRich(x, `{y:${b}}`, W / 2, (y + s2 * 1.08) * UI, { size: s2, weight: 900, shadow: 30, glow: 'rgba(255,180,70,.75)', glowR: 40 }); }
  function title2L(x, a, b, xx, y, s1, s2) {
    drawRich(x, a, xx * UI, y * UI, { size: s1, weight: 900, shadow: 24, align: 'left' }); drawRich(x, `{y:${b}}`, xx * UI, (y + s2 * 1.12) * UI, { size: s2, weight: 900, shadow: 30, glow: 'rgba(255,180,70,.75)', glowR: 40, align: 'left' }); }
  function corner(x) { x.save(); x.textAlign = 'right'; x.font = `800 ${40 * UI}px NSerif`; x.fillStyle = '#F4EFE4'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12 * UI; if (x.letterSpacing !== undefined) x.letterSpacing = `${10 * UI}px`; x.fillText('分 母', W - 70 * UI, H - 72 * UI); x.restore(); }
  return {
    cover: null, coverT: k => COVER[k].t, coverCam(c, pp) { COVER[this.cover].cam(c, pp); },
    duration: DUR,
    shotAt(t) { let s = shots[0]; for (const x of shots) if (t >= x.a) s = x; return { shot: s, local: t - s.a }; },
    applyEvents(t, pp, cam) {
      for (const e of ev) { const d = t - e.t; if (d < -(e.pre || 0) || d > (e.len || 1.2)) continue; const k = d >= 0 ? Math.exp(-d * (e.decay || 6)) : ss(-(e.pre || 0), 0, d);
        if (e.flash) pp.flash += e.flash * k; if (e.ca) pp.ca += e.ca * k; if (e.warp) pp.warp += e.warp * k; if (e.bloom) pp.bloom += e.bloom * k; if (e.exp) pp.exposure *= 1 + e.exp * k; if (e.flashC) pp.flashC = e.flashC === 'teal' ? [.55, 1, .95] : e.flashC === 'green' ? [.45, 1, .65] : [1, 1, 1];
        if (e.shake) { const s = e.shake * k * UI; pp.shakeX = (pp.shakeX || 0) + s * Math.sin(t * 97.3 + e.t); pp.shakeY = (pp.shakeY || 0) + s * Math.cos(t * 71.1 + e.t * 2.); }
      }
    },
    drawGlobalHud() {},
    drawSubs(x, t) {
      x.clearRect(0, 0, W, H);
      if (this.cover) { COVER[this.cover].draw(x); return; }
      // 字幕区底：相邻两句之间不闪
      let band = 0; for (const s of SUBS) { if (s.big) continue; band = Math.max(band, ss(s.a - .22, s.a, t) * (1 - ss(s.b + .22, s.b + .5, t))); }
      const { shot } = this.shotAt(t); const dk = shot.subDark ?? .86;
      if (band > 0) { const g = x.createLinearGradient(0, 1340 * UI, 0, 1920 * UI); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.38, `rgba(0,0,0,${.62 * dk * band})`); g.addColorStop(.6, `rgba(0,0,0,${.92 * dk * band})`); g.addColorStop(1, `rgba(0,0,0,${dk * band})`); x.fillStyle = g; x.fillRect(0, 1340 * UI, W, 580 * UI); }
      for (const s of SUBS) {
        if (t < s.a - .02 || t > s.b + .16) continue;
        const a = 1 - ss(s.b, s.b + .14, t), r = seg(t, s.a, s.a + Math.max(.28, s.zh.replace(/[{}|]|[yrgwbm]:/g, '').length * .035));
        const lines = s.zh.split('|').length;
        if (s.big) {
          const size = s.size || 120, cy = s.y || 900; const g = x.createRadialGradient(W / 2, cy * UI, 0, W / 2, cy * UI, 720 * UI); g.addColorStop(0, `rgba(0,0,0,${(s.noHalo ? 0 : .62) * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
          drawRich(x, s.zh, W / 2, cy * UI, { size, weight: 900, alpha: a, reveal: r, shadow: 30, glow: null, lh: 1.32 });
        } else {
          drawRich(x, s.zh, W / 2, (lines > 1 ? 1672 : 1736) * UI, { size: 70, weight: 700, alpha: a, reveal: r, shadow: 22, lh: 1.36 });
        }
      }
    },
    eventList: () => EVENTS,
  };
}
