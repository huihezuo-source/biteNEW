import * as THREE from 'three';
import { seg, ss, E, lerp } from '../core.js';
import { makeEnv } from '../phone.js';
import { B } from '../script.js';

// 真付过的钱不沉：金币落在水面上，迎着自己的倒影，转到停下
export function coinShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G);
  const Z = -30, R = 1, TH = .13, HIT = B(45.25), env = makeEnv('room');
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, 1024, 1024); x.strokeStyle = '#ececec'; x.lineWidth = 36; x.beginPath(); x.arc(512, 512, 450, 0, 6.3); x.stroke(); x.lineWidth = 7; x.beginPath(); x.arc(512, 512, 392, 0, 6.3); x.stroke(); x.fillStyle = '#ececec'; x.font = '700 580px LoraV'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('¥', 512, 548);
  const bump = new THREE.CanvasTexture(c); bump.anisotropy = 16;
  const cap = new THREE.MeshStandardMaterial({ color: 0xffc25a, metalness: 1, roughness: .34, envMap: env, envMapIntensity: 2.6, bumpMap: bump, bumpScale: 2.2, emissive: 0x7a4a14, emissiveIntensity: .75 }), rim = new THREE.MeshStandardMaterial({ color: 0xf2aa44, metalness: 1, roughness: .34, envMap: env, envMapIntensity: 2, emissive: 0x7a4a14, emissiveIntensity: .5 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, TH, 128), [rim, cap, cap]), tilt = new THREE.Group(), spin = new THREE.Group(); tilt.add(coin); spin.add(tilt); spin.position.set(0, 0, Z); G.add(spin);
  const key = new THREE.PointLight(0xffd8a0, 60, 30, 2); key.position.set(1.6, 4.6, Z + 5); G.add(key); const back = new THREE.DirectionalLight(0xbcd0ff, 2.2); back.position.set(-3, 3, -6); G.add(back);
  const pose = (t, z = Z) => {
    spin.position.z = z;
    if (t < HIT) { const k = seg(t, B(45), HIT); spin.position.y = R * Math.sin(.7) + TH * .4 + (1 - k * k) * 5.4; spin.rotation.y = 0; tilt.rotation.x = .7 + (1 - k) * 11; return; }
    const q = t - HIT, b = q < .34 ? 2.8 * (q / .34) * (1 - q / .34) : 0, al = lerp(.7, .085, ss(0, 1.9, q));
    spin.position.y = R * Math.sin(al) + TH * .5 * Math.cos(al) + b; spin.rotation.y = 7 * q + 6 * q * q; tilt.rotation.x = al;
  };
  const look = new THREE.Vector3();
  const s = {
    a: B(45), b: B(46), scene: world, samples: 10, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      ctx.hideOthers(G); ctx.lakeCommon(t); sky.u.uMoonK.value = 0; lake.u.uMoon.value.set(0, .5, -.87).normalize(); lake.u.uGlit.value = .6; lake.u.uBroad.value = 0; lake.u.uChop.value = .05; lake.u.uDist.value = .004; lake.u.uMirror.value = .96; lake.setRipples([[0, Z, HIT, 1.3], [0, Z, HIT + .34, .9], [0, Z, HIT + .75, .6], [0, Z, HIT + 1.2, .4]]); pose(t);
      const k = E.io2(seg(t, B(45), B(46))); cam.position.set(lerp(-.7, .7, k), 1.3, Z + lerp(11.4, 9.6, k)); look.set(0, .2, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 36; cam.near = .1; cam.far = 20000; cam.updateProjectionMatrix();
      pp.aperture = .01; pp.focus = cam.position.distanceTo(look); pp.bloom = .22; pp.threshold = .9; pp.vig = .5; pp.exposure = 1.15; pp.sat = 1.1; return cam;
    },
    draw(c_) { lake.draw(world, c_); },
  };
  ctx.coin = { G, pose, HIT };
  return [s];
}
