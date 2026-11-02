import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv, bake } from '../phone.js';
import { RT } from '../script.js';
import { counter, remainAt } from './wall.js';

// 十层金筛：每层把一半金沙甩出去，另一半从中间漏到下一层
const TIERS = 10, GAP = 74;
const tierY = k => -(k - 1) * GAP;           // 第 k 层高度（k=1..10）
const tierR = k => 66 - (k - 1) * 3.2;
const VERT = /* glsl */`
precision highp float;
in vec4 aS;        // x:种子相位 y:角度 z:半径系数 w:亮度种子
in float aK;       // 这粒沙在第几层被甩出（11 = 走到底）
uniform float uT,uPx,uRate,uGain; out vec3 vC; out float vA;
const float GAP=${GAP}.,G=1.0;
float R(float k){return 66.-(k-1.)*3.2;}
float Y(float k){return -(k-1.)*GAP;}
void main(){
  float life=fract(aS.x+uT*uRate);        // 稳态流：每粒沙按相位循环
  float vf=120.;                          // 下落速度
  float top=70.; float yEnd=Y(aK);        // 落到被甩出的那层
  float T1=(top-yEnd)/vf;                 // 中柱下落时长
  float T2=1.15;                           // 盘面外流
  float T3=2.6;                           // 飞出后下坠
  float tt=life*(T1+T2+T3);
  vec3 p; float a=1.;
  float ang=aS.y; vec2 dir=vec2(cos(ang),sin(ang));
  float rc=1.2+2.6*aS.z*aS.z;             // 中柱半径
  if(aK>10.5){ // 走到底
    float y=top-vf*life*(T1+T2+T3)*1.0; p=vec3(dir.x*rc*.5,y,dir.y*rc*.5); a=smoothstep(-640.,-560.,y);
  } else if(tt<T1){ float y=top-vf*tt; p=vec3(dir.x*rc,y,dir.y*rc); }
  else if(tt<T1+T2){ float k=(tt-T1)/T2; float R0=R(aK)*(.97+.03*aS.z); float r=mix(rc,R0,k*k*(3.-2.*k)*.35+.65*k); p=vec3(dir.x*r,yEnd+.5+1.2*aS.w*(1.-k),dir.y*r); }
  else { float tau=tt-T1-T2; float R0=R(aK)*(.97+.03*aS.z); float vr=10.+13.*aS.w; float r=R0+vr*tau; float y=yEnd-.5*96.*tau*tau-6.*tau; p=vec3(dir.x*r,y,dir.y*r); a=1.-smoothstep(.7,1.,tau/T3); }
  vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  float s=(.26+.55*pow(aS.w,6.))*uPx/(-mv.z);
  gl_PointSize=max(1.2,s);
  float tw=.65+.35*sin(uT*14.+aS.w*80.);
  vC=mix(vec3(1.,.42,.08),vec3(1.,.82,.42),aS.w*aS.w)*(1.2+2.8*pow(aS.w,9.))*tw*uGain; vA=a;
}`;
const FRAG = /* glsl */`precision highp float; in vec3 vC; in float vA; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; float r=dot(d,d)*4.; float f=exp(-r*3.2); O=vec4(vC*f*vA,1.); }`;

