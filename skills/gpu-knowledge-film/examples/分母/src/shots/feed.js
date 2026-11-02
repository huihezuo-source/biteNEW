import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng } from '../core.js';

// 亮的是晒出来的，暗的是没发的；最后被一道线隔开
const CW_ = 1.5, CH_ = 2.0;
function card(pct, name, seed) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 800; const x = c.getContext('2d'); const r = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, '#1A1014'); g.addColorStop(1, '#0E0A0B'); x.fillStyle = g; x.fillRect(0, 0, 600, 800);
  x.fillStyle = '#E9E2DC'; x.font = '600 34px NSans'; x.fillText(name, 40, 76); x.fillStyle = '#FFB9B0'; x.font = '500 28px NSans'; x.fillText('持仓收益', 40, 170);
  x.fillStyle = '#FF3B30'; x.font = '900 112px JB'; x.fillText(pct, 34, 288);
  // K 线
  let y = 700, px = 44; for (let i = 0; i < 26; i++) { const up = r() < .72; const b = 8 + r() * 26, wk = b + r() * 26; const ny = y - (up ? b : -b * .6); x.fillStyle = up ? '#FF3B30' : '#1FCB7C'; x.fillRect(px + 7, Math.min(y, ny) - wk * .4, 2, Math.abs(ny - y) + wk * .8); x.fillRect(px, Math.min(y, ny), 16, Math.abs(ny - y) + 2); y = ny; px += 20; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function feedShots(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const NX = 64, NY = 96, N = NX * NY;
  // 暗格
  const darkM = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { uDrop: { value: 0 }, uT: { value: 0 }, uOff: { value: 0 } },
    vertexShader: `in float aS; uniform float uDrop; out vec2 vU; out float vS; out vec2 vG; void main(){ vU=uv; vS=aS; vec4 w=instanceMatrix*vec4(position,1.); vG=w.xy; w.y-=uDrop*(1.+.3*aS); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float; in vec2 vU; in float vS; in vec2 vG; uniform float uOff; out vec4 O; void main(){ vec2 e=min(vU,1.-vU)*vec2(1.5,2.); float edge=smoothstep(.04,.018,min(e.x,e.y)); vec3 c=vec3(.05,.052,.066)+vec3(.42,.46,.6)*edge*(.5+.5*vS); float k=1.-smoothstep(0.,.1,uOff-length(vG)*.0052-vS*.35); k=max(k,.10*step(.45,vS)*(.3+vS)); vec3 scr=mix(vec3(.8,.22,.05),vec3(1.,.52,.18),vS)*(.16+.62*vS*vS); c+=scr*k*(.62+.38*smoothstep(.0,.6,vU.y)); O=vec4(c,1.); }` });
  const dg = new THREE.PlaneGeometry(CW_ * .92, CH_ * .92); const aS = new Float32Array(N); const r = rng(77); for (let i = 0; i < N; i++) aS[i] = r(); dg.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1));
  const dark = new THREE.InstancedMesh(dg, darkM, N); const d = new THREE.Object3D(); for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { d.position.set((i - NX / 2) * CW_, (j - NY / 2) * CH_, 0); d.updateMatrix(); dark.setMatrixAt(j * NX + i, d.matrix); } dark.frustumCulled = false; dark.instanceMatrix.needsUpdate = true; scene.add(dark);
  // 亮卡：前四张重拍，其余散落
  const data = [['+268%', '@股海老王', 11], ['+132%', '@打板小能手', 22], ['+97%', '@稳稳的幸福', 33], ['+310%', '@翻倍姐', 44], ['+540%', '@十年一剑', 55], ['+86%', '@牛散阿强', 66], ['+203%', '@财务自由中', 77], ['+148%', '@一字板', 88]];
  const lit = []; const rr = rng(5);
  for (let i = 0; i < 46; i++) { const a = data[i % data.length], m = new THREE.MeshBasicMaterial({ map: card(a[0], a[1], a[2] + i), toneMapped: false, transparent: true }); m.color.setScalar(1.5); const me = new THREE.Mesh(new THREE.PlaneGeometry(CW_ * .92, CH_ * .92), m); const gx = Math.floor(rr() * NX) - NX / 2, gy = Math.floor(rr() * NY) - NY / 2; me.userData = { gx: gx * CW_, gy: gy * CH_, sx: (rr() - .5) * 46, sy: 13 + rr() * 17, rot: (rr() - .5) * .3, i }; scene.add(me); lit.push(me); }
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(400, .14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .86, .62).multiplyScalar(6), toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); bar.position.set(0, 9.5, .2); scene.add(bar);
  const T = [112.46, 113.21, 113.96, 114.71]; const A = 112.46;
  for (const m of lit) m.material.color.setScalar(2.6);
  const s20 = {
    a: A, b: 120.46, scene, samples: 8, samplesDraft: 3, subDark: .95,
    update(t, u, pp) {
      const pull = E.io3(seg(t, 115.2, 116.5)); const dist = Math.exp(lerp(Math.log(4.9), Math.log(66), pull));
      const lift = E.io3(seg(t, 117.96, 119.4));
      cam.position.set(lerp(.0, 2, pull), lerp(0, 2, pull), dist); cam.up.set(0, 1, 0); cam.lookAt(lerp(0, 1, pull), lerp(0, 2, pull), 0); cam.fov = 30; cam.near = .1; cam.far = 1000; cam.updateProjectionMatrix();
      darkM.uniforms.uDrop.value = lift * 7; darkM.uniforms.uOff.value = t < 116.1 ? 0 : (t - 116.1) * .72;
      dark.visible = t >= 115.2;
      lit.forEach((m, i) => { const q = m.userData; const big = i < 4; const tA = big ? T[i] : 114.9; const k = seg(t, tA, tA + .2); const sc = big ? (1 + .8 * (1 - E.out3(k))) * lerp(1.24, 1, pull) : 1; const base = big ? [(i - 1.5) * .22, (1.5 - i) * .13] : [q.gx, q.gy];
        const px = big ? lerp(base[0], q.gx * .4, pull) : q.gx, py = big ? lerp(base[1], q.gy * .3, pull) : q.gy;
        m.position.set(lerp(px, q.sx, lift), lerp(py, q.sy, lift), .05 + i * .004); const si = !big ? 1.0 + 3.4 * pull : 1.6 * pull + 1; m.rotation.z = lerp(big ? (i - 1.5) * .05 : 0, q.rot * .4, Math.max(lift, 0)); m.scale.setScalar(sc * si * lerp(1, .9, lift)); m.visible = t >= tA; m.material.opacity = clamp(k * 4); });
      bar.material.opacity = ss(118.2, 118.9, t); bar.scale.x = E.out3(seg(t, 118.2, 119.1));
      pp.bloom = .16 + .14 * lift; pp.threshold = .85; pp.vig = .5; pp.exposure = 1.05; pp.sat = 1.15; 
      return cam;
    },
  };
  return [s20];
}
