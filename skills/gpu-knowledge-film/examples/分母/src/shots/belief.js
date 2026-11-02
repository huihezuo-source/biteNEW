import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv } from '../phone.js';

// 贝叶斯：先验 1%，每中一次赔率翻倍
export const POST = (() => { const a = []; for (let k = 0; k <= 10; k++) { const o = (1 / 99) * 2 ** k; a.push(o / (1 + o)); } return a; })();
const T = k => 134.96 + (k - 1) * .5;   // 第 k 滴
export function beliefShots(ctx) {
  const { cam } = ctx;
  const env = makeEnv('studio');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const R = 1, HT = 10;
  // 液体
  const lu = { uL: { value: .01 }, uT: { value: 0 }, uWob: { value: 0 }, uHeat: { value: 1 } };
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R * .94, R * .94, HT, 96, 96, false), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: lu,
    vertexShader: /* glsl */`out vec3 vP; out vec3 vN; out vec3 vW; void main(){ vP=position; vN=normal; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vP,vN,vW; out vec4 O; uniform float uL,uT,uWob,uHeat; ${GLSL_NOISE}
    void main(){ float y=(vP.y+${(HT / 2).toFixed(1)})/${HT.toFixed(1)}; float a=atan(vP.z,vP.x); float wob=uWob*.02*sin(a*2.+uT*22.)+uWob*.012*sin(a*3.-uT*17.);
      float top=uL+wob+.0035*sin(a*5.+uT*3.); if(y>top) discard; vec3 V=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(normalize(vN),V)),2.2);
      float n=fbm3(vec3(vP.x*1.2,vP.y*.8-uT*.9,vP.z*1.2),4); vec3 c=mix(vec3(1.,.22,.02),vec3(1.,.46,.07),n)*(.42+1.05*n);
      c+=vec3(1.,.6,.25)*f*.8; float sur=smoothstep(top-.012,top,y); c+=vec3(1.,.8,.5)*sur*2.4; O=vec4(c*uHeat,1.); }` })); liquid.position.y = HT / 2; scene.add(liquid);
  // 玻璃：菲涅尔
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HT + .5, 96, 1, true), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uC: { value: 0 } },
    vertexShader: `out vec3 vN; out vec3 vW; void main(){ vN=mat3(modelMatrix)*normal; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vN,vW; out vec4 O; uniform float uC; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(normalize(vN),V)),3.); float st=smoothstep(.34,.36,abs(atan(vW.z,vW.x)-1.0))*0.; vec3 c=vec3(.55,.68,.85)*f*1.8; float s=exp(-pow((vW.x+.62)*7.,2.))*.5; c+=vec3(.9,.95,1.)*s; O=vec4(c,1.); }` })); gl.position.y = HT / 2 + .1; scene.add(gl);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(R, .05, 12, 96), new THREE.MeshStandardMaterial({ color: 0x8d9299, metalness: 1, roughness: .3, envMap: env })); cap.rotation.x = Math.PI / 2; cap.position.y = HT + .35; scene.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, .28, 96), new THREE.MeshStandardMaterial({ color: 0x25272b, metalness: .9, roughness: .3, envMap: env })); base.position.y = -.14; scene.add(base);
  // 地面反光
  const fl = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: lu, vertexShader: `out vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`, fragmentShader: `precision highp float; in vec3 vW; out vec4 O; uniform float uL,uHeat; void main(){ float d=length(vW.xz); vec3 c=vec3(1.,.42,.08)*exp(-d*.42)*(.12+1.7*uL)*uHeat; O=vec4(c,1.); }` })); fl.rotation.x = -Math.PI / 2; fl.position.y = -.28; scene.add(fl);
  // 刻度
  const tc = document.createElement('canvas'); tc.width = 256; tc.height = 2048; { const x = tc.getContext('2d'); x.strokeStyle = 'rgba(240,244,250,.92)'; x.fillStyle = 'rgba(240,244,250,.92)'; x.font = '700 60px JB'; for (let i = 0; i <= 100; i += 2) { const y = 2028 - (i / 100) * 2008; const big = i % 10 === 0; x.lineWidth = big ? 6 : 3; x.beginPath(); x.moveTo(0, y); x.lineTo(big ? 80 : 44, y); x.stroke(); if (big && i) x.fillText(String(i), 98, y + 20); } }
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8; const tick = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 10.05), new THREE.MeshBasicMaterial({ map: tt, transparent: true, toneMapped: false, depthWrite: false })); tick.position.set(1.72, 5.02, 0); scene.add(tick);
  // 水滴
  const dm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .6, .16).multiplyScalar(3.5), toneMapped: false }); const drop = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 24), dm); drop.scale.y = 1.5; scene.add(drop);
  const level = t => { let k = 0; let L = POST[0]; for (let i = 1; i <= 10; i++) { const a = T(i) + .28; const e = E.out3(seg(t, a, a + .22)); L = lerp(L, POST[i], e); } return L; };
  const look = new THREE.Vector3(); const DR = 141.46;
  const s22 = {
    a: 134.46, b: 142.46, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      lu.uT.value = t;
      let L = level(t); const dr = E.in2(seg(t, DR, DR + .62)); L = lerp(L, .01, dr); lu.uL.value = L;
      let wob = 0; for (let i = 1; i <= 10; i++) { const d = t - T(i) - .28; if (d > 0) wob += Math.exp(-d * 5) ; } if (t > DR) wob += 3 * Math.exp(-(t - DR) * 3); lu.uWob.value = wob;
      // 水滴
      let dv = false; for (let i = 1; i <= 10; i++) { const a = T(i); if (t >= a && t < a + .28) { const k = seg(t, a, a + .28); drop.position.set(0, lerp(HT + 1, L * HT, k * k), 0); dv = true; } } drop.visible = dv;
      const k = u / 8; cam.position.set(lerp(-3.4, -1.6, k), lerp(5.4, 6.4, k), lerp(18.5, 16.5, k)); look.set(-1.5, 5, 0); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 34; cam.near = .1; cam.far = 200; cam.updateProjectionMatrix();
      pp.bloom = .20; pp.threshold = 1.0; pp.vig = .55; pp.exposure = 1; pp.sat = 1.1;
      return cam;
    },
    hud(x, u, t, h) {
      let L = level(t); const dr = E.in2(seg(t, DR, DR + .62)); L = lerp(L, .01, dr);
      const s = dr > 0 ? 1 + .1 * Math.exp(-(t - DR) * 5) : 1; const c = dr > 0 ? '#FF6A55' : '#FFD27A';
      x.save(); x.translate(W * .30, 820 * UI); x.scale(s, s); x.textAlign = 'center'; x.font = `900 ${212 * UI}px NSerif`; x.fillStyle = c; x.shadowColor = 'rgba(255,170,70,.85)'; x.shadowBlur = 48 * UI; const v = L >= .1 ? Math.round(L * 100) + '%' : (Math.round(L * 1000) / 10).toString().replace(/\.0$/, '') + '%'; x.fillText(v, 0, 0); x.shadowBlur = 0; x.fillText(v, 0, 0); x.font = `700 ${62 * UI}px NSans`; x.fillStyle = '#F4EFE4'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 16 * UI; x.fillText('你对他的信任', 0, 104 * UI); x.restore(); h.gain = 2.1;
    },
  };
  return [s22];
}
