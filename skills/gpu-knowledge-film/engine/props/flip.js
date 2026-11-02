import * as THREE from 'three';
import { GLSL_NOISE, rng, H as HH } from './core.js';

export const CHARS = '0123456789,.¥+-×= %';
export const idx = c => { const i = CHARS.indexOf(c); return i < 0 ? CHARS.indexOf(' ') : i; };
let atlas = null;
export function getAtlas() {
  if (atlas) return atlas;
  const n = CHARS.length, cw = 128, ch = 192, c = document.createElement('canvas'); c.width = cw * n; c.height = ch; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.font = '700 150px JB'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  for (let i = 0; i < n; i++) x.fillText(CHARS[i], cw * (i + .5), ch * .54);
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.NoColorSpace; atlas.generateMipmaps = true; atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.magFilter = THREE.LinearFilter; atlas.anisotropy = 16; atlas.flipY = true;
  return atlas;
}

const VERT = /* glsl */`
in float aPart; in vec2 aXY; in float aFrom; in float aTo; in float aStart; in float aSeed; in float aTint;
uniform float uT,uDur; uniform vec2 uTile; uniform float uTintT;
out vec2 vL; out float vFrom; out float vTo; out float vPart; out float vP; out vec3 vN; out vec3 vW; out float vSeed; out float vTint;
void main(){ float p=clamp((uT-aStart)/uDur,0.,1.); vP=p; p=p*p*(1.+.0*p);
  vec3 q=position; vec3 N=vec3(0,0,1);
  vL=vec2(q.x+.5,q.y+.5);
  if(aPart>1.5){ float a=p*3.14159; float v=q.y; q.y=cos(a)*v; q.z=sin(a)*v+.004; N=vec3(0.,sin(a),cos(a)); }
  float gap=.93; vec3 w=vec3(aXY.x+q.x*uTile.x*gap,aXY.y+q.y*uTile.y*gap,q.z*uTile.y);
  vec4 W=modelMatrix*vec4(w,1.); vW=W.xyz; vN=mat3(modelMatrix)*N; vFrom=aFrom; vTo=aTo; vPart=aPart; vSeed=aSeed; vTint=aTint;
  gl_Position=projectionMatrix*viewMatrix*W; }`;
const FRAG = /* glsl */`precision highp float;
in vec2 vL; in float vFrom; in float vTo; in float vPart; in float vP; in vec3 vN; in vec3 vW; in float vSeed; in float vTint; out vec4 O;
uniform sampler2D tA; uniform float uN,uKey,uAmb,uEdge,uGlow; uniform vec3 uL,uLC,uInk,uBase; uniform vec3 uTintC,uTintB; uniform float uFog; uniform vec3 uFogC;
float glyph(float ch,vec2 l){ vec2 uv=vec2((ch+l.x)/uN,l.y); return texture(tA,uv).r; }
void main(){ vec3 N=normalize(gl_FrontFacing?vN:-vN); float ch; vec2 l=vL;
  if(vPart<.5){ ch=vTo; }            // 上半静片：下一字符
  else if(vPart<1.5){ ch=vFrom; }    // 下半静片：上一字符
  else { if(gl_FrontFacing){ ch=vFrom; } else { ch=vTo; l.y=1.-l.y; } }
  float g=glyph(ch,l);
  bool isTo=(vPart<.5)||(vPart>1.5&&!gl_FrontFacing)||(vPart>.5&&vPart<1.5&&vP>=1.);
  vec3 ink=isTo?mix(uInk,vTint<0.?uTintB:uTintC,abs(vTint)):uInk;
  vec3 alb=mix(uBase,ink,g);
  vec3 Ld=uL-vW; float dl=length(Ld); Ld/=dl; float nl=max(dot(N,Ld),0.); float atten=1./(1.+dl*dl*uFog*uFog*40.);
  vec3 V=normalize(cameraPosition-vW); vec3 Hh=normalize(Ld+V); float sp=pow(max(dot(N,Hh),0.),60.)*.5;
  vec3 c=alb*(uAmb+uKey*nl*uLC*atten)+uLC*sp*.08*atten*uKey;
  // 中缝与边缘
  float slit=smoothstep(.0,.012,abs(l.y-.5)); c*=.25+.75*slit;
  // 翻动时的明暗
  if(vPart<1.5){ float sh=(vP>0.&&vP<1.)?(vPart<.5?.55:.72):1.; c*=sh; }
  float e=min(min(l.x,1.-l.x),min(l.y,1.-l.y)); c+=uLC*smoothstep(.03,.0,e)*.02*uEdge*uKey;
  if(isTo) c+=ink*(g*.9+.1)*abs(vTint)*uGlow;
  float d=length(cameraPosition-vW); c=mix(c,uFogC,1.-exp(-d*uFog));
  O=vec4(c,1.); }`;

export function makeFlaps(n, tileW, tileH, opt = {}) {
  const pos = [], part = [], idxs = [];
  const quad = (x0, y0, x1, y1, pp) => { const b = pos.length / 3; pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0); part.push(pp, pp, pp, pp); idxs.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  quad(-.5, 0, .5, .5, 0); quad(-.5, -.5, .5, 0, 1); quad(-.5, 0, .5, .5, 2);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1)); g.setIndex(idxs); g.instanceCount = n;
  const A = { aXY: new Float32Array(n * 2), aFrom: new Float32Array(n), aTo: new Float32Array(n), aStart: new Float32Array(n).fill(-99), aSeed: new Float32Array(n), aTint: new Float32Array(n) };
  const attr = {}; for (const k of Object.keys(A)) { const it = k === 'aXY' ? 2 : 1; attr[k] = new THREE.InstancedBufferAttribute(A[k], it); g.setAttribute(k, attr[k]); }
  const u = { tA: { value: getAtlas() }, uN: { value: CHARS.length }, uT: { value: 0 }, uDur: { value: .16 }, uTile: { value: new THREE.Vector2(tileW, tileH) }, uKey: { value: 1.6 }, uAmb: { value: .05 }, uEdge: { value: 1 }, uGlow: { value: 0 }, uL: { value: new THREE.Vector3(0, 4, 6) }, uLC: { value: new THREE.Color(1, .92, .8) }, uInk: { value: new THREE.Color(.86, .84, .78) }, uBase: { value: new THREE.Color(.012, .012, .014) }, uTintC: { value: new THREE.Color(1, .12, .08) }, uTintB: { value: new THREE.Color(1, .66, .22) }, uTintT: { value: 0 }, uFog: { value: 0 }, uFogC: { value: new THREE.Color(0, 0, 0) } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms: u, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return { mesh, u, A, attr, commit() { for (const k of Object.keys(attr)) attr[k].needsUpdate = true; } };
}
// 一排字符：从 a 串翻到 b 串（等宽）。只有变的格子翻，翻的时候可经过中间字符
export function setRow(fl, start, from, to, t0, opt = {}) {
  const { stagger = .012, x0 = 0, y = 0, tw = 1, tint = 0 } = opt;
  const n = Math.max(from.length, to.length);
  for (let i = 0; i < n; i++) { const k = start + i; const a = idx(from[i] ?? ' '), b = idx(to[i] ?? ' '); fl.A.aXY[k * 2] = x0 + i * tw; fl.A.aXY[k * 2 + 1] = y; fl.A.aFrom[k] = a; fl.A.aTo[k] = b; fl.A.aStart[k] = a === b ? -99 : t0 + i * stagger; fl.A.aTint[k] = a === b ? 0 : tint; }
}
