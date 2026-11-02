import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, H } from './core.js';

// 站立的人：头、肩、躯干、分开的两条腿、略微张开的手臂
const BODY = [[.50, .098, .062], [.54, .094, .06], [.60, .092, .058], [.68, .104, .062], [.76, .122, .064], [.80, .13, .06], [.825, .1, .05], [.845, .05, .038], [.86, .03, .03], [.885, .03, .03]];
const bodyR = y => { for (let i = 0; i < BODY.length - 1; i++) { const a = BODY[i], b = BODY[i + 1]; if (y <= b[0]) { const k = (y - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; } } return [.03, .03]; };
const LEG = [[.052, .52, .062], [.078, .28, .046], [.092, .03, .036]], ARM = [[.128, .805, .04], [.178, .625, .032], [.222, .455, .026]];
const limb = (r, chain, s, out) => { const u = r() * (chain.length - 1), i = Math.min(chain.length - 2, Math.floor(u)), k = u - i, a = chain[i], b = chain[i + 1], x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, rr = a[2] + (b[2] - a[2]) * k, th = r() * 6.283; out[0] = s * x + rr * Math.cos(th); out[1] = y; out[2] = rr * Math.sin(th); };
export function samplePoint(r, out) {
  const u = r();
  if (u < .46) { const y = .50 + r() * .385, [a, b] = bodyR(y), th = r() * 6.283; out[0] = a * Math.cos(th); out[1] = y; out[2] = b * Math.sin(th); }
  else if (u < .56) { const th = r() * 6.283, cp = r() * 2 - 1, sp = Math.sqrt(1 - cp * cp); out[0] = .058 * sp * Math.cos(th); out[1] = .94 + .068 * cp * .86; out[2] = .062 * sp * Math.sin(th); }
  else if (u < .72) limb(r, ARM, r() < .5 ? -1 : 1, out);
  else limb(r, LEG, r() < .5 ? -1 : 1, out);
}
export function dustFigure(n = 240000, seed = 1) {
  const r = rng(seed), P = new Float32Array(n * 3), S = new Float32Array(n * 4), o = [0, 0, 0];
  for (let i = 0; i < n; i++) { samplePoint(r, o); P[i * 3] = o[0]; P[i * 3 + 1] = o[1]; P[i * 3 + 2] = o[2]; S[i * 4] = r(); S[i * 4 + 1] = r(); S[i * 4 + 2] = r(); S[i * 4 + 3] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.BufferAttribute(S, 4)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u = { uT: { value: 0 }, uBreak: { value: 0 }, uPx: { value: H }, uK: { value: 1 }, uScale: { value: 1 }, uBase: { value: new THREE.Vector3() }, uC: { value: new THREE.Color(1, .6, .2) }, uC2: { value: new THREE.Color(1, .82, .5) }, uSz: { value: 1 } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uBreak,uPx,uScale,uSz; uniform vec3 uBase; out float vA; out float vB; void main(){ vec3 p=position; float b=clamp(uBreak*1.6-aS.x*.6,0.,1.); vec3 q=p*uScale; q.x+=b*b*(60.+60.*aS.y)+b*sin(p.y*30.+aS.z*9.)*8.; q.y+=b*(6.+26.*aS.z)*sin(aS.w*6.28); q.z+=b*(sin(aS.y*40.)*30.); q+=vec3(sin(uT*1.2+aS.x*40.),sin(uT*.9+aS.y*40.),sin(uT*1.1+aS.z*40.))*.006*uScale; vec4 mv=viewMatrix*vec4(uBase+q,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.1,(.03+.12*aS.w*aS.w*aS.w)*uPx/(-mv.z)*uSz); vA=(1.-smoothstep(.72,1.,b)); vB=aS.y; }`,
    fragmentShader: `precision highp float; in float vA,vB; uniform vec3 uC,uC2; uniform float uK; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; float f=exp(-dot(d,d)*10.); vec3 c=mix(uC,uC2,vB*vB); O=vec4(c*f*vA*uK,1.); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return { pts, u };
}

// 逆光时用：一整块剪影
export function silhouette() {
  const gs = []; const seg = 30, pos = [], idx = [];
  for (let j = 0; j <= seg; j++) { const y = .50 + j / seg * .385, [a, b] = bodyR(y); for (let i = 0; i <= 24; i++) { const th = i / 24 * 6.283; pos.push(a * Math.cos(th), y, b * Math.sin(th)); } }
  for (let j = 0; j < seg; j++) for (let i = 0; i < 24; i++) { const p = j * 25 + i, q = p + 25; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const body = new THREE.BufferGeometry(); body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); body.setIndex(idx); gs.push(body.toNonIndexed());
  const strip = (chain, s) => { const P = [], n = 12; for (let j = 0; j < chain.length; j++) { const [x, y, r] = chain[j]; for (let i = 0; i <= n; i++) { const th = i / n * 6.283; P.push(s * x + r * Math.cos(th), y, r * Math.sin(th)); } } const I = []; for (let j = 0; j < chain.length - 1; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + n + 1; I.push(a, b, a + 1, a + 1, b, b + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); gs.push(g.toNonIndexed()); };
  [-1, 1].forEach(s => { strip(LEG, s); strip(ARM, s); });
  const h = new THREE.SphereGeometry(1, 16, 12).scale(.058, .0585, .062); h.translate(0, .94, 0); const hh = h.toNonIndexed(); for (const k of Object.keys(hh.attributes)) if (k !== 'position') hh.deleteAttribute(k); gs.push(hh);
  return new THREE.Mesh(mergeGeometries(gs), new THREE.MeshBasicMaterial({ color: 0x050405, side: THREE.DoubleSide }));
}
