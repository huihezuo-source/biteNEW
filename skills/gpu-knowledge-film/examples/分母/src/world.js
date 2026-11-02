import * as THREE from 'three';
import { rng, GLSL_NOISE, clamp } from './core.js';

export const COLS = 250, ROWS = 400, CW = 3.6, CH = 3.0, WALL_W = COLS * CW, WALL_H = ROWS * CH;
export const YOU = { col: 118, row: 171 };
export const youPos = new THREE.Vector3(-WALL_W / 2 + (YOU.col + .5) * CW, (YOU.row + .5) * CH, 0);

// 十轮筛选：每一扇窗哪一轮熄灭（真抽样，严格对半）
export const REMAIN = [100000, 50000, 25000, 12500, 6250, 3125, 1562, 781, 390, 195, 97];
export function buildWindows(seed = 20261031) {
  const r = rng(seed), N = COLS * ROWS, ids = new Uint32Array(N);
  for (let i = 0; i < N; i++) ids[i] = i;
  const youId = YOU.row * COLS + YOU.col;
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
  const a = ids.indexOf(youId); ids[a] = ids[N - 1]; ids[N - 1] = youId;   // 你一定在幸存者里
  const data = new Uint8Array(N * 4);
  let p = 0;
  for (let k = 1; k <= 10; k++) { const n = REMAIN[k - 1] - REMAIN[k]; for (let i = 0; i < n; i++) data[ids[p++] * 4] = k; }
  for (; p < N; p++) data[ids[p] * 4] = 11;
  for (let i = 0; i < N; i++) { data[i * 4 + 1] = r() * 256; data[i * 4 + 2] = r() * 256; data[i * 4 + 3] = r() * 256; }
  const tex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true; tex.colorSpace = THREE.NoColorSpace;
  return { tex, data };
}

// 掩膜：墙上拼字
export function makeMask(draw) {
  const c = document.createElement('canvas'); c.width = COLS; c.height = ROWS;
  const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.fillRect(0, 0, COLS, ROWS);
  x.save(); x.scale(CH / CW, 1); x.fillStyle = '#fff'; draw(x, COLS * CW / CH, ROWS); x.restore();   // 窗格宽高不等，先压回等比
  const img = x.getImageData(0, 0, COLS, ROWS).data, d = new Uint8Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) d[(ROWS - 1 - j) * COLS + i] = img[(j * COLS + i) * 4];
  const t = new THREE.DataTexture(d, COLS, ROWS, THREE.RedFormat, THREE.UnsignedByteType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace;
  return t;
}

const WALL_VERT = /* glsl */`
out vec3 vW; out vec2 vL;
void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vL=vec2(w.x+${(WALL_W / 2).toFixed(1)},w.y); gl_Position=projectionMatrix*viewMatrix*w; }`;

