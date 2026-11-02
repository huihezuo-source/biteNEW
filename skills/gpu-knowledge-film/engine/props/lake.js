import * as THREE from 'three';
import { W, H, renderer, GLSL_NOISE, rng, clamp } from './core.js';
import { sceneRT } from './post.js';

export const REFLECT_ONLY = 1;       // 只在倒影里出现的物体放这一层
export const MAIN_ONLY = 2;          // 只在水面上出现、没有倒影
export const toWater = o => { o.traverse(c => c.layers.set(REFLECT_ONLY)); return o; };
export const toAir = o => { o.traverse(c => c.layers.set(MAIN_ONLY)); return o; };

// —— 天空：月亮、星、薄云 ——
export function makeSky() {
  const u = { uT: { value: 0 }, uMoon: { value: new THREE.Vector3(.10, .235, -.965).normalize() }, uMoonK: { value: 1 }, uTop: { value: new THREE.Color(.0035, .0055, .012) }, uHor: { value: new THREE.Color(.020, .032, .055) }, uStar: { value: 1 }, uCloud: { value: 1 }, uSun: { value: new THREE.Vector3(-.2, .06, -.98).normalize() }, uSunK: { value: 0 } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, uniforms: u,
    vertexShader: `out vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vD; out vec4 O; uniform float uT,uMoonK,uStar,uCloud,uSunK; uniform vec3 uMoon,uTop,uHor,uSun; ${GLSL_NOISE}
    void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.);
      vec3 c=mix(uHor,uTop,pow(clamp(h*2.4,0.,1.),.55));
      float cs=dot(d,uMoon); float ang=acos(clamp(cs,-1.,1.));
      float R=.036; float disc=smoothstep(R,R-.0016,ang);
      vec2 mp=vec2(dot(d,normalize(cross(uMoon,vec3(0,1,0)))),dot(d,normalize(cross(cross(uMoon,vec3(0,1,0)),uMoon))))/R;
      float mare=fbm(mp*2.6+7.,5); float lit=.72+.5*smoothstep(.36,.62,mare);
      c=mix(c,vec3(1.,.97,.9)*2.7*lit,disc*uMoonK);
      c+=vec3(.62,.72,.95)*(.085*exp(-ang*9.)+.018*exp(-ang*2.6))*uMoonK;
      // 星
      vec2 st=d.xz/(h+.28)*210.; vec2 id=floor(st),f=fract(st)-.5; float hs=hash21(id); float tw=.72+.28*sin(uT*2.+hs*90.);
      c+=vec3(.86,.92,1.)*smoothstep(.13,.0,length(f+.3*(hash22(id)-.5)))*step(.967,hs)*(hs-.967)*30.*tw*smoothstep(.02,.22,h)*uStar*.55;
      // 云
      vec2 p=d.xz/(h+.16); float cl=fbm(p*1.15+vec2(uT*.006,uT*.002),6); cl=smoothstep(.46,.82,cl);
      c=mix(c,vec3(.012,.015,.022)+vec3(.13,.145,.19)*exp(-ang*3.2)*uMoonK,cl*.62*uCloud);
      if(uSunK>0.){ float sa=acos(clamp(dot(d,uSun),-1.,1.)); c+=vec3(1.,.56,.28)*exp(-sa*7.)*.8*uSunK+vec3(1.,.42,.22)*exp(-sa*2.)*.16*uSunK+vec3(1.,.72,.42)*smoothstep(.024,.021,sa)*9.*uSunK; c=mix(c,c+vec3(.42,.22,.18)*cl*exp(-sa*2.2),uSunK); }
      O=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, u };
}

const WATER_VERT = /* glsl */`out vec3 vW; out vec4 vP; uniform mat4 uMat; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vP=uMat*w; gl_Position=projectionMatrix*viewMatrix*w; }`;
const WATER_FRAG = /* glsl */`precision highp float; in vec3 vW; in vec4 vP; out vec4 O;
uniform sampler2D tRefl; uniform float uT,uChop,uDist,uMirror,uGlit,uBroad,uRain,uFogK; uniform vec3 uDeep,uHorC,uMoon; uniform vec4 uRip[12]; uniform float uRipK; ${GLSL_NOISE}
float rain(vec2 p){ vec2 q=p/9.; vec2 id=floor(q),f=q-id; float s=0.; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 c=id+g; vec2 o=hash22(c); float ph=hash21(c+3.7); float tau=fract(uT*.42+ph)*2.6; vec2 d=(f-g-o)*9.; float r=length(d); float xx=r-tau*3.4; s+=exp(-xx*xx*2.2)*exp(-tau*1.5)*sin(xx*6.); } return s; }
float H(vec2 p){ float t=uT; float h=0.;
  h+=.05*sin(dot(p,vec2(.21,.34))+t*.9)+.04*sin(dot(p,vec2(-.31,.27))+t*1.1)+.025*sin(dot(p,vec2(.62,-.44))+t*1.4);
  h+=(fbm(p*.32+vec2(t*.08,t*.05),4)-.5)*.34; h+=(fbm(p*1.25-vec2(t*.21,t*.12),3)-.5)*.09; h*=uChop; if(uRain>.001) h+=rain(p)*.16*uRain;
  for(int i=0;i<12;i++){ vec4 r=uRip[i]; if(r.w<=0.) continue; float tau=t-r.z; if(tau<0.) continue; float d=length(p-r.xy); float fr=tau*r.w*7.; float x=d-fr; float wid=1.6+.9*fr*.5;
    float e=exp(-x*x/(wid*wid))*exp(-tau*.55); h+=e*.42*r.w*sin(x*1.7)*(1.+6./(1.+d*.5))*uRipK; }
  return h; }
