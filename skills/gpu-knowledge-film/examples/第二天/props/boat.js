import * as THREE from 'three';
import { makeEnv, bake } from './phone.js';
import { rng } from './core.js';

// 全片唯一“真”的东西：一条小木船，一舱金子，一盏灯
let cache = null;
function assets() {
  if (cache) return cache;
  const env = makeEnv('room');
  const planks = bake(/* glsl */`void main(){ vec2 p=vUv*vec2(1.,9.); vec2 id=floor(p),f=fract(p); float seam=smoothstep(.0,.05,f.y)*smoothstep(1.,.95,f.y); float h=hash21(vec2(id.y,3.)); float g=fbm(vec2(p.x*30.+h*40.,p.y*2.),4); vec3 c=mix(vec3(.1,.06,.04),vec3(.32,.19,.11),g*.8+.2*h)*(.25+.75*seam); O=vec4(pow(c,vec3(1./2.2)),1.); }`, 1024);
  cache = { env, planks,
    hull: new THREE.MeshPhysicalMaterial({ map: planks, roughness: .55, clearcoat: .4, clearcoatRoughness: .35, side: THREE.DoubleSide, envMap: env, envMapIntensity: .55 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: .5, envMap: env, envMapIntensity: .4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffb648, metalness: 1, roughness: .3, envMap: env, envMapIntensity: 1.4, emissive: 0x4a2a08, emissiveIntensity: .6 }),
    glass: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .66, .3).multiplyScalar(7), toneMapped: false }),
    iron: new THREE.MeshStandardMaterial({ color: 0x16120e, roughness: .6, metalness: .6 }) };
  return cache;
}
export function makeBoat({ light = true, seed = 3 } = {}) {
  const A = assets(), G = new THREE.Group(), r = rng(seed);
  const L = 3.3, B_ = 1.08, nu = 64, nv = 24, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) { const u = i / nu * 2 - 1, b = B_ * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), .8), top = .62 + .26 * u * u, keel = -.12 + .1 * u * u;
    for (let j = 0; j <= nv; j++) { const v = j / nv * 2 - 1, a = Math.abs(v) * Math.PI / 2; pos.push(u * L, keel + (top - keel) * (1 - Math.cos(a)), Math.sign(v) * b * Math.pow(Math.sin(a), .8)); uv.push(i / nu, j / nv); } }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setIndex(idx); hg.computeVertexNormals(); G.add(new THREE.Mesh(hg, A.hull));
  // 船舷
  [1, -1].forEach(s => { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40 * 2 - 1; pts.push(new THREE.Vector3(u * L, .62 + .26 * u * u, s * B_ * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.6)), .8))); } G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .055, 8), A.rim)); });
  [-1.4, 1.5].forEach(x => { const t = new THREE.Mesh(new THREE.BoxGeometry(.34, .05, 1.8), A.rim); t.position.set(x, .42, 0); G.add(t); });
  // 一舱金子
  const cg = new THREE.CylinderGeometry(.13, .13, .03, 16), n = 170, coins = new THREE.InstancedMesh(cg, A.gold, n), d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const a = r() * 6.28, R = Math.sqrt(r()), x = Math.cos(a) * R * .95, z = Math.sin(a) * R * .56, h = (1 - R * R) * .36; d.position.set(x, .16 + h * r() + .02, z); d.rotation.set((r() - .5) * .7, r() * 6, (r() - .5) * .7); d.updateMatrix(); coins.setMatrixAt(i, d.matrix); } coins.instanceMatrix.needsUpdate = true; coins.frustumCulled = false; G.add(coins);
  // 灯
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 2.1, 10), A.iron); pole.position.set(2.5, 1.5, 0); G.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 8), A.iron); arm.rotation.z = Math.PI / 2; arm.position.set(2.3, 2.5, 0); G.add(arm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.24, .34, .24), A.glass); body.position.set(2.08, 2.22, 0); G.add(body);
  [[.2, .04, .28, 2.42], [.26, .03, .3, 2.03]].forEach(([w, h, dp, y]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(w + .08, h, dp), A.iron); c.position.set(2.08, y, 0); G.add(c); });
  const gc = document.createElement('canvas'); gc.width = gc.height = 256; { const x = gc.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,210,140,.9)'); g.addColorStop(.16, 'rgba(255,160,70,.4)'); g.addColorStop(.5, 'rgba(255,120,40,.08)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
  const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 1 })); halo.position.set(2.08, 2.22, .1); halo.scale.set(9, 9, 1); G.add(halo);
  if (light) { const l = new THREE.PointLight(0xffb060, 26, 16, 2); l.position.set(1.7, 2.1, .3); G.add(l); }
  const rock = (t, k = 1, y0 = 0) => { G.position.y = y0 + Math.sin(t * .9 + seed) * .05 * k; G.rotation.z = Math.sin(t * .7 + seed) * .02 * k; G.rotation.x = Math.sin(t * .55 + seed * 2) * .03 * k; };
  return { group: G, halo, rock };
}
