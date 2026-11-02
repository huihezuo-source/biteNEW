import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLSL_NOISE, W, H, clamp, ss, lerp, rng } from './core.js';

// 世界规则：手机是屋里唯一的灯。绿 = 跌，红 = 涨，黑屏 = 你走了，晨光 = 第二天
export const GREEN = new THREE.Color(.07, 1.0, .46), RED = new THREE.Color(1.0, .10, .07), WARM = new THREE.Color(1.0, .66, .38);
export const PHONE = { w: .76, h: .085, l: 1.62 };

const LIGHT = /* glsl */`
uniform vec3 uCol, uPos, uN, uSun; uniform float uPow, uDawn, uTime, uLift; uniform vec4 uF0, uF1;
// p 处透过百叶窗能不能看到太阳。窗在背后的墙上（z=-6.95），太阳很低，从窗外平着照进来
float blind(vec3 p){
  float k=(-6.95-p.z)/uSun.z; if(k<0.) return 0.;
  vec3 q=p+uSun*k;
  float win=smoothstep(0.,.1,q.x+3.6)*smoothstep(0.,.1,4.4-q.x)*smoothstep(0.,.1,q.y-.5)*smoothstep(0.,.1,4.9-q.y);
  return win*smoothstep(.2,.3,fract(q.y*2.2));
}
// 手机出来的光：朝屏幕法线的一束
float beam(vec3 p){
  vec3 r=p-uPos; float a=dot(r,uN); if(a<0.) return 0.;
  vec3 s=r-uN*a; vec3 Z=normalize(cross(uN,vec3(.31,.17,.93))); vec3 X=cross(uN,Z);
  float w=.27+a*.13, l=.56+a*.16; float e=dot(s,X)/w, f=dot(s,Z)/l;
  return exp(-(e*e+f*f)*1.5)*exp(-a*.5)/(1.+a*.4);
}
// 手指在光里的影子
float fingerShade(vec3 p){
  if(uF0.w<.5) return 1.;
  vec2 a=uF0.xz,b=uF1.xz,pa=p.xz-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float d=length(pa-ba*h);
  float y=mix(uF0.y,uF1.y,h);
  return 1.-(1.-smoothstep(.05,.13+(p.y-y)*.14,d))*smoothstep(y-.02,y+.04,p.y);
}
`;

const roomUniforms = {
  uCol: { value: GREEN.clone() }, uPos: { value: new THREE.Vector3(0, .05, 0) }, uN: { value: new THREE.Vector3(0, 1, 0) }, uPow: { value: 1 },
  uDawn: { value: 0 }, uLift: { value: 0 }, uSun: { value: new THREE.Vector3(-.1, .2, -1).normalize() }, uTime: { value: 0 }, uF0: { value: new THREE.Vector4() }, uF1: { value: new THREE.Vector4() },
};

