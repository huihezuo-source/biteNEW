import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp } from '../core.js';
import { YOU, youPos, WALL_W, WALL_H } from '../world.js';
import { RT } from '../script.js';
import { drawRich } from '../text.js';

export function closeShots(ctx) {
  const { scene, wall, sky, city, room, phone, screen, cam, star } = ctx;
  const U = wall.u; const look = new THREE.Vector3();
  const common = t => { star.hide(); U.uWallB.value = 1; U.uGlassK.value = 1; U.uIdle.value = 0; U.uT.value = t; sky.u.uT.value = t; city.u.uT.value = t; city.gu.uT.value = t; U.uYouOpen.value = 1; U.uOnT.value = 999; U.uRevT.value = 999; U.uAll.value = 0; U.uMaskAmt.value = 0; U.uTint.value = 0; U.uDim.value = 1; U.uMoon.value = 2; for (let i = 0; i < 12; i++) U.uRound.value[i] = 999; };
  const txt = '分母是多少？';
  const s23 = {
    a: 142.46, b: 151.96, scene, samples: 16, samplesDraft: 4, subDark: .97,
    update(t, u, pp) {
      common(t);
      const n = Math.floor(clamp((t - 145.3) / .26, 0, txt.length)); const sent = seg(t, 147.46, 147.9); const status = ss(148.5, 148.8, t); const dark = ss(151.1, 151.8, t);
      screen.drawReply(sent > 0 ? '' : txt.slice(0, n), sent, status, dark);
      const P = ctx.P0; phone.group.position.copy(P); phone.group.rotation.set(0, .62, 0);
      const push = E.io3(seg(t, 142.46, 145.2)), hold = E.io2(seg(t, 148.2, 150.4));
      const sl = E.out4(seg(t, 147.46, 147.86)); const dist = lerp(lerp(lerp(.26, .158, push), .118, sl), .15, hold), ang = lerp(.42, .24, push), az = .62 + lerp(-.1, .12, u / 10);
      const off = lerp(-.012, -.046, E.io2(seg(t, 143, 145.6)));
      const lx0 = lerp(0, .0139, sl * (1 - hold * .4)), lz0 = lerp(-off, .0352, Math.max(sl, 0));   // 对准气泡：屏幕局部坐标
      const c_ = Math.cos(.62), s_ = Math.sin(.62);
      look.set(P.x + lx0 * c_ + lz0 * s_, P.y, P.z - lx0 * s_ + lz0 * c_);
      cam.position.set(look.x + Math.sin(az) * Math.sin(ang) * dist, look.y + Math.cos(ang) * dist, look.z + Math.cos(az) * Math.sin(ang) * dist); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 30; cam.near = .01; cam.far = 8000; cam.updateProjectionMatrix();
      room.bulb.intensity = 2.1; room.fill.intensity = 4.2; room.shade.material.emissiveIntensity = 2.4; room.bm.color.setRGB(1, .62, .26).multiplyScalar(5);
      pp.aperture = .0034; pp.focus = dist; pp.bloom = .10; pp.threshold = 1.1; pp.vig = .6; pp.exposure = 1 - dark * .4;
      return cam;
    },
  };
  const s24 = {
    a: 153.96, b: 159, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      common(t); U.uYouOpen.value = 0;
      // 你关了灯 → 整面墙从你这里亮回来
      U.uYouGain.value = 1.2 * ss(154.1, 154.4, t);
      U.uRevT.value = 154.05; U.uRevK.value = .0092; U.uRevC.value.set(YOU.col, YOU.row); U.uMoon.value = 3.4;
      const k = E.out2(seg(u, 0, 3.5)); const d = lerp(1800, 2130, k);
      cam.position.set(lerp(youPos.x * .4, 0, k), lerp(youPos.y + 40, 600, k), d); cam.up.set(0, 1, 0); look.set(0, lerp(youPos.y + 20, 600, k), 0); cam.lookAt(look); cam.fov = 30; cam.near = 2; cam.far = 60000; cam.updateProjectionMatrix();
      pp.bloom = .18 + .16 * ss(154, 156, t); pp.threshold = .8; pp.vig = .4; pp.exposure = 1 + .22 * ss(154, 156, t); pp.fade = ss(158.55, 158.98, t); pp.sat = 1.2; pp.contrast = 1.08;
      return cam;
    },
    hud(x, u, t, h) {
      const a = ss(154.46, 154.8, t); if (a <= 0) return;
      const gr = x.createRadialGradient(W / 2, 880 * UI, 0, W / 2, 880 * UI, 960 * UI); gr.addColorStop(0, `rgba(0,0,0,${.86 * a})`); gr.addColorStop(.6, `rgba(0,0,0,${.6 * a})`); gr.addColorStop(1, `rgba(0,0,0,${.12 * a})`); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      const bk = ss(155.5, 155.9, t); if (bk > 0) { x.fillStyle = `rgba(0,0,0,${.74 * bk})`; x.fillRect(0, 0, W, H); }
      drawRich(x, '致每一个，|站在{y:分数线}下面的人。', W / 2, 760 * UI, { size: 104, weight: 900, alpha: a, reveal: seg(t, 154.46, 155.0), lh: 1.46, shadow: 26 });
      const b = ss(155.5, 155.9, t); if (b > 0) { x.save(); x.globalAlpha = b; x.textAlign = 'center'; x.font = `900 ${84 * UI}px NSerif`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(255,180,80,.9)'; x.shadowBlur = 26 * UI; x.fillText('分', W / 2, 1136 * UI); x.fillRect(W * .44, 1158 * UI, W * .12, 5 * UI); x.fillText('母', W / 2, 1248 * UI); x.restore();
        x.save(); x.globalAlpha = b * .9; x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 10 * UI; x.font = `500 ${36 * UI}px NSans`; x.fillStyle = '#EDE8DE'; x.fillText('Wald 1943 · Mangel & Samaniego 1984 · An, Lou & Shi 2022', W / 2, 1356 * UI); x.fillText('Ellenberg《魔鬼数学》· 财联社 2026-10 · 《中国新闻周刊》2021-03', W / 2, 1412 * UI); x.fillText('本片为认知科普，不构成任何投资建议', W / 2, 1468 * UI); x.restore(); }
      h.gain = 1.5;
    },
  };
  return [s23, s24];
}