const WALL_FRAG = /* glsl */`
precision highp float; precision highp int; precision highp sampler2D;
in vec3 vW; in vec2 vL; out vec4 O;
uniform sampler2D uWin,uMask; uniform float uT;
uniform float uRound[12]; uniform vec2 uOrig[12]; uniform float uSweep[12];
uniform float uOnT,uOnK,uRevT,uRevK; uniform vec2 uOnC,uRevC;
uniform float uTint,uTintR,uMarketUp,uTCt,uTWt,uTK; uniform vec2 uTC0,uTW0; uniform float uMaskAmt,uAll,uYouGain,uYouOpen,uFog,uDim,uGold;
uniform vec3 uHaze; uniform float uMoon,uWallB,uGlassK,uIdle;
${GLSL_NOISE}
const float CW=${CW.toFixed(2)},CH=${CH.toFixed(2)};
const vec3 RED=vec3(1.,.035,.02),GRN=vec3(.012,.85,.22),GOLD=vec3(1.,.66,.22);
vec3 warm(float r,float q){ vec3 a=vec3(1.,.46,.13),b=vec3(1.,.66,.30),c=vec3(.60,.76,1.); vec3 m=mix(a,b,r*r); return mix(m,c,step(.955,q)); }
vec3 room(vec2 w,vec3 rd,float r1,float r2,float r3,vec3 lamp){
  const float D=2.2; const float X=1.25;
  vec3 ro=vec3(w.x*X*.82,w.y*.86,0.);
  vec3 tt=vec3((sign(rd.x)*X-ro.x)/rd.x,(sign(rd.y)-ro.y)/rd.y,(-D-ro.z)/rd.z);
  float t=min(min(tt.x,tt.y),tt.z); vec3 p=ro+rd*t; vec3 col;
  vec3 wc=mix(vec3(.82,.72,.6),vec3(.62,.66,.7),r2);
  if(t==tt.z){ col=wc; 
    vec2 q=p.xy+vec2((r1-.5)*1.1,.1); float b=step(abs(q.x),.42+.2*r2)*step(abs(q.y-.18),.26); col=mix(col,mix(vec3(.15,.12,.1),vec3(.36,.2,.14),r3),b);
    col=mix(col,vec3(.08,.07,.07),step(p.y,-.45+.14*r3)*step(abs(p.x+.3-r2),.75)); }
  else if(t==tt.y){ col=rd.y>0.?vec3(.95,.92,.86):vec3(.32,.22,.15)*(.8+.2*sin(p.x*22.)); }
  else col=wc*.9;
  // 人影
  float tp=(-D*.62-ro.z)/rd.z; if(tp<t&&r3>.52){ vec3 s=ro+rd*tp; vec2 q=s.xy-vec2((r1-.5)*1.3,-.5);
    float head=length(q-vec2(0,.42))-.17; float body=length(max(abs(q+vec2(0,.2))-vec2(.2,.42),0.))-.1; float sd=min(head,body);
    if(sd<0.){ col=vec3(.02,.018,.02)+vec3(.1,.16,.26)*smoothstep(.0,.3,q.y+.1)*step(.8,r2); t=tp; p=s; } }
  float d=length(p-vec3(0.,.86,-D*.55)); float L=1.5/(1.+.8*d*d);
  col*=lamp*L;
  if(rd.y>0.&&t==tt.y) col+=lamp*.9*smoothstep(.55,.0,length(p.xz-vec2(0.,-D*.55)));
  // 窗帘
  float cu=smoothstep(.0,.03,abs(w.x)-(.25+.7*r1)); float pleat=.75+.25*sin(w.x*46.+r2*30.);
  col=mix(col,lamp*vec3(.95,.82,.66)*.55*pleat,cu*.86);
  return col;
}
void main(){
  vec3 Vd=cameraPosition-vW; float dist=length(Vd); vec3 V=Vd/dist;
  if(vL.x<0.||vL.x>${WALL_W.toFixed(1)}||vL.y<0.||vL.y>${WALL_H.toFixed(1)}){ discard; }
  vec2 cell=vL/vec2(CW,CH); ivec2 id=ivec2(floor(cell)); vec2 f=fract(cell);
  float px=max(fwidth(cell.x),fwidth(cell.y));
  vec4 W=texelFetch(uWin,id,0);
  float e=floor(W.r*255.+.5); float r1=W.g,r2=W.b,r3=W.a;
  vec2 idf=vec2(id);
  // 亮起
  float tOn=uOnT+length(idf-uOnC)*uOnK+r1*.35;
  float on=smoothstep(0.,.10,uT-tOn);
  // 熄灭
  int ei=int(e); float tOff=uRound[ei]+length(idf-uOrig[ei])*uSweep[ei]+r2*.12;
  float dt=uT-tOff; float off=smoothstep(0.,.06,dt);
  float burn=dt>0.?exp(-min(dt,20.)*7.)*step(uRound[ei],998.)*on:0.;
  // 复亮
  float tRev=uRevT+length(idf-uRevC)*uRevK+r3*1.2; float rev=smoothstep(0.,.5,uT-tRev);
  float alive=max(on*(1.-off),rev);
  // 外观
  vec3 wa=warm(r1,r2);
  float isYou=step(abs(float(id.x)-${YOU.col}.),.5)*step(abs(float(id.y)-${YOU.row}.),.5);
  float mask=texelFetch(uMask,id,0).r;
  float macro=fbm(vec2(id)*.012+3.,4); float rowb=.82+.36*hash11(float(id.y)*.37);
  float gain=(.55+1.5*r3*r3*r3)*(.6+.95*macro)*rowb;
  vec3 lamp=wa;
  // 涨跌染色：本轮选错的人 = 与市场相反的颜色
  if(uTint>.001){ float wrong=step(abs(e-uTintR),.5); float mk=uMarketUp; vec3 right=mix(GRN,RED,mk), bad=mix(RED,GRN,mk);
    float tt=wrong>.5?uTWt:uTCt; vec2 oo=wrong>.5?uTW0:uTC0; float kk=smoothstep(0.,.25,uT-(tt+length(idf-oo)*uTK+r1*.35));
    lamp=mix(lamp,wrong>.5?bad:right,uTint); gain=mix(gain,(.06+.62*kk)*(.7+.7*r3),uTint); }
  if(uMaskAmt>.001){ float mt=smoothstep(0.,.14,uMaskAmt-length(idf-vec2(125.,200.))*.0022-r2*.25*(1.-uMaskAmt)); float inM=step(.5,mask); alive=mix(alive,inM,mt); lamp=mix(lamp,mix(vec3(1.,.40,.07),vec3(1.,.58,.16),r1),mt); gain=mix(gain,1.25+.9*r3*r3,mt); }
  if(uAll>.001){ alive=max(alive,uAll); }
  alive*=uDim;
  if(isYou>.5){ alive=max(alive,uYouGain>0.?1.:0.); gain*=uYouGain; lamp=mix(lamp,vec3(1.,.72,.36),.8); }
  // 构件
  float slab=smoothstep(.115,.095,f.y);
  float x0=.13,x1=.87,y0=.18,y1=.93; float e2=max(px,.002);
  float gx=smoothstep(x0-e2,x0+e2,f.x)*smoothstep(x1+e2,x1-e2,f.x); float gy=smoothstep(y0-e2,y0+e2,f.y)*smoothstep(y1+e2,y1-e2,f.y); float glass=gx*gy;
  float mull=smoothstep(.018+e2,.012,abs(f.x-.5))*step(px,.2)*(1.-isYou);
  float wnoise=fbm(vL*vec2(.09,.13),3); float big=fbm(vL*.0035,3);
  vec3 wall=mix(vec3(.052,.056,.066),vec3(.09,.09,.098),wnoise)*(.75+.5*big);
  wall+=vec3(.018)*slab;
  wall*=1.-.5*smoothstep(.2,.12,f.y)*(1.-slab);
  // 月光 + 地面反上来的城光
  float up=exp(-vL.y/420.); vec3 amb=vec3(.20,.26,.40)*.5+vec3(.95,.55,.26)*.55*up;
  vec3 c=wall*amb*1.4*(.6+.4*uMoon)*uWallB;
  vec3 rd=-V; float nz=max(V.z,.05);
  // 玻璃：天空反射
  vec3 R=reflect(rd,vec3(0,0,1)); float fres=.05+.95*pow(1.-nz,5.);
  vec3 skyR=mix(vec3(.040,.055,.085),vec3(.006,.009,.018),clamp(R.y*1.6+.2,0.,1.))+vec3(.30,.17,.09)*pow(clamp(1.-abs(R.y)*3.,0.,1.),3.)*.35;
  float cloud=fbm(vec2(R.x*2.6+vL.x*.0016,R.y*2.6+vL.y*.0022)+uT*.004,5); vec3 g=skyR*(.8+fres*2.)*(.45+1.5*cloud*cloud)*(.86+.28*r2)*uMoon*uGlassK;
  // 灯
  float detail=smoothstep(.20,.06,px);
  vec3 em=lamp*2.6;
  float idle=uIdle*step(.3,r2)*(.3+1.4*r3*r3);
  if(detail>.001&&(alive>.001||idle>.001)){
    vec2 w=vec2((f.x-.5)/((x1-x0)*.5),(f.y-.555)/((y1-y0)*.5));
    vec3 rdT=normalize(vec3(rd.x,rd.y/1.0,min(rd.z,-.05)));
    em=mix(em,room(w,rdT,r1,r2,r3,lamp)*2.1,detail);
    em*=1.-mull;
  }
  g=mix(g,em*gain,alive); g+=em*idle*(1.-alive);
  float glowW=exp(-pow(length((f-vec2(.5,.55))*vec2(1.,1.1)),2.)*5.)*.05*alive*gain;
  c+=lamp*glowW*(1.-glass);
  c=mix(c,g,glass);
  c+=vec3(1.,.93,.82)*burn*glass*6.;
  // 你那扇窗：开洞露出真房间
  if(isYou>.5&&uYouOpen>.5&&glass>.5) discard;
  // 边框阴影
  c*=1.-.35*(1.-glass)*smoothstep(.0,.03,min(min(f.x,1.-f.x),.0)+.03)*0.;
  // 大气
  float fog=1.-exp(-dist*uFog); float hz=exp(-max(vW.y,0.)/360.);
  c=mix(c,uHaze*(.55+1.2*hz),fog);
  O=vec4(c,1.);
}`;

