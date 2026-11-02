import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, renderer } from './core.js';
import { drawRich } from './text.js';
import { makeRig } from './rig.js';
import { oneShots } from './shots/one.js';
import { titleShots } from './shots/title.js';
import { runShots } from './shots/run.js';
import { plainShots } from './shots/plain.js';
import { endShots } from './shots/end.js';
import { SUBS, EVENTS, DUR, B } from './script.js';
import { FLOOR_Y, U, Y0 } from './machine.js';
import { SILO } from './silo.js';
import { camSet, tag, proj, pxPerUnit, RED_L, GREEN_L, WHITE } from './util.js';

export async function buildFilm() {
  const ctx = makeRig();
  const shots = [...oneShots(ctx), ...titleShots(ctx), ...runShots(ctx), ...plainShots(ctx), ...endShots(ctx)];
  shots.sort((a, b) => a.a - b.a);
  const ev = EVENTS;
  function title2(x, a, b, y, s1, s2, cx = W / 2, align = 'center', c = 'r') { drawRich(x, a, cx, y * UI, { size: s1, weight: 900, shadow: 26, align }); drawRich(x, `{${c}:${b}}`, cx, (y + s2 * 1.12) * UI, { size: s2, weight: 900, shadow: 30, align }); }
  function corner(x, ink) { x.save(); x.textAlign = 'right'; x.font = `800 ${46 * UI}px NSerif`; x.fillStyle = ink ? '#101316' : '#F4EFE4'; if (!ink) { x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 12 * UI; } if (x.letterSpacing !== undefined) x.letterSpacing = `${10 * UI}px`; x.fillText('满 仓', W - 70 * UI, H - 72 * UI); x.restore(); }
  const CY = Y0 + 30, cam0 = ctx.cam, inkT = (x, a_, b_, y, s1, s2, cx, align) => { drawRich(x, a_, cx, y * UI, { size: s1, weight: 900, ink: true, align }); drawRich(x, `{g:${b_}}`, cx, (y + s2 * 1.14) * UI, { size: s2, weight: 900, ink: true, align }); };
  const ringC = x => { const p = proj(cam0, 0, CY, .5), r = .42 * pxPerUnit(cam0, .5); x.save(); x.strokeStyle = 'rgba(16,19,22,.65)'; x.lineWidth = 5 * UI; x.setLineDash([18 * UI, 14 * UI]); x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.stroke(); x.restore(); };
  const COVER = {
    a: { t: 14, cam(c, pp) { pp.flash = 0; camSet(c, [0, CY + .3, 4.2], [0, CY + .3, 0], 24); }, draw(x) { inkT(x, '涨一半，跌一半，', '你亏了 2.5 万', 170, 96, 170, W / 2, 'center'); ringC(x); corner(x, true); } },
    b: { t: 14, cam(c, pp) { pp.flash = 0; camSet(c, [-.72, CY, 3.9], [-.72, CY, 0], 24); }, draw(x) { inkT(x, '涨一半，跌一半，', '你亏了 2.5 万', 320, 66, 112, 90 * UI, 'left'); ringC(x); tag(x, '满 仓', 90 * UI, H - 90 * UI, { size: 46, align: 'left', family: 'NSerif' }); } },
    c: { t: B(16) - .12, cam(c, pp) { pp.flash = 0; camSet(c, [0, SILO.cy, 24.6], [0, SILO.cy, 2], 28.4); }, draw(x) { corner(x, true); } },
  };
  return {
    cover: null, coverT: k => COVER[k].t, coverCam(c, pp) { COVER[this.cover].cam(c, pp); },
    duration: DUR,
    shotAt(t) { let s = shots[0]; for (const x of shots) if (t >= x.a) s = x; return { shot: s, local: t - s.a }; },
    applyEvents(t, pp, cam) {
      for (const e of ev) { const d = t - e.t; if (d < -(e.pre || 0) || d > (e.len || 1.2)) continue; const k = d >= 0 ? Math.exp(-d * (e.decay || 6)) : ss(-(e.pre || 0), 0, d);
        if (e.flash) pp.flash += e.flash * k; if (e.ca) pp.ca += e.ca * k; if (e.warp) pp.warp += e.warp * k; if (e.bloom) pp.bloom += e.bloom * k; if (e.exp) pp.exposure *= 1 + e.exp * k;
        if (e.shake) { const s = e.shake * k * UI; pp.shakeX = (pp.shakeX || 0) + s * Math.sin(t * 97.3 + e.t); pp.shakeY = (pp.shakeY || 0) + s * Math.cos(t * 71.1 + e.t * 2.); }
      }
    },
    drawGlobalHud() {},
    drawSubs(x, t) {
      x.clearRect(0, 0, W, H);
      if (this.cover) { COVER[this.cover].draw(x); return; }
      const { shot } = this.shotAt(t); const inkK = shot.inkK ? shot.inkK(t) : (shot.ink ? 1 : 0), ink = inkK > .5;
      if (shot.label && !shot.over) shot.label(x, t);
      let band = 0; for (const s of SUBS) { if (s.big) continue; band = Math.max(band, ss(s.a - .22, s.a, t) * (1 - ss(s.b + .22, s.b + .5, t))); }
      const bandOf = (col, dk, b) => { if (b <= 0) return; const g = x.createLinearGradient(0, 1380 * UI, 0, 1920 * UI); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.38, `rgba(${col},${.62 * dk * b})`); g.addColorStop(.6, `rgba(${col},${.92 * dk * b})`); g.addColorStop(1, `rgba(${col},${dk * b})`); x.fillStyle = g; x.fillRect(0, 1380 * UI, W, 540 * UI); };
      if (band > 0) { bandOf('0,0,0', shot.subDark ?? .86, band * (1 - inkK)); bandOf('236,239,242', shot.subDark ?? .78, band * inkK); }
      if (shot.label && shot.over) shot.label(x, t);
      for (const s of SUBS) {
        if (t < s.a - .02 || t > s.b + .16) continue;
        const a = 1 - ss(s.b, s.b + .14, t), r = seg(t, s.a, s.a + Math.max(.28, s.zh.replace(/[{}|]|[yrgwbm]:/g, '').length * .035));
        const lines = s.zh.split('|').length;
        const yy = (lines > 1 ? 1672 : 1736) * UI;
        const a0 = 1 - clamp(inkK / .38), a1 = clamp((inkK - .62) / .38);
        if (a0 > 0) drawRich(x, s.zh, W / 2, yy, { size: 70, weight: 700, alpha: a * a0, reveal: r, shadow: 22, lh: 1.36, ink: false });
        if (a1 > 0) drawRich(x, s.zh, W / 2, yy, { size: 70, weight: 700, alpha: a * a1, reveal: r, shadow: 0, lh: 1.36, ink: true });
      }
    },
    eventList: () => EVENTS,
  };
}