export function sieveShot(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const env = makeEnv('gold');
  const N = 420000, r = rng(777);
  const S = new Float32Array(N * 4), K = new Float32Array(N), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    S[i * 4] = r(); S[i * 4 + 1] = r() * Math.PI * 2; S[i * 4 + 2] = r(); S[i * 4 + 3] = r();
    const u = r(); let k = 1; let p = .5; while (k < 11 && u > 1 - p * 1) { k++; p *= .5; if (k === 11) break; }   // 每层淘汰一半
    K[i] = u < .5 ? 1 : u < .75 ? 2 : u < .875 ? 3 : u < .9375 ? 4 : u < .96875 ? 5 : u < .984375 ? 6 : u < .9921875 ? 7 : u < .99609375 ? 8 : u < .998046875 ? 9 : u < .9990234375 ? 10 : 11;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4)); g.setAttribute('aK', new THREE.BufferAttribute(K, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u = { uT: { value: 0 }, uPx: { value: H * 1.1 }, uRate: { value: .22 }, uGain: { value: 1 } };
  const pts = new THREE.Points(g, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: `uniform mat4 viewMatrix,projectionMatrix;\n${VERT}`, fragmentShader: FRAG, uniforms: u, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
  pts.frustumCulled = false; scene.add(pts);
  // 十层盘：黄铜，外沿一圈光
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc08a3a, metalness: 1, roughness: .32, envMap: env, envMapIntensity: 1.5, clearcoat: .4, clearcoatRoughness: .3 });
  const rim = []; 
  for (let k = 1; k <= TIERS; k++) {
    const R = tierR(k), prof = [[3.4, .4], [4.6, 0], [R - 2, 0], [R, 1.0], [R + .6, 1.0], [R + .9, -.3], [R - 1.4, -2.2], [R * .55, -2.8], [8, -5], [3.4, -1.6], [3.4, .4]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), brass); m.position.y = tierY(k); scene.add(m);
    const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .55, .16).multiplyScalar(.5), toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + .2, .34, 10, 160), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = tierY(k) + 1.0; scene.add(ring); rim.push(ringM);
  }
  // 底部的黑
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 16), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, vertexShader: `out vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); }`, fragmentShader: `precision highp float; in vec3 vD; out vec4 O; void main(){ vec3 d=normalize(vD); vec3 c=vec3(.020,.012,.006)*exp(-abs(d.y)*2.5); O=vec4(c,1.); }` })); sky.frustumCulled = false; scene.add(sky);
  const look = new THREE.Vector3();
  const stepY = t => { // 脉冲式下降：每两拍一层，0.75 秒落下，其余时间慢飘
    let y = tierY(1) + 12; for (let k = 2; k <= 6; k++) { const e = E.io3(seg(t, RT[k] - .36, RT[k] + .42)); y = lerp(y, tierY(k) + 12, e); } return y;
  };
  // 片尾：老师的头像落到筛盘上，滚出去，掉下去
  const tc = document.createElement('canvas'); tc.width = tc.height = 512; { const x = tc.getContext('2d'); x.fillStyle = '#F4F1EA'; x.beginPath(); x.arc(256, 256, 254, 0, 6.3); x.fill(); x.strokeStyle = '#C89A3C'; x.lineWidth = 16; x.beginPath(); x.arc(256, 256, 238, 0, 6.3); x.stroke(); x.fillStyle = '#17181B'; x.font = '900 260px NSans'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('李', 256, 210); x.font = '800 96px NSans'; x.fillText('老师', 256, 392); }
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8;
  const faceM = new THREE.MeshBasicMaterial({ map: tt, toneMapped: false }); faceM.color.setScalar(1.25);
  const token = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 2.4, 64), [brass, faceM, faceM]); token.visible = false; scene.add(token);
  const main = {
    subDark: .9,
    a: 47.96, b: 55.96, scene, samples: 8, samplesDraft: 3,
    update(t, uu, pp) {
      u.uT.value = t;
      const seg_ = t < RT[3] ? 0 : t < RT[4] ? 1 : t < RT[5] ? 2 : 3; const tierK = seg_ + 2; const yt = tierY(tierK); const v = (t - [RT[2], RT[3], RT[4], RT[5]][seg_]) / 2;
      if (seg_ === 0) { const orb = -.5 + v * .22; const d = 318 - 16 * v; cam.position.set(Math.sin(orb) * d, yt + 38, Math.cos(orb) * d); look.set(0, yt - 34, 0); cam.up.set(0, 1, 0); cam.fov = 36; }
      else if (seg_ === 1) { const a = 1.0 + v * .3; const R = tierR(tierK) + 42; cam.position.set(Math.cos(a) * R, yt + 8 - 14 * v, Math.sin(a) * R); look.set(Math.cos(a - .9) * 40, yt - 22, Math.sin(a - .9) * 40); cam.up.set(0, 1, 0); cam.fov = 46; }
      else if (seg_ === 2) { const a = .9 + v * .22; cam.position.set(Math.sin(a) * 214, yt + 196 - 30 * v, Math.cos(a) * 214); look.set(0, yt - 96, 0); cam.up.set(0, 1, 0); cam.fov = 44; }
      else { const a = -.8 + v * .3; cam.position.set(Math.sin(a) * 92, yt - 104 + 16 * v, Math.cos(a) * 92); look.set(0, yt + 36, 0); cam.up.set(0, 1, 0); cam.fov = 58; }
      cam.lookAt(look); cam.near = 2; cam.far = 8000; cam.updateProjectionMatrix(); u.uGain.value = seg_ === 2 ? .42 : 1;
      rim.forEach((m, i) => { const k = i + 1; const hit = t >= RT[k] - .1 ? Math.exp(-(t - (RT[k] - .1)) * 2.6) : 0; m.color.setRGB(1, .55, .16).multiplyScalar(.5 + 6 * hit); });
      pp.bloom = .22; pp.threshold = .85; pp.radius = 1.0; pp.vig = .55; pp.exposure = 1.0; pp.sat = 1.15; pp.ca = .002;
      return cam;
    },
    hud(x, uu, t, h) {
      const n = remainAt(t); let k = 1; for (let i = 2; i <= 5; i++) if (t >= RT[i]) k = i;
      const p = 1 + .16 * Math.exp(-(t - RT[k]) * 7);
      const gr = x.createLinearGradient(0, 0, 0, 700 * UI); gr.addColorStop(0, 'rgba(0,0,0,.97)'); gr.addColorStop(.7, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 700 * UI);
      x.save(); x.translate(W / 2, 300 * UI); x.scale(p, p); x.translate(-W / 2, -300 * UI); counter(x, n.toLocaleString('en-US'), 300, { size: 170, color: '#FFD27A', label: `第 ${k} 个交易日，还剩` }); x.restore(); h.gain = 2.1;
    },
  };
  const P = new THREE.Vector3();
  const tokenShot = {
    a: 151.96, b: 153.96, scene, samples: 10, samplesDraft: 3, subDark: .8,
    update(t, uu, pp) {
      u.uT.value = t; token.visible = true; rim.forEach(m => m.color.setRGB(1, .55, .16).multiplyScalar(.7));
      u.uGain.value = .8;
      const yP = tierY(3), R = tierR(3), r0 = 25, bot = 2.1;
      const k1 = clamp(uu / .36), k2 = seg(uu, .36, 1.62), k3 = seg(uu, 1.62, 2.0);
      let x_ = -30, y_ = yP + bot + r0 + 90 * (1 - k1 * k1), tilt = 0;
      if (uu >= .36) { const sl = E.in2(k2); x_ = lerp(-30, R + 8, sl); y_ = yP + bot + r0 + 7 * Math.exp(-(uu - .36) * 6) * Math.abs(Math.sin((uu - .36) * 11)); }
      if (uu >= 1.62) { x_ = R + 8 + 14 * k3; y_ = yP + bot + r0 - 150 * k3 * k3; tilt = k3 * 1.7; }
      token.position.set(x_, y_, 6); token.rotation.set(Math.PI / 2, Math.PI / 2, 0); token.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -tilt);
      const orb = .08 + uu * .03; cam.position.set(Math.sin(orb) * 230 + 8, yP + 36, Math.cos(orb) * 230); look.set(8, yP + 6, 0); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 34; cam.near = 2; cam.far = 8000; cam.updateProjectionMatrix();
      pp.bloom = .2; pp.threshold = .85; pp.vig = .55; pp.exposure = .9; pp.sat = 1.1;
      return cam;
    },
    hud(x, uu, t, h) { h.gain = 1; },
  };
  const _mu = main.update; main.update = function (t, uu, pp) { token.visible = false; return _mu.call(this, t, uu, pp); };
  return [main, tokenShot];
}