export function makeWall(winTex, maskTex) {
  const u = {
    uWin: { value: winTex }, uMask: { value: maskTex }, uT: { value: 0 },
    uRound: { value: new Array(12).fill(999) }, uOrig: { value: Array.from({ length: 12 }, () => new THREE.Vector2(125, 200)) }, uSweep: { value: new Array(12).fill(.002) },
    uOnT: { value: 999 }, uOnK: { value: .01 }, uOnC: { value: new THREE.Vector2(118, 171) },
    uRevT: { value: 999 }, uRevK: { value: .01 }, uRevC: { value: new THREE.Vector2(118, 171) },
    uTint: { value: 0 }, uTintR: { value: 1 }, uMarketUp: { value: 1 }, uTCt: { value: -999 }, uTWt: { value: -999 }, uTK: { value: .006 }, uTC0: { value: new THREE.Vector2(0, 400) }, uTW0: { value: new THREE.Vector2(250, 0) }, uMaskAmt: { value: 0 }, uAll: { value: 0 }, uYouGain: { value: 1 }, uYouOpen: { value: 0 }, uFog: { value: .00012 }, uDim: { value: 1 }, uGold: { value: 0 },
    uHaze: { value: new THREE.Color(.020, .026, .040) }, uMoon: { value: 1 }, uWallB: { value: 1 }, uGlassK: { value: 1 }, uIdle: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, uniforms: u, side: THREE.FrontSide });
  const g = new THREE.PlaneGeometry(WALL_W, WALL_H, 1, 1); g.translate(0, WALL_H / 2, 0);
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return { mesh, u };
}

