import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { REFLECT_ONLY } from '../lake.js';
import { B } from '../script.js';
import { dustFigure, silhouette } from '../figure.js';
import { makeEnv } from '../phone.js';

// 栈桥向远处延伸，人站在靠镜头这一端，水面在镜头和人之间
export function pierShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G); const Z = -36, PH = 1.5;
  const env = makeEnv('room');
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: .75, envMap: env, envMapIntensity: .3 });
  const pg = new THREE.BoxGeometry(5.2, .16, .9), NP = 96; const planks = new THREE.InstancedMesh(pg, wood, NP); const d = new THREE.Object3D(), r = rng(7);
  for (let i = 0; i < NP; i++) { d.position.set((r() - .5) * .14, PH, Z - i * 1.02); d.rotation.set(0, (r() - .5) * .018, (r() - .5) * .012); d.updateMatrix(); planks.setMatrixAt(i, d.matrix); } planks.instanceMatrix.needsUpdate = true; planks.frustumCulled = false; G.add(planks);
  const postG = new THREE.CylinderGeometry(.16, .18, 6, 12); const posts = new THREE.InstancedMesh(postG, wood, 32); for (let i = 0; i < 32; i++) { d.position.set(i % 2 ? 2.5 : -2.5, 0, Z - Math.floor(i / 2) * 6); d.rotation.set(0, 0, 0); d.updateMatrix(); posts.setMatrixAt(i, d.matrix); } posts.instanceMatrix.needsUpdate = true; posts.frustumCulled = false; G.add(posts);
  const key = new THREE.DirectionalLight(0xb4c6f0, 1.6); key.position.set(-4, 9, 8); G.add(key);
  const me = dustFigure(60000, 3); me.u.uScale.value = 4.6; me.u.uBase.value.set(0, PH + .08, Z - .6); me.u.uC.value.setRGB(.72, .8, 1); me.u.uC2.value.setRGB(.98, .98, 1); me.u.uK.value = .34; G.add(me.pts);
  const shadow = silhouette(); shadow.scale.setScalar(4.6); shadow.position.set(0, PH + .08, Z - .6); shadow.visible = false; G.add(shadow);
  const giant = dustFigure(520000, 11); giant.pts.layers.set(REFLECT_ONLY); giant.u.uBase.value.set(0, .02, Z - .6); giant.u.uSz.value = 1.7; giant.u.uC.value.setRGB(1, .1, .06); giant.u.uC2.value.setRGB(1, .34, .2); G.add(giant.pts);
  const look = new THREE.Vector3();
  const com = t => { ctx.hideOthers(G); if (ctx.dawnOff) ctx.dawnOff(); giant.pts.visible = true; shadow.visible = false; me.pts.visible = true; me.u.uC.value.setRGB(.72, .8, 1); me.u.uC2.value.setRGB(.98, .98, 1); me.u.uK.value = .34; me.u.uT.value = t; ctx.lakeCommon(t); giant.u.uT.value = t; sky.u.uMoon.value.set(-.34, .30, -.89).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = 1; lake.u.uGlit.value = .25; };
  const scaleAt = t => { let s = 4.6; [[62, 12], [62.5, 24], [63, 40], [63.5, 62]].forEach(([b, v]) => { const k = E.out3(seg(t, B(b), B(b) + .5)); s = lerp(s, v, k); }); return s; };
  const s1 = {
    a: B(61), b: B(64), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, uu, pp) {
      com(t); const k = E.io2(seg(t, B(61), B(62))), v = E.io2(seg(t, B(62), B(64))); lake.u.uChop.value = .1; lake.u.uDist.value = .007; lake.u.uMirror.value = .94; lake.setRipples([]);
      giant.u.uC.value.setRGB(1, .1, .06); giant.u.uC2.value.setRGB(1, .34, .2); giant.u.uScale.value = scaleAt(t); giant.u.uBreak.value = 0; giant.u.uK.value = lerp(.1, .2, ss(B(62), B(63), t));
      cam.position.set(lerp(-7, 0, k), lerp(3.2, 7, k) + v * 1.5, Z + lerp(16, 30, k) + v * 84); look.set(0, lerp(4, 3, k) - v * 27, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 44; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = .8; pp.vig = .5; pp.exposure = 1.1; pp.sat = 1.12;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(64), b: B(66), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, uu, pp) {
      com(t); const b = seg(t, B(64), B(65)); lake.u.uChop.value = lerp(lerp(.1, 2.4, E.in2(seg(t, B(64), B(64.4)))), .12, E.io2(seg(t, B(64.8), B(65.5)))); lake.u.uDist.value = lake.u.uChop.value * .045 + .006; lake.u.uMirror.value = .92; lake.setRipples([]);
      giant.u.uScale.value = 62; giant.u.uBreak.value = E.in2(b); giant.u.uK.value = .2; const gc = ss(B(64), B(64.5), t); giant.u.uC.value.setRGB(lerp(1, .04, gc), lerp(.1, 1, gc), lerp(.06, .4, gc)); giant.u.uC2.value.setRGB(lerp(1, .3, gc), lerp(.34, 1, gc), lerp(.2, .6, gc));
      const c = E.io2(seg(t, B(64.8), B(66))); cam.position.set(lerp(0, -5, c), lerp(8.5, 3, c), Z + lerp(114, 19, c)); look.set(0, lerp(-24, 4, c), Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(44, 40, c); cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = .85; pp.vig = .55; pp.exposure = 1.12; pp.sat = 1.1;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  ctx.pier = { G, me, giant, Z, PH, shadow };
  return [s1, s2];
}
