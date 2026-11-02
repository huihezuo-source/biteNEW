import * as THREE from 'three';
import { bake } from './phone.js';
import { rng } from './core.js';

// 程序化四发轰炸机：长度约 22.7 m、翼展约 31.6 m。机头朝 -z，上方 +y。
const v2 = (x, y) => new THREE.Vector2(x, y);
export function makeBomber(env, opts = {}) {
  const g = new THREE.Group();
  const panel = bake(/* glsl */`
    void main(){ vec2 p=vUv*vec2(10.,24.); vec2 c=fract(p),id=floor(p);
      float line=smoothstep(.0,.015,min(min(c.x,1.-c.x),min(c.y,1.-c.y)));
      vec2 r=abs(fract(vUv*vec2(120.,288.))-.5); float rivet=smoothstep(.16,.10,length(r));
      float rv=rivet*(smoothstep(.06,.04,min(c.x,1.-c.x))+smoothstep(.06,.04,min(c.y,1.-c.y)));
      float h=hash21(id); float s=.76+.2*h+.05*fbm(vUv*90.,3);
      float b=line*.9+.1; O=vec4(vec3(s*b),1.); O.a=1.; }`, 2048);
  const bump = bake(/* glsl */`
    void main(){ vec2 p=vUv*vec2(10.,24.); vec2 c=fract(p);
      float line=smoothstep(.0,.012,min(min(c.x,1.-c.x),min(c.y,1.-c.y)));
      vec2 r=abs(fract(vUv*vec2(120.,288.))-.5); float rivet=smoothstep(.2,.08,length(r))*(smoothstep(.06,.04,min(c.x,1.-c.x))+smoothstep(.06,.04,min(c.y,1.-c.y)));
      O=vec4(vec3(line*.7+rivet*.3),1.); }`, 2048, {}, false);
  const rough = bake(`void main(){ float f=fbm(vUv*vec2(40.,8.),5); float g=fbm(vUv*300.,3); O=vec4(0.,.26+.26*f+.10*g,1.,1.); }`, 1024, {}, false);
  panel.wrapS = panel.wrapT = bump.wrapS = bump.wrapT = rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xd8dade, metalness: 1, roughness: 1, roughnessMap: rough, map: panel, bumpMap: bump, bumpScale: 1.2, envMap: env, envMapIntensity: opts.env ?? 1.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: .4, roughness: .5, envMap: env, envMapIntensity: .4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1218, metalness: 0, roughness: .06, envMap: env, envMapIntensity: 1.5, clearcoat: 1 });
  const parts = { engines: [] };
  // 机身：回转体
  const prof = [[0, 0], [.34, .25], [.72, .9], [.98, 1.8], [1.12, 3.2], [1.2, 5], [1.22, 8], [1.18, 11], [1.02, 14], [.8, 16.5], [.56, 19], [.36, 21], [.2, 22.2], [0, 22.7]].map(([r, z]) => v2(r, z));
  const curve = new THREE.SplineCurve(prof); const pts = curve.getPoints(70).map(p => v2(Math.max(p.x, .0001), p.y));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), metal); fus.rotation.x = Math.PI / 2; fus.position.z = -11.3; g.add(fus);   // y→z
  // 驾驶舱玻璃、炮塔
  const cock = new THREE.Mesh(new THREE.SphereGeometry(.72, 32, 20, 0, 6.3, 0, 1.5), glass); cock.scale.set(1.0, .62, 1.7); cock.position.set(0, .86, -7.2); g.add(cock);
  const turret = new THREE.Mesh(new THREE.SphereGeometry(.56, 32, 20, 0, 6.3, 0, 1.6), glass); turret.position.set(0, 1.14, -3.4); g.add(turret);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.62, 32, 20), glass); nose.scale.set(1, 1, 1.25); nose.position.set(0, .04, -10.9); g.add(nose);
  // 机翼：平面形 + 上凸厚度
  function wingGeo(rootC, tipC, span, sweepLE, thick) {
    const seg = 40, ch = 18, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const s = i / seg, c = rootC + (tipC - rootC) * s, le = sweepLE * s, x = s * span;
      for (let j = 0; j <= ch; j++) { const t = j / ch, z = le + t * c; const y = thick * (1 - s * .72) * 4 * t * (1 - t) ** 1.4 * .86; pos.push(x, y, z); uv.push(s * 1.2, t * .36); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ch; j++) { const a = i * (ch + 1) + j, b = a + ch + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const start = pos.length / 3;
    for (let i = 0; i <= seg; i++) { const s = i / seg, c = rootC + (tipC - rootC) * s, le = sweepLE * s, x = s * span; for (let j = 0; j <= ch; j++) { const t = j / ch, z = le + t * c; pos.push(x, -thick * .14 * (1 - s * .7) * Math.sin(t * Math.PI), z); uv.push(s * 1.2, t * .36); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ch; j++) { const a = start + i * (ch + 1) + j, b = a + ch + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); G.setIndex(idx); G.computeVertexNormals(); return G;
  }
  const wg = wingGeo(6.0, 1.7, 15.2, 2.9, .78);
  const wingM = metal.clone(); wingM.side = THREE.DoubleSide; wingM.envMapIntensity = (opts.env ?? 1.15) * .46; wingM.color.set(0xb4b8bf);
  [1, -1].forEach(s => { const w = new THREE.Mesh(wg, wingM); w.scale.x = s; w.position.set(s * .6, -.1, -4.2); g.add(w); });
  // 平尾、垂尾
  const hg = wingGeo(3.3, 1.1, 5.4, 1.5, .24); [1, -1].forEach(s => { const w = new THREE.Mesh(hg, wingM); w.scale.x = s; w.position.set(s * .2, .1, 7.6); g.add(w); });
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(5.2, 0); fin.lineTo(5.0, 3.6); fin.quadraticCurveTo(4.6, 4.3, 3.8, 4.3); fin.lineTo(2.6, 3.8); fin.lineTo(0, .8); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, { depth: .14, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 3, curveSegments: 16 });
  const F = new THREE.Mesh(fg, metal); F.rotation.y = -Math.PI / 2; F.position.set(.07, .75, 6.2); g.add(F);
  // 四台发动机
  const nacP = new THREE.SplineCurve([[.0, 0], [.46, .1], [.74, .55], [.8, 1.2], [.72, 2.1], [.46, 2.9], [.2, 3.4], [0, 3.6]].map(([r, z]) => v2(r, z))).getPoints(28).map(p => v2(Math.max(p.x, .0001), p.y));
  const nacG = new THREE.LatheGeometry(nacP, 40);
  [[-3.9, -5.9], [-7.8, -5.1], [3.9, -5.9], [7.8, -5.1]].forEach(([x, z], i) => {
    const e = new THREE.Group(); e.position.set(x, .06, z);
    const n = new THREE.Mesh(nacG, metal); n.rotation.x = Math.PI / 2; e.add(n);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(.26, 24, 16), dark); hub.scale.z = 1.5; hub.position.z = -.15; e.add(hub);
    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(.82, .84, .95, 40, 1, true), dark); cowl.rotation.x = Math.PI / 2; cowl.position.z = .52; e.add(cowl);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48), new THREE.MeshBasicMaterial({ color: 0x8a8f96, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false })); disc.position.z = -.22; e.add(disc);
    const prop = new THREE.Group(); prop.position.z = -.2; for (let b = 0; b < 3; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.92, .03), dark); bl.position.y = .98; const a = new THREE.Group(); a.rotation.z = b * 2.094; a.add(bl); prop.add(a); } e.add(prop);
    g.add(e); parts.engines.push({ g: e, x, z: z, prop });
  });
  return { group: g, parts, metal, mats: { metal, dark, glass } };
}

