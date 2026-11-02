import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { counter } from './wall.js';

// 分数线之下：人海。2014–15：0.5% 与 85%
export function reversalShots(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const N = 1400000, r = rng(2015), S = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { S[i * 4] = r(); S[i * 4 + 1] = r(); S[i * 4 + 2] = r(); S[i * 4 + 3] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const u = { uT: { value: 0 }, uPx: { value: H }, uRev: { value: 0 }, uGreen: { value: 0 }, uIgn: { value: 0 } };
  const sea = new THREE.Points(g, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uPx,uRev,uGreen,uIgn; out vec3 vC;
    void main(){ float R=3200.*pow(aS.x,.7); float a=aS.y*6.28318; vec3 p=vec3(cos(a)*R,0.,sin(a)*R-900.);
      float sw=sin(p.x*.012+uT*.7+aS.z*.8)*sin(p.z*.009-uT*.5)*6.; p.y=sw+sin(uT*1.4+aS.w*30.)*.9;
      vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
      float d=-mv.z; gl_PointSize=max(1.5,(1.5+1.6*aS.z)*uPx/d*.9);
      vec3 warm=mix(vec3(1.,.55,.2),vec3(1.,.74,.4),aS.w); vec3 cool=vec3(.62,.8,1.); vec3 c=mix(warm,cool,step(.86,aS.z));
      float tw=.65+.35*sin(uT*2.+aS.w*50.);
      float isG=step(aS.w*.99+.005,.85); float gw=smoothstep(0.,.35,uGreen-length(p.xz-vec2(0.,-300.))*.00030-aS.z*.2)*isG;
      c=mix(c,vec3(.04,.9,.36)*.7,gw);
      float ig=smoothstep(0.,.3,uIgn-length(p.xz-vec2(0.,-200.))*.00018-aS.z*.14);
      vC=c*tw*(1.3+2.4*aS.z*aS.z)*ig*exp(-d*.00012); }`,
    fragmentShader: `precision highp float; in vec3 vC; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; float f=exp(-dot(d,d)*14.); O=vec4(vC*f,1.); }` })); sea.frustumCulled = false; scene.add(sea);
  // 人海的地辉
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u, vertexShader: `out vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; out vec4 O; uniform float uIgn,uGreen,uT; ${GLSL_NOISE} void main(){ float d=length(vW.xz-vec2(0.,-900.)); float n=fbm(vW.xz*.004+uT*.02,4); float ig=smoothstep(0.,.5,uIgn-length(vW.xz-vec2(0.,-200.))*.00018); vec3 c=mix(vec3(.5,.2,.05),vec3(.04,.5,.2),clamp(uGreen*.7,0.,.85))*.22*(.5+n)*exp(-d*.00045)*ig; O=vec4(c,1.); }` })); gl.rotation.x = -Math.PI / 2; gl.position.y = -2; gl.frustumCulled = false; scene.add(gl);
  // 分数线
  const barM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .84, .58).multiplyScalar(9), toneMapped: false });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(5200, 1.2, 1.2), barM); bar.position.set(0, 330, -300); scene.add(bar);
  // 线上：极少数的金点
  const tn = 3200, tp = new Float32Array(tn * 3), ts = new Float32Array(tn * 4), rr = rng(5); for (let i = 0; i < tn; i++) { const a = rr() * 6.28, R = 62 * Math.sqrt(rr()); tp[i * 3] = Math.cos(a) * R; tp[i * 3 + 1] = 344 + rr() * rr() * 90; tp[i * 3 + 2] = -300 + Math.sin(a) * R; }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); const top = new THREE.Points(tg, new THREE.PointsMaterial({ color: new THREE.Color(1, .75, .3).multiplyScalar(3.2), size: 2.4, sizeAttenuation: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); top.frustumCulled = false; scene.add(top);
  // 金流：从人海升上去，穿过线
  const fn = 90000, fS = new Float32Array(fn * 4), fp = new Float32Array(fn * 3), r3 = rng(9); for (let i = 0; i < fn; i++) { fS[i * 4] = r3(); fS[i * 4 + 1] = r3(); fS[i * 4 + 2] = r3(); fS[i * 4 + 3] = r3(); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('aS', new THREE.BufferAttribute(fS, 4)); fg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const fu = { uT: { value: 0 }, uPx: { value: H }, uA: { value: 0 } };
  const flow = new THREE.Points(fg, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: fu,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uPx,uA; out vec3 vC; void main(){ float l=fract(aS.x+uT*(.13+.1*aS.y)); float y=l*l*(3.-2.*l)*470.; float a=aS.z*6.283+l*18.+uT*1.6;
      float R=(9.+7.*y/330.)+1500.*exp(-y/20.)*sqrt(aS.w)+90.*exp(-y/70.)*aS.w; if(y>330.) R=10.+(y-330.)*.72*aS.w;
      vec3 p=vec3(cos(a)*R,y,sin(a)*R-300.); vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.2,1.5*uPx/(-mv.z)); vC=mix(vec3(1.,.42,.08),vec3(1.,.74,.32),aS.y)*(.5+1.1*l)*uA*smoothstep(0.,.08,l)*(1.-smoothstep(.93,1.,l)); }`,
    fragmentShader: `precision highp float; in vec3 vC; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; O=vec4(vC*exp(-dot(d,d)*12.),1.); }` })); flow.frustumCulled = false; scene.add(flow);
  const look = new THREE.Vector3(); const A = 120.46;
  const s21 = {
    a: A, b: 134.46, scene, samples: 8, samplesDraft: 3, subDark: .97,
    update(t, uu, pp) {
      u.uT.value = t; fu.uT.value = t;
      u.uIgn.value = seg(t, 120.7, 124.1) * 1.6; u.uGreen.value = seg(t, 131.96, 133.8) * 1.5;
      // 机位：贴着线 → 俯冲 → 平飞 → 抬头
      const dive = E.io3(seg(t, 120.5, 123.4)); const tilt = E.io3(seg(t, 127.6, 129.4));
      const fly = seg(t, 123.4, 127.8);
      const y = lerp(lerp(342, 80, dive), 165, tilt);
      const z = lerp(lerp(180, -60, dive) - fly * 560, 760 - 90 * seg(t, 128.9, 134.4), tilt);
      cam.position.set(Math.sin(fly * 2.4) * 60 * (1 - tilt), y, z);
      const lookY = lerp(lerp(332, -8, E.io2(seg(t, 120.8, 123.0))), 262, tilt);
      look.set(0, lookY, lerp(lerp(-300, -1400 - fly * 560, dive), -300, tilt));
      cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(lerp(42, 54, dive), 44, tilt); cam.near = 1; cam.far = 12000; cam.updateProjectionMatrix();
      fu.uA.value = ss(127.9, 129, t); top.visible = t > 127.5;
      barM.color.setRGB(1, .84, .58).multiplyScalar(9 * (1 + 2 * Math.exp(-Math.max(0, t - 120.46) * 4)));
      pp.bloom = .22; pp.threshold = .85; pp.vig = .5; pp.exposure = 1.05; pp.sat = 1.14; pp.radius = 1.0;
      return cam;
    },
    hud(x, uu, t, h) {
      const a = ss(128.96, 129.2, t) * (1 - ss(134.1, 134.4, t));
      if (a > 0) { const gr = x.createLinearGradient(0, 0, 0, 640 * UI); gr.addColorStop(0, `rgba(0,0,0,${.8 * a})`); gr.addColorStop(.7, `rgba(0,0,0,${.55 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 640 * UI); counter(x, '2,500 亿元', 250, { size: 160, a, color: '#FFD27A' }); }
      const a2 = ss(131.96, 132.2, t) * (1 - ss(134.1, 134.4, t));
      if (a2 > 0) { x.save(); x.globalAlpha = a2; x.textAlign = 'center'; const gr2 = x.createRadialGradient(W / 2, 590 * UI, 0, W / 2, 590 * UI, 520 * UI); gr2.addColorStop(0, 'rgba(0,0,0,.82)'); gr2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr2; x.fillRect(0, 0, W, 1200 * UI); x.font = `900 ${150 * UI}px NSerif`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(255,190,90,.9)'; x.shadowBlur = 30 * UI; x.fillText('0.5%', W * .5, 500 * UI); x.fillStyle = '#FFF4DF'; x.shadowBlur = 20 * UI; x.fillRect(W * .32, 548 * UI, W * .36, 9 * UI); x.fillStyle = '#43E38F'; x.shadowColor = 'rgba(40,230,130,.9)'; x.shadowBlur = 30 * UI; x.fillText('85%', W * .5, 712 * UI); x.restore(); }
      h.gain = 2.2;
    },
  };
  return [s21];
}
