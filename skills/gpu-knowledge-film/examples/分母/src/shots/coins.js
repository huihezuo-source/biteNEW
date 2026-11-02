import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng } from '../core.js';
import { makeEnv, bake } from '../phone.js';
import { counter } from './wall.js';

// 成本 vs 收入：一枚 = 500 元。小摞 12 枚，大柱 5820 枚。
const TH = .082, R = .5, N = 5820;
function coinGeo() {
  const b = .012, seg_ = 128; const g = new THREE.BufferGeometry();
  const pr = [[0, TH / 2 - .006], [R - .11, TH / 2 - .006], [R - .095, TH / 2], [R - b, TH / 2], [R, TH / 2 - b], [R, -TH / 2 + b], [R - b, -TH / 2], [R - .095, -TH / 2], [R - .11, -TH / 2 + .006], [0, -TH / 2 + .006]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pr, seg_);
}
const dark = x => { const gr = x.createLinearGradient(0, 0, 0, 620 * UI); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.72, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 620 * UI); };
export function coinsShots(ctx) {
  const { cam } = ctx;
  const env = makeEnv('coin');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const reed = bake(`void main(){ float a=vUv.x*150.; float t=abs(fract(a)-.5)*2.; float edge=step(.445,vUv.y)*step(vUv.y,.555); O=vec4(vec3(mix(.5,t*t,edge)),1.); }`, 2048, {}, false);
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0a030, metalness: 1, roughness: .26, envMap: env, envMapIntensity: .42, bumpMap: reed, bumpScale: .9 });
  const geo = coinGeo(), r = rng(5);
  const tall = new THREE.InstancedMesh(geo, gold, N), small = new THREE.InstancedMesh(geo, gold, 12), smallM = new THREE.InstancedMesh(geo, gold, 12);
  const d = new THREE.Object3D();
  const off = Array.from({ length: N }, () => [(r() - .5) * .028, (r() - .5) * .028, r() * 6.28, (r() - .5) * .022, (r() - .5) * .022]);
  for (let i = 0; i < N; i++) { const o = off[i]; d.position.set(o[0], TH / 2 + i * TH, o[1]); d.rotation.set(o[3], o[2], o[4]); d.updateMatrix(); tall.setMatrixAt(i, d.matrix); }
  for (let i = 0; i < 12; i++) { const o = off[i + 200]; d.position.set(o[0] * 3, TH / 2 + i * TH, o[1] * 3); d.rotation.set(o[3] * 1.6, o[2], o[4] * 1.6); d.updateMatrix(); small.setMatrixAt(i, d.matrix); d.position.y = -d.position.y; d.updateMatrix(); smallM.setMatrixAt(i, d.matrix); }
  [tall, small, smallM].forEach(m => { m.frustumCulled = false; m.instanceMatrix.needsUpdate = true; }); 
  scene.add(tall, small, smallM);
  // 半透黑桌面 + 水下倒影
  const table = new THREE.Mesh(new THREE.CircleGeometry(900, 96), new THREE.MeshPhysicalMaterial({ color: 0x030303, metalness: 0, roughness: .14, envMap: env, envMapIntensity: .12, transparent: true, opacity: .80 })); table.rotation.x = -Math.PI / 2; scene.add(table);
  const dust = (() => { const n = 1600, p = new Float32Array(n * 3), rr = rng(12); for (let i = 0; i < n; i++) { p[i * 3] = (rr() - .5) * 14; p[i * 3 + 1] = rr() * 480; p[i * 3 + 2] = (rr() - .5) * 14; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(1, .7, .3).multiplyScalar(1.6), size: .022, sizeAttenuation: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); })(); dust.frustumCulled = false; scene.add(dust);
  const look = new THREE.Vector3();
  const s13a = {
    a: 66.96, b: 69.46, scene, samples: 14, samplesDraft: 4,
    update(t, u, pp) {
      table.material.envMapIntensity = .12; tall.count = 0; const c = Math.min(12, 1 + Math.floor(u / .11)); small.count = smallM.count = c;
      const k = E.io2(seg(u, 0, 2.5));
      cam.position.set(lerp(-2.0, -1.2, k), lerp(.72, .46, k), lerp(5.9, 5.2, k)); look.set(0, .98, 0); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 26; cam.near = .05; cam.far = 3000; cam.updateProjectionMatrix();
      pp.bloom = .10; pp.threshold = 1.2; pp.vig = .6; pp.aperture = .03; pp.focus = cam.position.distanceTo(look); pp.exposure = 1;
      return cam;
    },
    hud(x, u, t, h) { counter(x, '¥5,994', 340, { size: 180, color: '#FFD27A', label: '二十万条短信的成本', a: ss(0, .18, u), plate: .5 }); h.gain = 2; },
  };
  // 13b：贴地仰拍，金柱冲天
  const s13b = {
    a: 69.46, b: 71.46, scene, samples: 12, samplesDraft: 4,
    update(t, u, pp) {
      table.material.envMapIntensity = .012; const reach = E.in2(seg(u, 0, 2.0)) * .6 + .4 * seg(u, 0, 2.0); const c = Math.max(12, Math.floor(reach * N * .9)); tall.count = c; small.count = 12; smallM.count = 12;
      const a = -.5 + u * .22, dist = 2.6 - .4 * u;
      cam.position.set(Math.sin(a) * dist, .34, Math.cos(a) * dist); look.set(0, 16 + u * 10, 0); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 62; cam.near = .05; cam.far = 3000; cam.updateProjectionMatrix();
      pp.bloom = .14; pp.threshold = 1.0; pp.vig = .55; pp.exposure = 1.05; pp.sat = 1.08;
      return cam;
    },
    hud(x, u, t, h) { dark(x); const v = Math.floor(lerp(5994, 2910000 * .9, E.in2(seg(u, 0, 2.0)) * .6 + .4 * seg(u, 0, 2.0))); counter(x, '¥' + v.toLocaleString('en-US'), 340, { size: 158, color: '#FFE3A8', label: '97 个人，每人三万', a: ss(0, .1, u) }); h.gain = 2.1; },
  };
  // 13c：到顶，俯视一眼望到底
  const s13c = {
    a: 71.46, b: 72.46, scene, samples: 12, samplesDraft: 4,
    update(t, u, pp) {
      table.material.envMapIntensity = .012; const c = Math.min(N, Math.floor(N * lerp(.9, 1, E.out3(seg(u, 0, .64))))); tall.count = c; small.count = 12; smallM.count = 12;
      const top = c * TH, a = .4 + u * .3, k = E.out3(seg(u, 0, .9));
      cam.position.set(Math.sin(a) * 1.15, top + lerp(3.4, 2.5, k), Math.cos(a) * 1.15); look.set(0, top - 30, -1.3); cam.up.set(Math.sin(a), .02, Math.cos(a)); cam.lookAt(look); cam.fov = 58; cam.near = .05; cam.far = 3000; cam.updateProjectionMatrix();
      pp.bloom = .16; pp.threshold = 1.0; pp.vig = .55; pp.exposure = 1.05; pp.sat = 1.08;
      return cam;
    },
    hud(x, u, t, h) { const v = Math.floor(lerp(2910000 * .9, 2910000, E.out3(seg(u, 0, .64)))); counter(x, '¥' + v.toLocaleString('en-US'), 300, { size: 158, color: '#FFE3A8', label: '97 个人，每人三万' }); h.gain = 2.1; },
  };
  return [s13a, s13b, s13c];
}