// 机身俯视坐标 → 是否落在飞机上（给弹孔撒点）
export function holeSpots(seed = 43, n = 240) {
  const r = rng(seed), out = [];
  const inWing = (x, z) => { const s = (Math.abs(x) - .6) / 15.2; if (s < 0 || s > 1) return false; const le = -4.2 + 2.2 * s, c = 6.0 - 4.1 * s; return z > le && z < le + c; };
  const nearEngine = (x, z) => [[-3.9, -5.9], [-7.8, -5.1], [3.9, -5.9], [7.8, -5.1]].some(([ex, ez]) => Math.abs(x - ex) < 1.0 && z > ez - 1 && z < ez + 4.6);
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const u = r(); let x, z, part;
    if (u < .42) { z = -7 + r() * 17.5; const hw = z < 6 ? 1.05 : lerp_(1.05, .35, (z - 6) / 5); x = (r() - .5) * 2 * hw; part = 'f'; if (z < -6) continue; }
    else if (u < .9) { x = (r() < .5 ? -1 : 1) * (1.2 + r() * 13.6); z = -4.2 + r() * 7.4; if (!inWing(x, z)) continue; part = 'w'; if (nearEngine(x, z)) continue; }
    else { x = (r() - .5) * 11; z = 7.6 + r() * 3.2; const s = Math.abs(x) / 5.6; if (s > 1) continue; if (z > 7.6 + 1.5 * s + 3.3 - 2.2 * s || z < 7.6 + 1.5 * s) continue; part = 't'; }
    out.push({ x, z, part, k: r() });
  }
  return out;
}
const lerp_ = (a, b, k) => a + (b - a) * Math.min(1, Math.max(0, k));
