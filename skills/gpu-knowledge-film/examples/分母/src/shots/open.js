import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp } from '../core.js';
import { WALL_W, WALL_H, CW, CH, youPos } from '../world.js';

const T0 = .46, TICK = .5;         // 第 2 条在 .46 秒，之后每拍一条，4.46 秒到第 10 条
export function nAt(t) { return t < T0 ? 1 : clamp(Math.floor((t - T0) / TICK) + 2, 1, 10); }

export function openShots(ctx) {
  const { scene, wall, sky, city, room, phone, screen, cam, B } = ctx;
  const desk = room.DT, P0 = new THREE.Vector3(youPos.x, youPos.y + desk + .0045, -1.0);
  const look = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const wallCommon = t => {
    ctx.star.hide(); const U = wall.u; U.uT.value = t; U.uWallB.value = 1; U.uGlassK.value = 1; U.uIdle.value = 0; sky.u.uT.value = t; city.u.uT.value = t; city.gu.uT.value = t; U.uYouOpen.value = 1; U.uOnT.value = 999; U.uRevT.value = 999; U.uAll.value = 0; U.uMaskAmt.value = 0; U.uTint.value = 0; U.uDim.value = 1; U.uMoon.value = 1;
    for (let i = 0; i < 12; i++) U.uRound.value[i] = 999;
  };
  const jolt = (t) => { const n = Math.floor((t - T0) / TICK); if (n < 0 || n > 8) return 0; const u = t - T0 - n * TICK; return Math.exp(-u * 16); };
  const YAW = .62;

  // 1–2：十下震动
  const s1 = {
    a: 0, b: 8.46, scene, samples: 16, samplesDraft: 4, subDark: .97,
    update(t, u, pp) {
      wallCommon(t);
      const n = nAt(t), pop = t < T0 ? 1 : clamp((t - T0 - (n - 2) * TICK) / .42);
      screen.drawThread(n, pop);
      const j = jolt(t); phone.group.position.copy(P0); phone.group.position.y += j * .0009; phone.group.rotation.set(0, YAW + j * .012 * Math.sin(t * 90), 0);
      const k = E.io2(seg(t, 0, 8.46));
      const push = E.io3(seg(t, 4.96, 7.4));
      const dist = lerp(.335, .158, push) - .03 * E.out2(seg(t, 0, 4.96)) * (1 - push);
      const ang = lerp(.50, .30, k), az = YAW + lerp(-.20, .16, k);
      // 取景点：先偏向手机上缘（把顶部留给大数字），再移到最新一条
      const off = lerp(.040, -.012, push);
      look.set(P0.x - Math.sin(YAW) * off, P0.y, P0.z - Math.cos(YAW) * off);
      cam.position.set(look.x + Math.sin(az) * Math.sin(ang) * dist, look.y + Math.cos(ang) * dist, look.z + Math.cos(az) * Math.sin(ang) * dist);
      cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 30; cam.near = .01; cam.far = 8000; cam.updateProjectionMatrix();
      pp.aperture = .0042; pp.focus = dist; pp.bloom = .10; pp.threshold = 1.1; pp.exposure = 1.0; pp.vig = .55; pp.ca = .0022;
      pp.flash = j * .018; 
      return cam;
    },
    hud(x, u, t, h) {
      const n = nAt(t); if (!n) return;
      const j = jolt(t); const s = 1 + j * .10; x.save(); x.translate(W / 2, 300 * UI); x.scale(s, s);
      x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `900 ${236 * UI}px NSerif`;
      x.shadowColor = 'rgba(255,190,90,.9)'; x.shadowBlur = 46 * UI; x.fillStyle = '#FFD27A';
      const a = 1 - ss(4.96, 5.4, t); x.globalAlpha = a; x.fillText(`${n}/10`, 0, 0); x.shadowBlur = 0; x.fillText(`${n}/10`, 0, 0); x.restore();
      x.save(); x.globalAlpha = a * .8; x.textAlign = 'center'; x.font = `700 ${62 * UI}px NSans`; x.fillStyle = '#FFE9C7'; x.fillText('预测  ·  全部说中', W / 2, 396 * UI); x.restore(); h.gain = 2.2;
    },
  };

  // 3：第十一条
  const s3 = {
    a: 8.46, b: 14.46, scene, samples: 16, samplesDraft: 4, subDark: .97,
    update(t, u, pp) {
      wallCommon(t);
      const e = clamp((t - 8.46) / .9); screen.drawThread(10, 1, Math.max(.001, e), .5 + .5 * Math.sin(t * 5));
      phone.group.position.copy(P0); phone.group.rotation.set(0, YAW, 0);
      const slam = E.out4(clamp(u / .42)); const slow = E.io2(seg(u, 2.2, 6));
      const dist = lerp(.21, .146, slam) - .02 * slow;
      const off = -.018; look.set(P0.x - Math.sin(YAW) * off, P0.y, P0.z - Math.cos(YAW) * off);
      const ang = .24 + .12 * slow, az = YAW + .18 - .30 * slow;
      cam.position.set(look.x + Math.sin(az) * Math.sin(ang) * dist, look.y + Math.cos(ang) * dist, look.z + Math.cos(az) * Math.sin(ang) * dist);
      cam.lookAt(look); cam.fov = 30; cam.near = .01; cam.far = 8000; cam.updateProjectionMatrix();
      pp.aperture = .0034; pp.focus = dist; pp.bloom = .10; pp.threshold = 1.1; pp.vig = .6; pp.ca = .0022;
      pp.fade = ss(14.05, 14.46, t) * .0;
      return cam;
    },
  };

  // 4：一镜到底
  const yw = new THREE.Vector3(0, 600, 0);
  const curveZ = u => { // 相机离墙距离（对数）。u=0 在手机上方
    const keys = [[0, -.86], [1.7, -.42], [2.7, .3], [3.5, 2.4], [5.6, 5.4], [7.6, 44], [9.8, 400], [13.5, 2240]];
    for (let i = 0; i < keys.length - 1; i++) { const [a, za] = keys[i], [b, zb] = keys[i + 1]; if (u <= b) { const k = E.io3(seg(u, a, b)); if (za <= 0 || zb <= 0) return lerp(za, zb, E.io2(seg(u, a, b))); return Math.exp(lerp(Math.log(za), Math.log(zb), k)); } }
    return 2240;
  };
  const s4 = {
    a: 14.46, b: 27.96, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      wallCommon(t);
      screen.drawThread(10, 1, 1, .5); phone.group.position.copy(P0); phone.group.rotation.set(0, YAW, 0);
      const z = curveZ(u);
      const yBase = youPos.y + desk;
      const up1 = E.io3(seg(u, 0, 3.0));
      const w = u < 3 ? 0 : E.io2(seg(u, 6.6, 13.3));
      cam.position.set(lerp(youPos.x + Math.sin(YAW + .1) * .05 * (1 - up1), 0, w), lerp(yBase + lerp(.135, .52, up1), 600, w), z);
      const lookK = E.io2(seg(u, 1.9, 3.4));
      look.set(lerp(P0.x, lerp(youPos.x, 0, w), lookK), lerp(P0.y, lerp(youPos.y - .05, 600, w), lookK), lerp(P0.z, -3, lookK));
      {
        const b = 1 - E.io2(seg(u, 0, 1.5));
        if (b > 0) { const dist = .146 - .02, off = -.018; const lx = P0.x - Math.sin(YAW) * off, lz = P0.z - Math.cos(YAW) * off; const ang = .36, az = YAW + .18 - .30;
          const ex = lx + Math.sin(az) * Math.sin(ang) * dist, ey = P0.y + Math.cos(ang) * dist, ez = lz + Math.cos(az) * Math.sin(ang) * dist;
          cam.position.set(lerp(cam.position.x, ex, b), lerp(cam.position.y, ey, b), lerp(cam.position.z, ez, b)); look.set(lerp(look.x, lx, b), lerp(look.y, P0.y, b), lerp(look.z, lz, b)); }
      }
      cam.lookAt(look); cam.fov = 30; cam.near = u < 5 ? .02 : Math.max(.5, z * .02); cam.far = 60000; cam.updateProjectionMatrix();
      const far = seg(Math.log(Math.max(z, 1)), Math.log(30), Math.log(800));
      wall.u.uYouOpen.value = z < 160 ? 1 : 0; wall.u.uYouGain.value = z < 160 ? 1.2 : 3.5;
      wall.u.uMoon.value = 2.2 + 1.0 * far; wall.u.uWallB.value = lerp(2.2, 1.6, far); wall.u.uGlassK.value = lerp(.3, .42, far); wall.u.uIdle.value = lerp(.22, .08, seg(Math.log(Math.max(z, 1)), Math.log(500), Math.log(2240)));
      ctx.star.show(lerp(0, 1, far), z, cam);
      pp.aperture = u < 2.0 ? lerp(.0034, .0024, seg(u, 0, 1)) * (1 - seg(u, 1.1, 2.0)) : 0; pp.focus = Math.max(.1, cam.position.distanceTo(P0)); pp.bloom = .12; pp.threshold = 1.0; pp.vig = .5;
      pp.exposure = 1;
      return cam;
    },
  };
  return [s1, s3, s4];
}
