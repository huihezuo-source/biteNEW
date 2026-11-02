import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp } from './core.js';
import { drawRich } from './text.js';
import { timeline } from './fx.js';
import { SUBS, EVENTS, DUR } from './script.js';
import { makeCtx } from './ctx.js';
import { openShots } from './shots/open.js';
import { midShots } from './shots/mid.js';
import { deckShots } from './shots/deck.js';
import { turnShots } from './shots/turn.js';
import { lateShots } from './shots/late.js';
import { endShots } from './shots/end.js';

export async function buildFilm() {
  const ctx = makeCtx();
  const shots = [...openShots(ctx), ...midShots(ctx), ...deckShots(ctx), ...turnShots(ctx), ...lateShots(ctx), ...endShots(ctx)];
  shots.sort((a, b) => a.a - b.a);
  const shotOf = t => { let s = shots[0]; for (const x of shots) if (t >= x.a) s = x; return s; };
  const BURN = { burnColor: 'vec3(.1, 1., .5)' };
  const TR = [
    { at: 6.55, dur: .9, name: 'CrossZoom', ease: E.io2 }, { at: 11.55, dur: .8, name: 'CrossZoom', ease: E.io2 },
    { at: 24.75, dur: .5, name: 'WhipTilt', ease: E.io2 }, { at: 28.15, dur: .6, name: 'DefocusBlur', ease: E.io2 },
    { at: 30.15, dur: .5, name: 'DreamyZoom', ease: E.io2 }, { at: 34.45, dur: .6, name: 'Tunnel', ease: E.io2 },
    { at: 37.45, dur: .5, name: 'WhipPan', ease: E.io2 }, { at: 47.3, dur: .9, name: 'Disintegrate', ease: E.io2 },
    { at: 74.2, dur: .6, name: 'Morph', ease: E.io2 }, { at: 77, dur: .6, name: 'CrossWarp', ease: E.io2 },
    { at: 87.3, dur: .7, name: 'TvTurnOff', ease: k => k * .5 }, { at: 99.4, dur: 1, name: 'BurnThrough', ease: E.io2, params: BURN },
    { at: 113.8, dur: .8, name: 'DefocusBlur', ease: E.io2 }, { at: 121.45, dur: .7, name: 'CrossZoom', ease: E.io2 }, { at: 124.6, dur: .8, name: 'DefocusBlur', ease: E.io2 },
  ];
  const lines = s => s.zh.split('|').length;
  const big = (x, s, cx, y, size, col, align = 'center') => { x.save(); x.textAlign = align; x.textBaseline = 'middle'; x.font = `900 ${size * UI}px NSerif`; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 34 * UI; x.fillStyle = col; x.fillText(s, cx, y); x.fillText(s, cx, y); x.restore(); };
  const corner = (x, cx, y, align) => { x.save(); x.textAlign = align; x.font = `800 ${50 * UI}px NSerif`; x.fillStyle = '#F4EFE4'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14 * UI; x.fillText('《第二天》', cx, y); x.restore(); };
  const COVER = {
    a: { t: 14.3, draw(x) { big(x, '你卖在了', W / 2, 372 * UI, 168, '#F6F4EE'); big(x, '最低点', W / 2, 610 * UI, 262, '#2BF08E'); corner(x, W - 70 * UI, 112 * UI, 'right'); } },
    b: { t: 14.3, cam(c, pp) { c.setViewOffset(W, H, -W * .2, 0, W, H); c.updateProjectionMatrix(); }, draw(x) { big(x, '你卖在了', W * .3, H * .36, 92, '#F6F4EE'); big(x, '最低点', W * .3, H * .6, 148, '#2BF08E'); corner(x, 56 * UI, 76 * UI, 'left'); } },
    c: { t: 64.6, draw(x) { const g = x.createLinearGradient(0, 0, 0, 760 * UI); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 760 * UI); big(x, '65 次大跌', W / 2, 300 * UI, 170, '#F6F4EE'); big(x, '45 次第二天涨', W / 2, 520 * UI, 140, '#FF4A3C'); corner(x, W - 70 * UI, 112 * UI, 'right'); } },
  };
  return {
    cover: null, coverT: k => COVER[k].t, coverCam(c, pp) { if (COVER[this.cover].cam) COVER[this.cover].cam(c, pp); }, duration: DUR,
    transitionAt: timeline(TR, shotOf),
    shotAt(t) { const s = shotOf(t); return { shot: s, local: t - s.a }; },
    applyEvents(t, pp) {
      for (const e of EVENTS) { const d = t - e.t; if (d < 0 || d > (e.len || 1.2)) continue; const k = Math.exp(-d * (e.decay || 6));
        if (e.flash) pp.flash += e.flash * k; if (e.ca) pp.ca += e.ca * k; if (e.warp) pp.warp += e.warp * k;
        if (e.shake) { const s = e.shake * k * UI; pp.shakeX = (pp.shakeX || 0) + s * Math.sin(t * 97.3 + e.t); pp.shakeY = (pp.shakeY || 0) + s * Math.cos(t * 83.1); } }
    },
    drawGlobalHud() {},
    drawSubs(x, t) {
      x.clearRect(0, 0, W, H);
      if (this.cover) { COVER[this.cover].draw(x); return; }
      const { shot } = this.shotAt(t); if (shot.label) shot.label(x, t);
      let band = 0; for (const s of SUBS) { if (s.mid) continue; band = Math.max(band, ss(s.a - .22, s.a, t) * (1 - ss(s.b + .22, s.b + .5, t))); }
      if (band > 0) { const g = x.createLinearGradient(0, 1400 * UI, 0, 1920 * UI); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.42, `rgba(0,0,0,${(shot.subDark ?? .8) * band})`); g.addColorStop(1, `rgba(0,0,0,${(shot.subDark ?? .8) * band})`); x.fillStyle = g; x.fillRect(0, 1400 * UI, W, 520 * UI); }
      // 顶部的大字落在亮处时，镜头可以要一条顶部压暗
      let top = 0; if (shot.subTop) for (const s of SUBS) { if (!s.mid || (s.y || 900) > 700) continue; top = Math.max(top, ss(s.a - .22, s.a, t) * (1 - ss(s.b + .22, s.b + .5, t))); }
      if (shot.subTopHold && t > shot.subTopHold) top = 1;
      if (top > 0) { const g = x.createLinearGradient(0, 0, 0, 640 * UI); g.addColorStop(0, `rgba(0,0,0,${shot.subTop * top})`); g.addColorStop(.5, `rgba(0,0,0,${shot.subTop * top * .85})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 640 * UI); }
      for (const s of SUBS) {
        if (t < s.a - .02 || t > s.b + .16) continue;
        const a = 1 - ss(s.b, s.b + .14, t), r = seg(t, s.a, s.a + Math.max(.28, s.zh.replace(/[{}|]|[yrgwbm]:/g, '').length * .035)), n = lines(s);
        if (s.mid) drawRich(x, s.zh, W / 2, (s.y || 900) * UI, { size: s.size || 76, weight: 800, alpha: a, reveal: r, shadow: 30, lh: 1.36 });
        else drawRich(x, s.zh, W / 2, (n > 1 ? 1626 : 1686) * UI, { size: 70, weight: 700, alpha: a, reveal: r, shadow: 22, lh: 1.36 });
      }
      if (shot.disc && (t < 17 || (t > 37.6 && t < 47.2))) { x.save(); x.font = `500 ${36 * UI}px NSans`; x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.72)'; x.fillText('情景为虚构示意，行情为真实数据', W / 2, 1800 * UI); x.restore(); }
    },
    eventList: () => EVENTS,
  };
}
