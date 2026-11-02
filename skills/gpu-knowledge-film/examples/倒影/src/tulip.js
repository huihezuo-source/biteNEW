import * as THREE from 'three';
import { GLSL_NOISE, rng } from './core.js';

// 破色郁金香：奶白底，红色火焰纹。花瓣形状和开合全在顶点着色器里
const SHAPE = /* glsl */`
uniform float uOpen,uT,uR,uHt;
in vec4 aP;   // x:角度 y:内外层 z:长度系数 w:种子
vec3 petal(vec2 st,float phi0,float layer,float len,float seed){
  float s=st.x,t=st.y; float H=uHt*len;
  float wT=pow(sin(3.14159*pow(t,.74)),.68)*(1.-.12*t);
  float w=(layer>.5?.92:1.06)*uR*wT;
  float cup=uR*(.34+.92*sin(3.14159*min(t*.88+.08,1.))*(1.-.26*t));
  float op=uOpen*(.36+.9*pow(t,1.4));
  float a=op*1.25;
  float yy=H*t*(1.-.2*s*s*pow(t,2.6)); float rr=cup;
  float r2=rr*cos(a)+yy*sin(a)*.72, y2=yy*cos(a*.72)-rr*sin(a)*.32;
  float phi=phi0+s*w/max(rr,.22)*.92;
  float ruff=.012*uR*sin(t*18.+seed*30.)*smoothstep(.45,1.,abs(s))+.05*uR*sin(s*3.1+seed*9.)*pow(t,3.);
  float curl=-(s*s)*.20*uR*(1.-t*.25);
  float R=r2+curl+ruff;
  return vec3(cos(phi)*R,y2+.03*uR*sin(uT*.8+seed*6.),sin(phi)*R);
}`;
export function makeTulip(opt = {}) {
  const seg = 54; const pos = [], idx = [];
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= 30; i++) pos.push(i / 15 - 1, j / seg, 0);
  for (let j = 0; j < seg; j++) for (let i = 0; i < 30; i++) { const a = j * 31 + i, b = a + 31; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.instanceCount = 6;
  const P = new Float32Array(24); const r = rng(1637);
  for (let i = 0; i < 6; i++) { const layer = i < 3 ? 0 : 1; P[i * 4] = i * Math.PI * 2 / 3 + (layer ? Math.PI / 3 : 0) + (r() - .5) * .1; P[i * 4 + 1] = layer; P[i * 4 + 2] = layer ? .94 : 1; P[i * 4 + 3] = r(); }
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4));
  const u = { uOpen: { value: .3 }, uT: { value: 0 }, uR: { value: 1 }, uHt: { value: 2.5 }, uL: { value: new THREE.Vector3(-3, 5, 6) }, uBack: { value: new THREE.Vector3(1, 3, -6) }, uK: { value: 1 }, uTint: { value: 0 } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms: u,
    vertexShader: /* glsl */`${SHAPE} out vec2 vS; out vec3 vW; out vec3 vN; out float vSeed; out float vLayer;
    void main(){ float e=.012; vec2 st=position.xy; vec3 p=petal(st,aP.x,aP.y,aP.z,aP.w); vec3 px=petal(st+vec2(e,0.),aP.x,aP.y,aP.z,aP.w); vec3 pt=petal(st+vec2(0.,e),aP.x,aP.y,aP.z,aP.w); vec3 n=normalize(cross(px-p,pt-p));
      vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=mat3(modelMatrix)*n; vS=st; vSeed=aP.w; vLayer=aP.y; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vS; in vec3 vW,vN; in float vSeed,vLayer; out vec4 O; uniform vec3 uL,uBack; uniform float uK; ${GLSL_NOISE}
    void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); bool front=gl_FrontFacing; if(!front) N=-N;
      float s=vS.x,t=vS.y,d=abs(s); vec2 q=vec2(s*7.+vSeed*40.,t*1.8);
      float f=fbm(q+vec2(0.,fbm(vec2(s*3.,t*5.)+vSeed,3)*1.4),5); float fine=fbm(vec2(s*42.+vSeed*9.,t*3.),4);
      float beam=smoothstep(.32,.0,d+.1*sin(t*9.+vSeed*20.))*(1.-t*.3);
      float edge=smoothstep(.48,1.,d+.18*sin(t*22.+vSeed*11.));
      float m=smoothstep(.40,.56,f*.92+.46*beam+.30*edge-.12+.14*fine);
      vec3 cream=mix(vec3(.92,.84,.70),vec3(.98,.94,.84),t); vec3 crim=mix(vec3(.42,.012,.03),vec3(.72,.03,.05),f);
      vec3 alb=mix(cream,crim,m); alb*=.9+.14*sin(s*70.+fine*7.); alb=mix(alb,vec3(.8,.72,.32),smoothstep(.2,.0,t)*.7);
      vec3 Ld=normalize(uL-vW); float nl=max(dot(N,Ld),0.); vec3 c=alb*(.05+1.1*nl);
      vec3 Lb=normalize(uBack-vW); float tr=pow(max(dot(-N,Lb),0.),1.)*.9; c+=alb*vec3(1.,.7,.55)*tr*.9;
      float rim=pow(1.-max(dot(N,V),0.),3.); c+=vec3(1.,.82,.66)*rim*.22*max(dot(N,Lb)*.5+.5,0.);
      vec3 Hh=normalize(Ld+V); c+=vec3(1.)*pow(max(dot(N,Hh),0.),40.)*.14; c*=mix(.42,1.,smoothstep(0.,.3,t));
      O=vec4(c*uK,1.); }` });
  const flower = new THREE.Mesh(g, m); flower.frustumCulled = false;
  const G = new THREE.Group(); G.add(flower);
  const stemC = new THREE.CatmullRomCurve3([new THREE.Vector3(.0, -8, .1), new THREE.Vector3(.14, -5, -.12), new THREE.Vector3(.05, -2, .06), new THREE.Vector3(0, .08, 0)]);
  const sm = new THREE.MeshStandardMaterial({ color: 0x3f6b36, roughness: .55, metalness: 0, emissive: 0x081a06, emissiveIntensity: .5 });
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemC, 60, .1, 16), sm); G.add(stem);
  const leaf = (rot, h, w) => { const seg = 40, p = [], id = []; for (let j = 0; j <= seg; j++) { const t = j / seg; const ww = w * Math.sin(Math.PI * Math.pow(t, .7)); for (let i = 0; i <= 8; i++) { const s = i / 4 - 1; p.push(s * ww + Math.sin(t * 3) * .2, -8 + t * h * (1 - .2 * t * t), .6 * t * t * h * .32 + Math.abs(s) * ww * .4 - t * t * t * h * .3); } } for (let j = 0; j < seg; j++) for (let i = 0; i < 8; i++) { const a = j * 9 + i, b = a + 9; id.push(a, b, a + 1, a + 1, b, b + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(id); g.computeVertexNormals(); const m2 = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x2f5a30, roughness: .5, side: THREE.DoubleSide, emissive: 0x081a06, emissiveIntensity: .4 })); m2.rotation.y = rot; G.add(m2); };
  leaf(.4, 7.4, .46); leaf(2.8, 6.2, .42); leaf(-1.8, 5.4, .36);
  const a = new THREE.PointLight(0xffe2c0, 30, 18, 2); a.position.set(-3, 5, 6); G.add(a);
  const b = new THREE.PointLight(0xbcd4ff, 18, 16, 2); b.position.set(2, 2, -5); G.add(b);
  return { group: G, u, flower };
}
