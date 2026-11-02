import * as THREE from 'three';
import { W, H, QUALITY, renderer, GLSL_NOISE, clamp, lerp, ss, rng, fsMat } from './core.js';
import { N, R, START, lnU, lnD, kAt, HERO } from './sim.js';

// —— 板子的尺度 ——
export const R0 = .125;                   // 一万块的钢珠半径
export const DY = .40;                    // 一局的行距
export const Y0 = 20;                     // 第 0 排钉子的高度
export const FLOOR_Y = Y0 - R * DY - .3;  // 第 100 局落到的地面
export const GAP = lnU(1) - lnD(1);       // 左右两步加起来的长度
export const PEG_R = .055;
const safeF = f => Math.max(.002, f);
export const scaleOf = f => { const g = safeF(f); return GAP / (lnU(g) - lnD(g)); };
export const xAt = (n, k, f = 1) => { const g = safeF(f); return scaleOf(g) * (k * lnU(g) + (n - k) * lnD(g)); };
export const tilt = { v: 0 };
export const leanOf = f => { const g = safeF(f), c = scaleOf(g) * (lnU(g) + lnD(g)) / 2; return c / Math.hypot(c, DY); };
export const radiusOf = lnW => R0 * Math.exp(lnW / 3);   // 体积 = 钱
export const moneyFmt = v => '¥' + Math.round(v).toLocaleString('en-US');

// —— 共用灯光 ——
export const U = {
  uKey: { value: 1 }, uRoom: { value: 1 }, uStrip: { value: .3 }, uHaze: { value: 0 },
  uFloorMirror: { value: 0 }, uCold: { value: 0 }, uFill: { value: 0 },
};

export const STUDIO = /* glsl */`
uniform float uKey,uRoom,uStrip,uCold;
vec3 studio(vec3 r){
  r=normalize(r);
  float up=r.y;
  vec3 wallC=mix(vec3(.97,.985,1.),vec3(.8,.9,1.),uCold);
  float wall=mix(.42,1.,smoothstep(-.05,.75,up));
  float flr=mix(.10,.42,smoothstep(-1.,-.08,up));
  vec3 c=wallC*mix(flr,wall,smoothstep(-.05,.03,up))*uRoom*1.7;
  c*=1.-.42*exp(-pow((up+.02)/.07,2.));                       // 地平线柔暗带，给金属定形
  float t=1./max(up,.03);
  vec2 q=r.xz*t;
  float box=smoothstep(1.7,.95,abs(q.x))*smoothstep(1.25,.55,abs(q.y+.15))*step(0.,up);
  float slat=.82+.18*smoothstep(.02,.05,abs(fract(q.x*1.6)-.5));
  c+=vec3(1.,.985,.96)*box*slat*uKey*11.;
  float az=atan(r.x,r.z);
  float sl=exp(-pow((az-1.2)/.045,2.))+exp(-pow((az+1.42)/.03,2.))*.55;
  c+=vec3(.84,.92,1.)*sl*uStrip*smoothstep(-.55,.05,up)*smoothstep(1.,.35,up)*7.;
  return c;
}
`;