function roomMat(albedo, gloss, transparent = false) {
  return new THREE.ShaderMaterial({
    uniforms: { ...roomUniforms, uA: { value: albedo }, uG: { value: gloss } }, transparent, depthWrite: !transparent,
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; varying vec3 vP; varying vec3 vN; uniform vec3 uA; uniform float uG;
${GLSL_NOISE}${LIGHT}
void main(){
  vec3 V=normalize(cameraPosition-vP); float nv=max(dot(V,vN),0.);
  float grain=fbm(vP.xz*vec2(1.2,7.)+vP.y*3.,4);
  vec3 alb=uA*(.72+.5*grain);
  vec3 r=vP-uPos; float d2=dot(r,r); vec3 L=-normalize(r);
  float halo=(uPow*(1.-abs(uN.y)*.0))*.22/(1.+d2*2.3);
  float spot=beam(vP)*uPow*.9*mix(1.,smoothstep(.0,3.,vP.y)*.4,uLift);
  vec3 c=uCol*(halo*(.55+.6*grain)*(1.+uG*2.)+spot*alb*2.2);
  float bl=blind(vP+vN*.01);
  vec3 sun=vec3(1.,.72,.44);
  c+=sun*uDawn*(bl*(.25+max(dot(vN,uSun),0.))*alb*30.+alb*.34);
  float spec=pow(max(dot(reflect(-V,vN),uSun),0.),24.)*uDawn*uG*1.6;
  c+=sun*spec;
  float F=uG*(.10+.9*pow(1.-nv,5.));
  gl_FragColor=vec4(c,${transparent ? '1.-F' : '1.'});
}` });
}

export function makeRoom(extra = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const under = new THREE.Group(); under.scale.y = -1; scene.add(under); // 桌面倒影：物件翻到桌下再画一遍
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), roomMat(new THREE.Color(.042, .04, .04), .62, true)); desk.renderOrder = 2; scene.add(desk);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 12).translate(0, 3, -7), roomMat(new THREE.Color(.34, .32, .3), 0)); scene.add(back);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(30, 12).rotateY(-Math.PI / 2).translate(7, 3, 2), roomMat(new THREE.Color(.34, .32, .3), 0)); scene.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(Math.PI / 2).translate(0, 6, 0), roomMat(new THREE.Color(.26, .25, .24), 0)); scene.add(ceil);
  // 窗：只有天亮才看得见。太阳在窗外偏低的位置，叶片之间透光
  const winMat = new THREE.ShaderMaterial({ uniforms: { uDawn: roomUniforms.uDawn },
    vertexShader: `varying vec3 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vP; uniform float uDawn; void main(){ vec3 q=vP; if(q.y<0.) q.y=-q.y; float s=smoothstep(.2,.3,fract(q.y*2.2)); float d=length((q.xy-vec2(.5,1.45))*vec2(.55,1.)); float sun=exp(-d*d*.9)*6.+exp(-d*.75)*2.2; float e=smoothstep(0.,.1,q.x+3.6)*smoothstep(0.,.1,4.4-q.x)*smoothstep(0.,.1,q.y-.5)*smoothstep(0.,.1,4.9-q.y);
      vec3 c=mix(vec3(1.,.42,.14),vec3(1.,.8,.56),clamp(uDawn*1.25,0.,1.)); gl_FragColor=vec4(c*sun*s*e*uDawn*2.4,1.); }` });
  const winG = new THREE.PlaneGeometry(8.2, 4.6).translate(.4, 2.7, -6.95);
  const win = new THREE.Mesh(winG, winMat); scene.add(win); const winU = new THREE.Mesh(winG, winMat); under.add(winU);
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(30, 12).rotateY(Math.PI / 2).translate(-6.52, 3, 2), roomMat(new THREE.Color(.34, .32, .3), 0)); scene.add(wallL);

  // 光柱 + 晨光：整屋一个体积
  const vol = new THREE.Mesh(new THREE.BoxGeometry(13.3, 5.9, 13.7).translate(.25, 3.0, -.05), new THREE.ShaderMaterial({ uniforms: { ...roomUniforms, uQ: { value: 1 } }, side: THREE.BackSide, transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; varying vec3 vP;
${GLSL_NOISE}${LIGHT}
void main(){
  vec3 ro=cameraPosition, rd=normalize(vP-ro); float tMax=length(vP-ro);
  if(rd.y<0.) tMax=min(tMax,-ro.y/rd.y);
  const int N=26; float dt=min(tMax,14.)/float(N); float j=hash21(gl_FragCoord.xy+uTime*61.);
  vec3 acc=vec3(0.); vec3 sun=vec3(1.,.72,.44);
  for(int i=0;i<N;i++){
    vec3 p=ro+rd*(float(i)+j)*dt;
    if(p.x<-6.5||p.x>7.||p.z<-7.) continue;
    float n=.55+.9*fbm3(p*1.3+vec3(0.,-uTime*.09,uTime*.05),3);
    float b=beam(p)*fingerShade(p)*mix(1.,smoothstep(.0,1.5,p.y),uLift);
    acc+=uCol*b*uPow*n*1.7;
    if(uDawn>.001) acc+=sun*blind(p)*uDawn*n*.13;
  }
  gl_FragColor=vec4(acc*dt,1.);
}` }));
  vol.renderOrder = 8; vol.frustumCulled = false; scene.add(vol);

  // 灰尘：只有被光照到才看得见
  const n = 3200, r = rng(77), pos = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = -6 + r() * 12; pos[i * 3 + 1] = r() * 5.5; pos[i * 3 + 2] = -6.5 + r() * 12; rnd[i] = r(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: { ...roomUniforms, uPx: { value: H / 960 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`attribute float aR; varying vec3 vC; uniform float uPx;
${LIGHT}
void main(){ vec3 p=position; float t=uTime*.06+aR*50.; p+=vec3(sin(t*1.3+aR*9.),sin(t*.7+aR*17.)*.6,cos(t+aR*5.))*.28; p.y=mod(p.y+uTime*(.008+aR*.02),5.6);
  float b=beam(p)*uPow*1.1; vec3 sun=vec3(1.,.72,.44); vC=uCol*b*(.6+aR)+sun*blind(p)*uDawn*2.2*(.5+aR);
  vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPx*(1.+aR*2.6)*7./max(.3,-mv.z); }`,
    fragmentShader: `varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=exp(-d*d*3.2); if(a<.01) discard; gl_FragColor=vec4(vC*a,1.); }` }));
  dust.frustumCulled = false; dust.renderOrder = 9; scene.add(dust);

  const key = new THREE.PointLight(0xffffff, 0, 16, 1.7); scene.add(key);
  const sunL = new THREE.DirectionalLight(0xffc27a, 0); sunL.position.set(-6, 4, 2); scene.add(sunL, sunL.target);
  return { scene, under, desk, vol, dust, key, sunL, U: roomUniforms };
}