// —— 天空 ——
export function makeSky() {
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, uniforms: { uT: { value: 0 }, uGlow: { value: 1 } },
    vertexShader: `out vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); gl_Position=p.xyww; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vD; out vec4 O; uniform float uT,uGlow; ${GLSL_NOISE}
    void main(){ vec3 d=normalize(vD); float h=clamp(d.y,-.2,1.);
      vec3 c=mix(vec3(.030,.032,.040),vec3(.004,.006,.012),pow(clamp(h*2.2,0.,1.),.6));
      float g=exp(-max(d.y,0.)*14.); c+=vec3(.20,.105,.05)*g*.55*uGlow;
      vec2 p=d.xz/(max(d.y,.02)+.3); float cl=fbm(p*2.2+vec2(uT*.006,0.),5); cl=smoothstep(.45,.85,cl);
      c+=vec3(.05,.04,.045)*cl*(1.-clamp(h*1.4,0.,1.))*uGlow;
      float s=hash21(floor(d.xz*520.)); c+=vec3(.9,.95,1.)*step(.9985,s)*.25*smoothstep(.05,.3,d.y);
      O=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m); mesh.frustumCulled = false; mesh.renderOrder = -10;
  return { mesh, u: m.uniforms };
}

// —— 墙脚下的城（盒子楼 + 程序窗 + 车流）——
export function makeCity(seed = 7) {
  const r = rng(seed), N = 6500, dummy = new THREE.Object3D();
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { uT: { value: 0 }, uFog: { value: .00016 }, uHaze: { value: new THREE.Color(.020, .026, .040) }, uLit: { value: 1 } },
    vertexShader: `in vec4 aInfo; out vec3 vW; out vec3 vN; out vec3 vS; out vec4 vI; void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normal; vI=aInfo; vS=vec3(instanceMatrix[0][0],instanceMatrix[1][1],instanceMatrix[2][2]); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; in vec3 vN; in vec3 vS; in vec4 vI; out vec4 O; uniform float uT,uFog,uLit; uniform vec3 uHaze; ${GLSL_NOISE}
    void main(){ vec3 Vd=cameraPosition-vW; float dist=length(Vd);
      vec3 c=vec3(.012,.013,.017);
      if(abs(vN.y)<.5){ vec2 q=abs(vN.x)>.5?vec2(vW.z,vW.y):vec2(vW.x,vW.y); vec2 cell=q/vec2(4.,3.2); vec2 id=floor(cell),f=fract(cell);
        float px=fwidth(cell.y); float h=hash21(id+vI.xy*91.); float lit=step(1.-.13*vI.z-.02,h)*uLit; vec3 lc=mix(vec3(1.,.6,.28),vec3(.8,.86,1.),step(.86,fract(h*37.)));
        float gl=smoothstep(.0,.08+px,min(f.x,1.-f.x)-.1)*smoothstep(.0,.08+px,min(f.y,1.-f.y)-.12);
        c+=lc*lit*gl*(.5+1.1*fract(h*91.)); }
      else { c=vec3(.008,.009,.012); }
      float up=exp(-vW.y/90.); c+=vec3(.2,.11,.055)*up*.09;
      float fog=1.-exp(-dist*uFog); c=mix(c,uHaze*1.5,fog);
      O=vec4(c,1.); }` });
  const mesh = new THREE.InstancedMesh(g, m, N); const info = new Float32Array(N * 4);
  let n = 0;
  for (let i = 0; n < N && i < N * 6; i++) {
    const x = (r() - .5) * 15000, z = -6000 + r() * 14000; const d = Math.abs(z);
    if (x > -560 && x < 560 && z > -120 && z < 90) continue;            // 给巨墙留地
    const gx = Math.round(x / 62) * 62, gz = Math.round(z / 62) * 62;
    const h = 24 + 170 * r() ** 2.4 * (1 - .55 * Math.min(1, Math.hypot(x, z) / 7000));
    dummy.position.set(gx + (r() - .5) * 16, 0, gz + (r() - .5) * 16); dummy.scale.set(20 + r() * 24, h, 18 + r() * 22); dummy.rotation.y = 0; dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix); info[n * 4] = r(); info[n * 4 + 1] = r(); info[n * 4 + 2] = .35 + r() * 1.4; info[n * 4 + 3] = r(); n++;
  }
  mesh.count = n; g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4)); mesh.frustumCulled = false; mesh.instanceMatrix.needsUpdate = true;
  // 地面：路网与车流
  const gm = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { uT: { value: 0 }, uFog: { value: .00016 }, uHaze: m.uniforms.uHaze },
    vertexShader: `out vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; out vec4 O; uniform float uT,uFog; uniform vec3 uHaze; ${GLSL_NOISE}
    float road(float x,float w,float px){ float d=abs(mod(x+w,w*2.)-w); return d; }
    void main(){ float dist=length(cameraPosition-vW); vec3 c=vec3(.006,.006,.008);
      vec2 p=vW.xz; float s=248.; vec2 d=vec2(abs(mod(p.x+s*.5,s)-s*.5),abs(mod(p.y+s*.5,s)-s*.5));
      float px=fwidth(p.x)+fwidth(p.y);
      float w=7.+px*.6; float rx=smoothstep(w,w*.3,d.x),rz=smoothstep(w,w*.3,d.y);
      float id1=floor((p.x+s*.5)/s),id2=floor((p.y+s*.5)/s);
      float tr1=fract(p.y/34.+uT*(.18+.14*hash11(id1))*(mod(id1,2.)*2.-1.)+hash11(id1+3.));
      float tr2=fract(p.x/34.+uT*(.18+.14*hash11(id2+9.))*(mod(id2,2.)*2.-1.)+hash11(id2+5.));
      vec3 hl=vec3(1.,.82,.55),tl=vec3(1.,.12,.06);
      c+=rx*(vec3(.14,.08,.04)+mix(hl,tl,step(0.,sin(id1*1.7)))*pow(tr1,14.)*1.3);
      c+=rz*(vec3(.14,.08,.04)+mix(hl,tl,step(0.,sin(id2*2.3)))*pow(tr2,14.)*1.3);
      float fog=1.-exp(-dist*uFog); c=mix(c,uHaze*1.5,fog);
      O=vec4(c,1.); }` });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), gm); ground.rotation.x = -Math.PI / 2; ground.frustumCulled = false;
  return { mesh, ground, u: m.uniforms, gu: gm.uniforms };
}

// —— 你那扇窗的星光：远处也一眼看见 ——
export function makeStar(pos) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256); g.addColorStop(0, 'rgba(255,240,215,1)'); g.addColorStop(.05, 'rgba(255,205,140,.85)'); g.addColorStop(.2, 'rgba(255,150,70,.20)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.globalCompositeOperation = 'lighter'; for (const [w, h] of [[512, 5], [5, 512]]) { const l = x.createLinearGradient(256 - w / 2, 256 - h / 2, 256 + w / 2, 256 + h / 2); l.addColorStop(0, 'rgba(255,200,130,0)'); l.addColorStop(.5, 'rgba(255,225,180,.7)'); l.addColorStop(1, 'rgba(255,200,130,0)'); x.fillStyle = l; x.fillRect(256 - w / 2, 256 - h / 2, w, h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false });
  const s = new THREE.Sprite(m); s.position.copy(pos); s.position.z += .5; s.frustumCulled = false; s.visible = false; s.renderOrder = 50;
  return { sprite: s, hide() { s.visible = false; }, show(a, dist, cam) { s.visible = a > .001; m.opacity = a; m.color.setScalar(2.4); const k = Math.max(dist, 1) * .052; s.scale.set(k, k, 1); } };
}