// —— 钢珠：实例化的球面替身，任意放大都是真球 ——
const BALL_V = /* glsl */`
precision highp float;
in vec3 position; in vec4 iPos; in vec4 iTint;
uniform mat4 viewMatrix,projectionMatrix; uniform float uH,uMirrorY,uMinPx;
out vec3 vV,vC; out float vR,vFade; out vec4 vTint;
void main(){
  vec3 wp=iPos.xyz; if(uMirrorY>-9000.) wp.y=2.*uMirrorY-wp.y;
  vec4 c=viewMatrix*vec4(wp,1.);
  float r=iPos.w, d=max(-c.z,1e-3);
  float px=r*projectionMatrix[1][1]*.5*uH/d;
  float rr=r; vFade=1.;
  if(px<uMinPx){ rr=r*uMinPx/max(px,1e-4); vFade=clamp(px/uMinPx,0.,1.); vFade*=vFade; }
  float dd=length(c.xyz);
  float k=dd>rr*1.02?dd/sqrt(dd*dd-rr*rr)*1.04:6.;
  vec3 v=c.xyz+vec3(position.xy*rr*k,0.);
  if(dd<=rr*1.02){ gl_Position=vec4(0.,0.,-2.,1.); }
  else gl_Position=projectionMatrix*vec4(v,1.);
  vV=v; vC=c.xyz; vR=rr; vTint=iTint;
}`;
const BALL_F = /* glsl */`
precision highp float; precision highp int;
in vec3 vV,vC; in float vR,vFade; in vec4 vTint;
uniform mat4 projectionMatrix; uniform mat3 uViewI; uniform float uDim,uFloorY,uMirrorY,uFill,uFloorMirror; uniform vec3 uCamW;
out vec4 O;
${STUDIO}
void main(){
  vec3 rd=normalize(vV);
  float b=dot(rd,vC), c=dot(vC,vC)-vR*vR, h=b*b-c;
  if(h<0.) discard;
  float t=b-sqrt(h); vec3 p=rd*t; vec3 n=(p-vC)/vR;
  vec4 cp=projectionMatrix*vec4(p,1.);
  gl_FragDepth=clamp(cp.z/cp.w*.5+.5,0.,1.);
  vec3 N_=uViewI*n, V_=uViewI*(-rd);
  vec3 r=reflect(-V_,N_);
  vec3 env=studio(r);
  if(uFloorMirror>.5&&r.y<-.02&&vR>.5){ // 大球映出地上的灰
    vec3 hit=uCamW+uViewI*p; float tt=(uFloorY-hit.y)/r.y; vec3 P=hit+r*tt; vec2 g=P.xz*4.5, id=floor(g), f2=fract(g)-.5;
    float h1=fract(sin(dot(id,vec2(127.1,311.7)))*43758.5453); float st=step(.9,h1)*smoothstep(.26,.05,length(f2));
    env+=vec3(.25,1.,.6)*st*exp(-tt*.03)*(h1-.9)*22.;
  }
  float F=pow(1.-max(dot(N_,V_),0.),5.);
  vec3 base=mix(vec3(.93,.94,.96),vTint.rgb*vec3(1.02),vTint.a);
  vec3 col=env*mix(base,vec3(1.),F*.8);
  // 贴着板子一侧的接触暗部
  float back=1.-smoothstep(-.9,.35,N_.z);
  col*=1.-.55*back*uRoomOcc();
  col+=base*uFill*clamp(.07/vR,0.,1.)*(.35+.65*max(N_.y,0.));
  O=vec4(col*uDim*vFade,1.);
  if(vFade<.999&&fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)>vFade+.25) discard;
}`.replace('uRoomOcc()', '1.');

