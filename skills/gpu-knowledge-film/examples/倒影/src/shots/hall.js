import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv, bake } from '../phone.js';
import { B } from '../script.js';
import { textPlane } from '../text.js';

export function hallShots(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010102); const env = makeEnv('room');
  const planks = bake(/* glsl */`void main(){ vec2 p=vUv*vec2(10.,30.); vec2 id=floor(vec2(p.x,p.y+floor(p.x)*.37)); vec2 f=fract(vec2(p.x,p.y+floor(p.x)*.37)); float seam=smoothstep(.0,.02,f.x)*smoothstep(1.,.98,f.x)*smoothstep(.0,.006,f.y); float h=hash21(id); float g=fbm(vec2(p.x*7.+h*30.,p.y*.7),4); vec3 c=mix(vec3(.05,.027,.015),vec3(.14,.075,.04),g*.8+.2*h)*seam; O=vec4(pow(c,vec3(1./2.2)),1.); }`, 2048);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 60), new THREE.MeshPhysicalMaterial({ map: planks, roughness: .3, clearcoat: .6, clearcoatRoughness: .15, envMap: env, envMapIntensity: .3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .9, envMap: env, envMapIntensity: .12 });
  const boxR = (sx, sy, sz, x, y, z, m = wallM) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.receiveShadow = true; scene.add(b); return b; };
  // 后墙带三扇高窗（用四块墙拼出窗洞）
  const ZW = -18; const WN = [-9, 0, 9]; const ww = 4.6, wh = 11, wy = 8.5;
  boxR(36, 3, .6, 0, 1.5, ZW); boxR(36, 20, .6, 0, 24, ZW); [-15.65, -4.5, 4.5, 15.65].forEach(x => boxR(x === -15.65 || x === 15.65 ? 4.7 : 4.4, 11, .6, x, wy, ZW));
  boxR(.6, 34, 60, -18, 17, 6); boxR(.6, 34, 60, 18, 17, 6);
  // 窗：月光面 + 木格
  const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, .66, 1).multiplyScalar(2.2), toneMapped: false });
  const fr = new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: .7 });
  WN.forEach(x => { const g = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glass); g.position.set(x, wy, ZW - .2); scene.add(g); for (let i = 1; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.12, wh, .14), fr); b.position.set(x - ww / 2 + i * ww / 3, wy, ZW - .1); scene.add(b); } for (let j = 1; j < 6; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(ww, .12, .14), fr); b.position.set(x, wy - wh / 2 + j * wh / 6, ZW - .1); scene.add(b); } });
  // 体积月光
  const beamM = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: `out vec2 vU; out vec3 vW; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vU; in vec3 vW; out vec4 O; uniform float uT; ${GLSL_NOISE} void main(){ float e=smoothstep(0.,.2,vU.x)*smoothstep(1.,.8,vU.x); float l=pow(vU.y,1.6); float n=.55+.9*fbm(vW.xy*.5+vec2(uT*.1,-uT*.06),3); O=vec4(vec3(.42,.56,.95)*e*l*n*.13,1.); }` });
  WN.forEach(x => { for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, 34), beamM); p.position.set(x, 6.0, ZW + 9.5 + (i - 3) * .0); p.rotation.set(-Math.PI / 2 + .42, 0, 0); p.position.y = 6 + (i - 3) * .9; scene.add(p); } });
  const moon = new THREE.SpotLight(0xa9c2ff, 520, 90, .62, .5, 1.3); moon.position.set(0, 14, ZW - 8); moon.target.position.set(0, 0, 14); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -.0006; moon.shadow.radius = 4; scene.add(moon, moon.target);
  // 空椅子
  const parts = []; const pb = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); parts.push(g); };
  pb(.92, .07, .9, 0, .92, 0); [[-.4, -.38], [.4, -.38], [-.4, .38], [.4, .38]].forEach(([x, z]) => pb(.07, .92, .07, x, .46, z)); [-.4, .4].forEach(x => pb(.08, 1.2, .08, x, 1.52, -.41)); pb(.9, .14, .05, 0, 2.06, -.41); pb(.9, .12, .05, 0, 1.68, -.41); pb(.9, .1, .05, 0, 1.34, -.41);
  const chairG = mergeGeometries(parts.map(g => g.toNonIndexed())); chairG.computeVertexNormals();
  const NR = 7, NC = 9; const chairs = new THREE.InstancedMesh(chairG, new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: .55, envMap: env, envMapIntensity: .3 }), NR * NC); const d = new THREE.Object3D(), r = rng(1637); let n = 0;
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) { const x = (i - (NC - 1) / 2) * 1.9; if (Math.abs(x) < .3) continue; d.position.set(x + (r() - .5) * .08, 0, 2 + j * 2.5 + (r() - .5) * .08); d.rotation.set(0, Math.PI + (r() - .5) * .06, 0); d.updateMatrix(); chairs.setMatrixAt(n++, d.matrix); } chairs.count = n; chairs.castShadow = true; chairs.receiveShadow = true; chairs.instanceMatrix.needsUpdate = true; scene.add(chairs);
  // 拍卖台与木槌
  const dark = new THREE.MeshStandardMaterial({ color: 0x24140a, roughness: .45, envMap: env, envMapIntensity: .4 });
  const walnut = bake(/* glsl */`void main(){ vec2 p=vUv*vec2(2.,7.); float w=fbm(p*vec2(1.2,.4),5)*1.6; float r=.5+.5*sin((p.x*9.+w)*5.); float f=fbm(vec2(p.x*60.,p.y*2.),4); vec3 c=mix(vec3(.05,.022,.012),vec3(.2,.1,.05),r*.65+.35*f); O=vec4(pow(c,vec3(1./2.2)),1.); }`, 1024);
  const wood2 = new THREE.MeshPhysicalMaterial({ map: walnut, roughness: .46, clearcoat: .35, clearcoatRoughness: .4, envMap: env, envMapIntensity: .55 });
  const pod = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 1.8), dark); pod.position.set(0, 1.6, -7.5); pod.castShadow = true; scene.add(pod);
  const block = new THREE.Mesh(new THREE.CylinderGeometry(.56, .62, .16, 48), new THREE.MeshPhysicalMaterial({ map: walnut, roughness: .5, clearcoat: .3, envMap: env, envMapIntensity: .5 })); block.position.set(.8, 3.28, -7.2); block.receiveShadow = true; scene.add(block);
  const gav = new THREE.Group(); gav.position.set(1.9, 3.46, -7.2); const prof = [[.0, -.5], [.24, -.5], [.26, -.46], [.26, -.34], [.3, -.32], [.3, -.26], [.25, -.24], [.25, .24], [.3, .26], [.3, .32], [.26, .34], [.26, .46], [.24, .5], [0, .5]].map(([x, y]) => new THREE.Vector2(x, y)); const head = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), wood2); head.rotation.x = Math.PI / 2; head.position.set(-1.1, .02, 0); const hand = new THREE.Mesh(new THREE.CylinderGeometry(.055, .085, 1.9, 16), wood2); hand.rotation.z = Math.PI / 2; hand.position.x = -.16; gav.add(head, hand); gav.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(gav);
  const cl = new THREE.PointLight(0xffb060, 80, 30, 2); cl.position.set(0, 9, -5); scene.add(cl); const cl2 = new THREE.PointLight(0xffa858, 70, 30, 2); cl2.position.set(0, 7, 9); scene.add(cl2);
  const candles = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .72, .32).multiplyScalar(14), toneMapped: false }), 14); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; d.position.set(Math.cos(a) * 2, 9.4, -5 + Math.sin(a) * 2); d.rotation.set(0, 0, 0); d.scale.set(1, 2, 1); d.updateMatrix(); candles.setMatrixAt(i, d.matrix); } candles.instanceMatrix.needsUpdate = true; scene.add(candles);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, .05, 8, 64), dark); ring.rotation.x = Math.PI / 2; ring.position.set(0, 9.2, -5); scene.add(ring);
  const slate = new THREE.Mesh(new THREE.BoxGeometry(7, 3, .16), new THREE.MeshStandardMaterial({ color: 0x050606, roughness: .9 })); slate.position.set(0, 7.5, -6.8); scene.add(slate);
  const drops = ['ƒ3,000', 'ƒ2,000', 'ƒ1,000'].map(s_ => { const m = textPlane(s_, { size: 170, weight: 700, family: 'LoraV', color: '#2EE08A', height: 2.5, gain: 2.2, additive: false }); m.position.set(0, 7.5, -6.68); scene.add(m); return m; });
  const look = new THREE.Vector3();
  const s = {
    a: B(41.25), b: B(43), scene, samples: 12, samplesDraft: 3, subDark: .92,
    update(t, u, pp) {
      beamM.uniforms.uT.value = t; cl.intensity = 80 * (1 + .08 * Math.sin(t * 9) + .05 * Math.sin(t * 15.3));
      const k = seg(t, B(41.25), B(43)); const hit = B(42.25); const lift = t < hit ? ss(hit - .9, hit - .28, t) : 0; const down = t >= hit - .28 && t < hit ? E.in3(seg(t, hit - .28, hit)) : 0; gav.rotation.z = t < hit ? -(lift * 1.1) * (1 - down) : 0; if (t >= hit - .28 && t < hit) gav.rotation.z = -1.1 * (1 - down);
      drops.forEach((m, i) => { const t0 = B(41.25) + i * .62, t1 = t0 + .62, q = seg(t, t1 - .14, t1); m.visible = t >= t0 && (i === 2 ? t < B(43) : t < t1); m.position.y = 7.5 - .9 * E.in2(q); m.material.opacity = ss(t0, t0 + .08, t) * (1 - (i === 2 ? 0 : q)); });
      if (t < hit) { cam.position.set(lerp(.0, .05, k), lerp(3.2, 2.6, k), lerp(21, 11, E.io2(seg(t, B(41.25), hit)))); look.set(0, 4.2, -8); cam.fov = 46; }
      else { const v = seg(t, hit, B(43)); cam.position.set(1.7 + v * .4, 4.7, -10.3 + v * .3); look.set(.4, 2.4, 6); cam.fov = 48; }
      cam.up.set(0, 1, 0); cam.lookAt(look); cam.near = .1; cam.far = 200; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = .9; pp.vig = .55; pp.exposure = 1.15; pp.sat = 1;
      return cam;
    },
  };
  return [s];
}