void main(){ vec3 Vd=cameraPosition-vW; float d=length(Vd); vec3 V=Vd/d; float e=max(.07,d*.0022);
  vec2 p=vW.xz; float h0=H(p); vec2 g=vec2(H(p+vec2(e,0))-h0,H(p+vec2(0,e))-h0)/e;
  float atten=1./(1.+d*.006); vec3 N=normalize(vec3(-g.x,1.,-g.y));
  float nv=max(dot(N,V),.001); float F=.02+.98*pow(1.-nv,5.);
  vec2 uv=vP.xy/vP.w+N.xz*uDist*(.35+.65*atten);
  uv=clamp(uv,vec2(.001),vec2(.999));
  vec3 R=texture(tRefl,uv).rgb;
  vec3 c=mix(uDeep,R,clamp(mix(F,1.,uMirror),0.,1.));
  // 月光碎银
  vec3 Rv=reflect(-V,N); float sp=pow(max(dot(Rv,uMoon),0.),900.); float sp2=pow(max(dot(Rv,uMoon),0.),90.);
  c+=vec3(.9,.95,1.)*(sp*14.+sp2*.10*uBroad)*uGlit;
  float fog=1.-exp(-d*.0011); c=mix(c,uHorC,fog*uFogK);
  O=vec4(c,1.); }`;

export function makeLake() {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, colorSpace: THREE.NoColorSpace, generateMipmaps: false });
  const u = { tRefl: { value: rt.texture }, uMat: { value: new THREE.Matrix4() }, uT: { value: 0 }, uChop: { value: 1 }, uDist: { value: .03 }, uMirror: { value: .72 }, uGlit: { value: 1 }, uBroad: { value: 1 }, uRain: { value: 0 }, uFogK: { value: 1 }, uDeep: { value: new THREE.Color(.0015, .0035, .007) }, uHorC: { value: new THREE.Color(.020, .032, .055) }, uMoon: { value: new THREE.Vector3(.10, .235, -.965).normalize() }, uRip: { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uRipK: { value: 1 } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, uniforms: u });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), m); mesh.rotation.x = -Math.PI / 2; mesh.frustumCulled = false;
  const v = new THREE.PerspectiveCamera(); v.layers.enable(REFLECT_ONLY); v.layers.enable(0);
  const pos = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(), tgt = new THREE.Vector3(), clip = new THREE.Vector4(), q = new THREE.Vector4(), pl = new THREE.Plane(), bias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
  function prepass(scene, cam) {
    cam.updateMatrixWorld(true); pos.setFromMatrixPosition(cam.matrixWorld); const e = cam.matrixWorld.elements; fwd.set(-e[8], -e[9], -e[10]); up.set(e[4], e[5], e[6]);
    pos.y *= -1; fwd.y *= -1; up.y *= -1;
    v.position.copy(pos); v.up.copy(up); tgt.copy(pos).add(fwd); v.lookAt(tgt); v.near = cam.near; v.far = cam.far; v.updateMatrixWorld(true);
    v.projectionMatrix.copy(cam.projectionMatrix); v.matrixWorldInverse.copy(v.matrixWorld).invert();
    u.uMat.value.copy(bias).multiply(v.projectionMatrix).multiply(v.matrixWorldInverse);
    // 斜近裁面：水下的部分不进倒影
    pl.set(new THREE.Vector3(0, 1, 0), .01).applyMatrix4(v.matrixWorldInverse); clip.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant);
    const P = v.projectionMatrix.elements; q.x = (Math.sign(clip.x) + P[8]) / P[0]; q.y = (Math.sign(clip.y) + P[9]) / P[5]; q.z = -1; q.w = (1 + P[10]) / P[14]; clip.multiplyScalar(2 / clip.dot(q)); P[2] = clip.x; P[6] = clip.y; P[10] = clip.z + 1 - .003; P[14] = clip.w;
    v.projectionMatrixInverse.copy(v.projectionMatrix).invert();
    mesh.visible = false; const prev = scene.background; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, v); mesh.visible = true;
  }
  return { mesh, u, prepass, draw(scene, cam) { prepass(scene, cam); renderer.setRenderTarget(sceneRT); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(scene, cam); },
    setRipples(list) { const a = u.uRip.value; for (let i = 0; i < 12; i++) { const r = list[i]; if (r) a[i].set(r[0], r[1], r[2], r[3]); else a[i].set(0, 0, 0, 0); } } };
}

// —— 粒子字：能蒸发 ——
const CL_VERT = /* glsl */`precision highp float;
uniform mat4 modelMatrix,viewMatrix,projectionMatrix; uniform vec3 cameraPosition;
in vec3 position; in vec4 aS; uniform float uT,uT0,uDur,uPx,uIn,uInDur,uBright,uRise,uSz; uniform vec3 uC; out vec3 vC; out float vA;
void main(){ vec3 p=position; float hy=aS.x; float start=uT0+uDur*(hy*.7+.3*aS.y); float e=max(0.,uT-start); float k=1.-exp(-e*.9);
  float inK=clamp((uT-uIn-aS.y*uInDur)/.5,0.,1.); inK=inK*inK*(3.-2.*inK);
  float s=aS.z*6.283; p.y+=k*uRise*(.5+2.6*aS.y*aS.y); p.x+=k*(aS.z-.5)*(26.+50.*aS.y)+k*sin(p.y*.09+uT*.7+s)*7.; p.z+=k*cos(p.y*.07+uT*.5+s)*14.;
  vec4 w=modelMatrix*vec4(p,1.); vec4 mv=viewMatrix*w; gl_Position=projectionMatrix*mv; float a=(1.-smoothstep(.18,.92,k))*inK;
  gl_PointSize=max(1.2,(.34+.9*aS.w*aS.w)*uSz*uPx/(-mv.z)*(1.-.62*k)); vC=uC*(1.+2.6*pow(aS.w,6.))*(1.+1.2*step(.0,e)*exp(-e*2.))*uBright; vA=a; }`;
const CL_FRAG = /* glsl */`precision highp float; in vec3 vC; in float vA; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; float f=exp(-dot(d,d)*13.); O=vec4(vC*f*vA,1.); }`;
export function textCloud(str, { size = 300, weight = 700, family = 'JB', step = 1, scale = .1, color = [1, .62, .2], rise = 60, seed = 3, align = 'center' } = {}) {
  const c = document.createElement('canvas'); const x = c.getContext('2d', { willReadFrequently: true }); x.font = `${weight} ${size}px ${family}`;
  const w = Math.ceil(x.measureText(str).width) + 40, h = Math.ceil(size * 1.3); c.width = w; c.height = h; x.font = `${weight} ${size}px ${family}`; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(str, 20, h / 2);
  const d = x.getImageData(0, 0, w, h).data, pts = []; const r = rng(seed);
  for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) { const a = d[(j * w + i) * 4 + 3]; if (a > 120) { pts.push(i + (r() - .5) * step, j + (r() - .5) * step); if (r() < .35) pts.push(i + (r() - .5) * step, j + (r() - .5) * step); } }
  const n = pts.length / 2, P = new Float32Array(n * 3), S = new Float32Array(n * 4);
  const ox = align === 'center' ? w / 2 : 0;
  for (let i = 0; i < n; i++) { P[i * 3] = (pts[i * 2] - ox) * scale; P[i * 3 + 1] = (h / 2 - pts[i * 2 + 1]) * scale; P[i * 3 + 2] = (r() - .5) * .3; S[i * 4] = 1 - pts[i * 2 + 1] / h; S[i * 4 + 1] = r(); S[i * 4 + 2] = r(); S[i * 4 + 3] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u = { uT: { value: 0 }, uT0: { value: 999 }, uDur: { value: 2 }, uPx: { value: H * 1.1 }, uIn: { value: -99 }, uInDur: { value: .4 }, uBright: { value: 1 }, uRise: { value: rise }, uSz: { value: 1 }, uC: { value: new THREE.Color(color[0], color[1], color[2]) } };
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: CL_VERT, fragmentShader: CL_FRAG, uniforms: u, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true });
  const pts3 = new THREE.Points(g, m); pts3.frustumCulled = false; pts3.userData.width = w * scale; pts3.userData.height = h * scale; pts3.userData.u = u; pts3.userData.n = n;
  return pts3;
}