// 手机：本体和倒影共用材质
export function makePhone(tex) {
  const scr = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const body = new THREE.MeshPhysicalMaterial({ color: 0x07080a, metalness: .9, roughness: .3, clearcoat: 1, clearcoatRoughness: .2 });
  const mk = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.h, PHONE.l, 6, .05), body));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.71, 1.565).rotateX(-Math.PI / 2).translate(0, PHONE.h / 2 + .0015, 0), scr); g.add(s);
    const bump = new THREE.Mesh(new RoundedBoxGeometry(.26, .03, .3, 3, .012).translate(-.2, -PHONE.h / 2 - .01, -.58), body); g.add(bump);
    return g;
  };
  return { a: mk(), b: mk(), scr, body };
}

// 手：只在屏幕光里看得见，所以形状不用太细
export function makeHand() {
  // 只吃屏幕的光：下半边亮一点，边缘一圈轮廓光
  const skin = new THREE.ShaderMaterial({ uniforms: { uCol: roomUniforms.uCol, uPow: roomUniforms.uPow, uPos: roomUniforms.uPos },
    vertexShader: `varying vec3 vN,vV,vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vN,vV,vP; uniform vec3 uCol,uPos; uniform float uPow; void main(){ vec3 L=normalize(uPos-vP); float d=length(uPos-vP); float dif=max(dot(vN,L),0.); float f=pow(1.-max(dot(vN,vV),0.),2.6);
      vec3 c=uCol*uPow*(dif*1.1/(1.+d*d*1.6)+f*.42/(1.+d*d*.25)); gl_FragColor=vec4(c+vec3(.006,.005,.004),1.); }` });
  const g = new THREE.Group(), j1 = new THREE.Group(), j2 = new THREE.Group();   // 原点在指尖，+Y 指向手掌
  const curve = new THREE.CatmullRomCurve3([[0, .03, 0], [.0, .3, .012], [.03, .62, .03], [.1, .98, .03], [.24, 1.5, 0]].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(curve, 40, 1, 20, false), pos = tube.attributes.position, nor = tube.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i); const u = Math.floor(i / 21) / 40, c = curve.getPoint(u), r = .056 + u * .034 + Math.sin(u * 42) * .0012; pos.setXYZ(i, c.x + n.x * r, c.y + n.y * r, c.z + n.z * r); } tube.computeVertexNormals();
  const finger = new THREE.Mesh(tube, skin), tip = new THREE.Mesh(new THREE.SphereGeometry(.0565, 20, 14), skin); tip.position.set(0, .03, 0); g.add(finger, tip);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(.46, 24, 16), skin); palm.scale.set(1, 1.3, .42); palm.position.set(.42, 2.0, 0); g.add(palm, j1); j1.add(j2);
  g.userData.j1 = j1; g.userData.j2 = j2;
  return g;
}

// 把手机灯的位置、朝向、颜色、亮度一起设好
// K 线的发光材质：柱身深，边线和顶面亮，不让红色冲成粉色
export function candleMat(col, gain = 1) {
  return new THREE.ShaderMaterial({ uniforms: { uC: { value: col.clone() }, uG: { value: gain } },
    vertexShader: `varying vec3 vL,vN; void main(){ vL=position; vN=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vL,vN; uniform vec3 uC; uniform float uG; void main(){ vec3 a=abs(vL); float top=step(.5,abs(vN.y));
      float e=top>.5?min(.5-a.x,.5-a.z):(abs(vN.x)>.5?.5-a.z:.5-a.x); float edge=1.-smoothstep(.0,.07,e);
      float g=vL.y+.5; vec3 c=uC*(top>.5?1.5:(.16+.9*g*g))+uC*edge*1.5; gl_FragColor=vec4(c*uG,1.); }` });
}

export function setLamp(room, p, n, col, pow) {
  const U = room.U; U.uPos.value.copy(p); U.uN.value.copy(n).normalize(); U.uCol.value.copy(col); U.uPow.value = pow;
  room.key.color.copy(col); room.key.intensity = pow * 3.2; room.key.position.copy(p).addScaledVector(U.uN.value, .34);
}
export function setFingerShade(room, a, b, on = 1) { room.U.uF0.value.set(a.x, a.y, a.z, on); room.U.uF1.value.set(b.x, b.y, b.z, on); }
export const clockRoom = (room, t) => { room.U.uTime.value = t; };