export class Balls {
  constructor(cap) {
    this.cap = cap; this.count = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new Float32Array(cap * 4); this.tint = new Float32Array(cap * 4);
    this.aPos = new THREE.InstancedBufferAttribute(this.pos, 4); this.aPos.setUsage(THREE.DynamicDrawUsage);
    this.aTint = new THREE.InstancedBufferAttribute(this.tint, 4); this.aTint.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iTint', this.aTint);
    g.instanceCount = 0; this.g = g;
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: BALL_V, fragmentShader: BALL_F,
      uniforms: { ...U, uFill: U.uFill, uFloorMirror: U.uFloorMirror, uH: { value: H }, uMinPx: { value: .9 }, uViewI: { value: new THREE.Matrix3() }, uDim: { value: 1 }, uFloorY: { value: FLOOR_Y }, uMirrorY: { value: -9999 }, uCamW: { value: new THREE.Vector3() } },
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.mesh.onBeforeRender = (r, s, cam) => { this.mat.uniforms.uViewI.value.setFromMatrix4(cam.matrixWorld); this.mat.uniforms.uCamW.value.setFromMatrixPosition(cam.matrixWorld); };
    // 镜像（抛光地面里的倒影）
    this.mirrorMat = this.mat.clone(); this.mirrorMat.uniforms = { ...U, uFill: U.uFill, uH: this.mat.uniforms.uH, uMinPx: this.mat.uniforms.uMinPx, uViewI: { value: new THREE.Matrix3() }, uDim: { value: .32 }, uFloorY: this.mat.uniforms.uFloorY, uMirrorY: { value: FLOOR_Y }, uCamW: this.mat.uniforms.uCamW };
    this.mirror = new THREE.Mesh(g, this.mirrorMat); this.mirror.frustumCulled = false; this.mirror.visible = false; this.mirror.renderOrder = 2;
    this.mirror.onBeforeRender = (r, s, cam) => { this.mirrorMat.uniforms.uViewI.value.setFromMatrix4(cam.matrixWorld); };
    // 落在板上的柔影
    this.shadowMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: /* glsl */`precision highp float; in vec3 position; in vec4 iPos; uniform mat4 viewMatrix,projectionMatrix; uniform float uDrop,uAxis,uEvery; out vec2 vQ;
        void main(){ vQ=position.xy; float r=iPos.w; vec3 c=iPos.xyz; vec3 p; if(mod(float(gl_InstanceID),uEvery)>.5&&r<.35){ gl_Position=vec4(0.,0.,-2.,1.); return; }
          if(uAxis<.5){ c.y-=r*.75+uDrop; p=vec3(c.x+position.x*r*1.9,c.y+position.y*r*2.5,.003); }
          else { p=vec3(c.x+position.x*r*1.9,uDrop,c.z+position.y*r*1.9); }
          gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: /* glsl */`precision highp float; in vec2 vQ; uniform float uK; out vec4 O; void main(){ float d=dot(vQ,vQ); float a=exp(-d*3.2)*uK; O=vec4(vec3(1.-a),1.); }`,
      uniforms: { uDrop: { value: .02 }, uK: { value: .2 }, uAxis: { value: 0 }, uEvery: { value: 12 } },
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    this.shadow = new THREE.Mesh(g, this.shadowMat); this.shadow.frustumCulled = false; this.shadow.renderOrder = 1;
  }
  set(i, x, y, z, r, tr = 1, tg = 1, tb = 1, ta = 0) { const p = this.pos, q = this.tint, a = i * 4; p[a] = x; p[a + 1] = y; p[a + 2] = z; p[a + 3] = r; q[a] = tr; q[a + 1] = tg; q[a + 2] = tb; q[a + 3] = ta; }
  commit(n) { this.count = n; this.g.instanceCount = n; this.aPos.needsUpdate = true; this.aTint.needsUpdate = true; this.aPos.addUpdateRange?.(0, n * 4); this.aTint.addUpdateRange?.(0, n * 4); }
}

// 盈亏着色：赚钱红，亏钱绿，离本金越远越深
export const RED = [1., .10, .07], GREEN = [.05, .92, .40];
export function tintOf(lnW) { const a = Math.abs(lnW); const s = Math.pow(1 - Math.exp(-a * 1.5), .7); return lnW >= 0 ? [RED[0], RED[1], RED[2], s] : [GREEN[0], GREEN[1], GREEN[2], s]; }

// —— 钉阵 ——
export function makePegs(rows = R, segs = 12) {
  const pts = [[0, 0], [.072, 0], [.072, .012], [.055, .03], [.05, .22], [.062, .245], [.062, .275], [.05, .29], [0, .296]].map(p => new THREE.Vector2(p[0], p[1]));
  const lathe = new THREE.LatheGeometry(pts, segs); lathe.rotateX(Math.PI / 2);
  const g = new THREE.InstancedBufferGeometry(); g.index = lathe.index; g.setAttribute('position', lathe.attributes.position); g.setAttribute('normal', lathe.attributes.normal);
  const cnt = (rows + 1) * (rows + 2) / 2, nk = new Float32Array(cnt * 2); let c = 0;
  for (let n = 0; n <= rows; n++) for (let k = 0; k <= n; k++) { nk[c * 2] = n; nk[c * 2 + 1] = k; c++; }
  g.setAttribute('iNK', new THREE.InstancedBufferAttribute(nk, 2)); g.instanceCount = cnt;
  const lat = { uLU: { value: lnU(1) }, uLD: { value: lnD(1) }, uS: { value: 1 }, uDY: { value: DY }, uY0: { value: Y0 }, uTY: { value: 0 } };
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`precision highp float; in vec3 position,normal; in vec2 iNK; uniform mat4 viewMatrix,projectionMatrix; uniform float uLU,uLD,uS,uDY,uY0,uTY; out vec3 vW,vN;
      void main(){ float n=iNK.x,k=iNK.y; vec3 c=vec3(uS*(k*uLU+(n-k)*uLD),uY0-n*uDY+(k-n*.5)*${GAP.toFixed(6)}*uTY,0.); vW=position+c; vN=normal; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW,vN; uniform vec3 cameraPosition; out vec4 O; ${STUDIO}
      void main(){ vec3 n=normalize(vN),v=normalize(cameraPosition-vW); vec3 r=reflect(-v,n); float F=pow(1.-max(dot(n,v),0.),5.);
        vec3 c=studio(r)*mix(vec3(.17,.18,.20),vec3(.9),F); float ao=smoothstep(.0,.16,vW.z); c*=mix(.4,1.,ao); O=vec4(c,1.); }`,
    uniforms: { ...U, ...lat },
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 3;
  // 钉影
  const sg = new THREE.InstancedBufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); sg.setIndex([0, 1, 2, 0, 2, 3]);
  sg.setAttribute('iNK', g.attributes.iNK); sg.instanceCount = cnt;
  const sm = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`precision highp float; in vec3 position; in vec2 iNK; uniform mat4 viewMatrix,projectionMatrix; uniform float uLU,uLD,uS,uDY,uY0,uTY; out vec2 vQ;
      void main(){ vQ=position.xy; float n=iNK.x,k=iNK.y; vec3 c=vec3(uS*(k*uLU+(n-k)*uLD),uY0-n*uDY-.13+(k-n*.5)*${GAP.toFixed(6)}*uTY,.002); gl_Position=projectionMatrix*viewMatrix*vec4(c+vec3(position.x*.12,position.y*.26,0.),1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vQ; out vec4 O; void main(){ float a=exp(-dot(vQ,vQ)*3.)*.6; O=vec4(vec3(1.-a),1.); }`,
    uniforms: { ...lat }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const shadow = new THREE.Mesh(sg, sm); shadow.frustumCulled = false; shadow.renderOrder = 1;
  const setF = f => { const g2 = safeF(f); lat.uLU.value = lnU(g2); lat.uLD.value = lnD(g2); lat.uS.value = scaleOf(g2); lat.uTY.value = leanOf(g2) * tilt.v; };
  return { mesh, shadow, setF };
}

// —— 背板：拉丝钢，亮场近白，灯灭后只剩灯条的一抹反光 ——
export function makePlate() {
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`precision highp float; in vec3 position; uniform mat4 viewMatrix,projectionMatrix,modelMatrix; out vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; uniform vec3 cameraPosition; uniform float uKey,uRoom,uStrip,uPlumb,uLine,uSpot,uSpotX; out vec4 O; ${GLSL_NOISE}
      void main(){
        vec2 p=vW.xy;
        float brush=fbm(p*vec2(.9,34.),3)-.5, grain=vnoise(p*vec2(90.,3.))-.5;
        vec3 alb=vec3(.90,.915,.93)*(1.+brush*.05+grain*.03);
        float pool=mix(.84,1.,smoothstep(-40.,26.,p.y));
        vec3 c=alb*(uRoom*1.42+uKey*.28)*pool;
        if(uSpot>0.){ vec2 q=(p-vec2(uSpotX,23.))/vec2(15.,20.); c+=alb*vec3(1.,.985,.96)*uSpot*exp(-dot(q,q)); }
        // 暗场：灯条在拉丝钢上的长条反光
        vec3 v=normalize(cameraPosition-vW);
        float sh=exp(-pow((p.x+v.x*2.-12.)/7.,2.))*.05+exp(-pow((p.x+v.x*2.+17.)/5.,2.))*.035;
        c+=vec3(.75,.85,1.)*sh*uStrip*(1.+brush*2.);
        // 本金线：铅垂线
        float l=smoothstep(.12,.07,abs(p.x-uPlumb))*uLine*step(p.y,20.5);
        c=mix(c,uRoom>.3?vec3(.03,.034,.04):vec3(1.5,1.55,1.6),l*.92);
        O=vec4(c,1.);
      }`,
    uniforms: { ...U, uPlumb: { value: 0 }, uLine: { value: 0 }, uSpot: { value: 0 }, uSpotX: { value: 0 } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat); mesh.position.set(0, -20, 0); mesh.renderOrder = 0;
  return mesh;
}

// —— 一万颗球的时序 ——
const rj = rng(77);
export const zj = Float32Array.from({ length: N }, () => rj());
export const jx = Float32Array.from({ length: N }, () => rj() - .5), jy = Float32Array.from({ length: N }, () => rj() - .5);
// Hook 用的单颗球路径之外，一万颗球共用 row→状态
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export function ballAt(i, row, f, o, jit = 0) {
  const r = clamp(row, 0, R - 1e-4), n = Math.floor(r), s = r - n;
  const b = (R + 1) * i, k0 = kAt[b + n], k1 = kAt[b + n + 1];
  const u = lnU(safeF(f)), d = lnD(safeF(f)), S = scaleOf(f);
  const w0 = k0 * u + (n - k0) * d, w1 = k1 * u + (n + 1 - k1) * d;
  const sx = s * s * (3 - 2 * s);
  o.x = S * lerp(w0, w1, sx);
  const sym = lerp(k0 - n / 2, k1 - (n + 1) / 2, sx) * GAP, ty = tilt.v ? sym * leanOf(f) * tilt.v : 0;
  o.lnW = lerp(w0, w1, smooth(0, .4, s));
  const rad = R0 * Math.exp(o.lnW / 3);
  o.r = rad;
  o.y = Y0 - (n + s) * DY + rad + PEG_R + .1 * 4 * s * (1 - s) + jy[i] * jit + ty;
  o.x += jx[i] * jit;
  o.z = rad + zj[i] * (.22 + jit);
}

// —— 抛光黑地面：倒影是镜像画的球，地面半透明压上去 ——
export function makeFloor() {
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: true,
    vertexShader: /* glsl */`precision highp float; in vec3 position; uniform mat4 viewMatrix,projectionMatrix,modelMatrix; out vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; uniform vec3 cameraPosition; uniform float uRoom,uStrip; out vec4 O; ${GLSL_NOISE}
      void main(){ vec3 v=normalize(cameraPosition-vW); float F=pow(1.-max(v.y,0.),4.);
        float n=fbm(vW.xz*vec2(6.,2.),3);
        vec3 c=vec3(.012,.013,.016)+vec3(.8,.88,1.)*.02*F*uStrip*(1.+n)+vec3(.94,.96,1.)*uRoom*.5;
        O=vec4(c,mix(.74,.42,F)); }`,
    uniforms: { ...U },
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4000, 800), mat); m.rotation.x = -Math.PI / 2; m.position.set(0, FLOOR_Y, 200); m.renderOrder = 3;
  return m;
}

// 通用钢件
export function steelMat(base = [.6, .62, .65]) {
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`precision highp float; in vec3 position,normal; uniform mat4 viewMatrix,projectionMatrix,modelMatrix; out vec3 vW,vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=mat3(modelMatrix)*normal; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW,vN; uniform vec3 cameraPosition,uBase; uniform float uGlow; out vec4 O; ${STUDIO}
      void main(){ vec3 n=normalize(vN),v=normalize(cameraPosition-vW); float F=pow(1.-max(dot(n,v),0.),5.); O=vec4(studio(reflect(-v,n))*mix(uBase,vec3(1.),F)+uBase*uGlow*(.4+.6*max(n.z,0.)),1.); }`,
    uniforms: { ...U, uBase: { value: new THREE.Vector3(...base) }, uGlow: { value: .1 } } });
}

// 背景：白棚灯灭后自然变黑
export function makeSky() {
  const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: /* glsl */`precision highp float; in vec3 position; uniform mat4 viewMatrix,projectionMatrix; out vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vD; out vec4 O; ${STUDIO} void main(){ vec3 c=studio(vD); O=vec4(min(c,vec3(3.)),1.); }`,
    uniforms: { ...U, uStrip: { value: 0 }, uKey: { value: 0 } } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}
// 灯板：装在机器顶上，灯管和钉阵同框
export function makeLamps() {
  const g = new THREE.Group(), tubes = [], n = 11;
  const house = new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .052, .056) });
  for (let i = 0; i < n; i++) { const x = -24 + i * 4.3;
    const h = new THREE.Mesh(new THREE.BoxGeometry(4.05, 1.25, .3), house); h.position.set(x, Y0 + 3.1, .16); g.add(h);
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.7, .86, .1), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.set(x, Y0 + 3.1, .36); g.add(m); tubes.push(m); }
  return { g, n, set(fn) { tubes.forEach((m, i) => m.material.color.setScalar(fn(i))); } };
}
// 杠杆：一根钢杆从第一根钉子垂下来，杆的倾斜就是钉阵的倾斜。下面一条刻度轨
export const RAIL_Y = Y0 - 36.6, PIVOT_Y = Y0 + .5;
export const rodX = (f, y = RAIL_Y) => { const b = xAt(R, R / 2, f); return b * (PIVOT_Y - y) / (PIVOT_Y - (Y0 - R * DY)); };
export function makeRod() {
  const g = new THREE.Group(), steel = steelMat([.86, .88, .92]);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.2, .36, 1, 32), steel); g.add(rod);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(70, .3, .3), steel); rail.position.set(-6, RAIL_Y - .4, .5); g.add(rail);
  const ticks = [2, 1, .5, .25].map(f => { const t = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.3, .3), steel); t.position.set(rodX(f), RAIL_Y - .4, .6); g.add(t); return t; });
  const setF = f => { const x = rodX(f), L = Math.hypot(x, PIVOT_Y - RAIL_Y); rod.scale.set(1, L, 1); rod.position.set(x / 2, (PIVOT_Y + RAIL_Y) / 2, .62); rod.rotation.z = Math.atan2(x, PIVOT_Y - RAIL_Y); return x; };
  return { g, rod, rail, ticks, setF };
}
