import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { B } from '../script.js';
import { SSE } from '../sse.js';
import { big, label, topDark } from './board.js';
import { textPlane, waterText } from '../text.js';
import { REFLECT_ONLY } from '../lake.js';

// 真实上证指数的金色极光：上边缘就是 8751 天的收盘
const Y0 = 1990.96, Y1 = 2026.83, SX = 8.6, SY = .032;
const X = y => (y - (Y0 + Y1) / 2) * SX, Hh = c => c * SY;
export function ridgeShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G); const Z = -40;
  const n = SSE.length, pos = new Float32Array(n * 6), aV = new Float32Array(n * 2), aH = new Float32Array(n * 2), aUp = new Float32Array(n * 2), idx = [];
  SSE.forEach(([y, c], i) => { const x = X(y), h = Hh(c); pos.set([x, 0, Z, x, h, Z], i * 6); aV[i * 2] = 0; aV[i * 2 + 1] = 1; aH[i * 2] = aH[i * 2 + 1] = h; const w = 45, c0 = SSE[Math.max(0, i - w)][1], c1 = SSE[Math.min(n - 1, i + w)][1]; aUp[i * 2] = aUp[i * 2 + 1] = clamp((c1 / c0 - 1) * 14 + .5, 0, 1); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setAttribute('aH', new THREE.BufferAttribute(aH, 1)); g.setAttribute('aUp', new THREE.BufferAttribute(aUp, 1)); g.setIndex(idx);
  const u = { uT: { value: 0 }, uRev: { value: 1 }, uHot: { value: 0 } };
  const curtain = new THREE.Mesh(g, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: u,
    vertexShader: `in float aV,aH,aUp; out float vV,vH,vUp; out vec3 vW; void main(){ vV=aV; vH=aH; vUp=aUp; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in float vV,vH,vUp; in vec3 vW; out vec4 O; uniform float uT,uRev; ${GLSL_NOISE}
    void main(){ if(vW.x>uRev) discard; float y=vW.y; float d=vH-y; float crest=exp(-d*d*2.2)*3.6+exp(-d*.16)*1.1; float n=fbm(vec2(vW.x*.14,vW.y*.05-uT*.25),4); float fine=.62+.38*sin(vW.x*5.)*sin(vW.x*1.7+1.);
      vec3 lo=mix(vec3(.03,.8,.3),vec3(1.,.09,.05),vUp),hi=mix(vec3(.3,1.,.6),vec3(1.,.42,.24),vUp); vec3 c=mix(lo,hi,clamp(crest*.4,0.,1.))*(crest*(.8+.5*n)+pow(vV,1.5)*.34*n*fine); float tip=smoothstep(4.,0.,uRev-vW.x); c+=vec3(1.,.86,.56)*tip*2.2*exp(-d*.1); O=vec4(c,1.); }` }));
  curtain.frustumCulled = false; curtain.layers.set(REFLECT_ONLY); G.add(curtain);
  // 6092 的水平线：从山顶一直拉到今天
  const pk = SSE.reduce((a, b) => b[1] > a[1] ? b : a), px = X(pk[0]), py = Hh(pk[1]), ex = X(SSE[n - 1][0]), ey = Hh(SSE[n - 1][1]);
  const lg = new THREE.PlaneGeometry(1, 1.7); lg.translate(.5, 0, 0);
  const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .96, .9).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); const line = new THREE.Mesh(lg, lineM); line.position.set(px, py, Z + .1); line.layers.set(REFLECT_ONLY); G.add(line);
  // 数字只在水里
  const yrs = [[1990, Y0], [2007, 2007.8], [2015, 2015.45], [2026, Y1 - .8]].map(([s_, y]) => { const m = waterText(String(s_), { size: 120, weight: 600, family: 'LoraV', color: '#FFE3B0', height: 34, gain: 1.6, additive: false }); m.position.set(X(y), 26, Z + .3); m.userData.x = X(y); G.add(m); return m; });
  const flat = (s_, o) => { const m = textPlane(s_, { size: 170, weight: 700, family: 'LoraV', height: 44, gain: 2.1, additive: false, ...o }); m.layers.set(REFLECT_ONLY); G.add(m); return m; };
  const tPk = flat('6,092', { color: '#FFE9D0' }); tPk.position.set(px + 46, py - 16, Z + .3); const tNow = flat('3,681', { color: '#2EE08A' }); tNow.position.set(ex - 24, ey + 58, Z + .3); const tDate = flat('2026 年 10 月 28 日', { size: 90, family: 'NSans', color: '#F2EADC', height: 22, gain: 1.7 }); tDate.position.set(ex - 24, ey + 34, Z + .3); const endDot = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(.2, 1, .55).multiplyScalar(2.4), toneMapped: false })); endDot.position.set(ex, ey, Z + .4); endDot.layers.set(REFLECT_ONLY); G.add(endDot);
  const look = new THREE.Vector3();
  // 水里的曲线是倒着的：像翻牌一样把画面翻过来，才读得出山顶和今天
  const flipAt = (t, pp) => { const q = E.io2(seg(t, B(58) - .16, B(58) + .16)); pp.flip = t < B(60) ? lerp(1, -1, q) : 1; };
  const com = t => { ctx.hideOthers(G); curtain.layers.set(REFLECT_ONLY); tPk.visible = false; tNow.visible = false; tDate.visible = false; endDot.visible = false; yrs.forEach(m => { m.visible = false; }); fu.uA.value = 0; sky.u.uMoon.value.set(.2, .9, -.4).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = .9; lake.u.uGlit.value = 0; ctx.lakeCommon(t); u.uT.value = t; sky.u.uHor.value.setRGB(.06, .095, .16); lake.u.uHorC.value.setRGB(.06, .095, .16); lake.u.uChop.value = .45; lake.u.uDist.value = .022; lake.u.uMirror.value = .92; lake.setRipples([[-30, Z + 170, B(56), 2.4], [40, Z + 150, B(57), 2.2], [px + 50, Z + 140, B(58.5), 2.2], [px + 110, Z + 120, B(59.4), 2.2]]); };
  const bl = pp => { pp.bloom = .28; pp.threshold = .8; pp.vig = .5; pp.exposure = 1.1; pp.sat = 1.12; };
  const s1 = {
    a: B(56), b: B(58), scene: world, samples: 8, samplesDraft: 3, subDark: .84,
    update(t, uu, pp) {
      com(t); lineM.opacity = 0; const k = seg(t, B(56), B(57.7)); u.uRev.value = lerp(X(Y0) + 20, ex + 8, E.out2(k));
      const c = E.io2(seg(t, B(56), B(58))); yrs.forEach(m => { m.visible = u.uRev.value > m.userData.x; }); cam.position.set(lerp(-10, 10, c), lerp(24, 30, c), Z + lerp(640, 600, c)); look.set(0, -86, Z); flipAt(t, pp); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 36; cam.near = 1; cam.far = 20000; cam.updateProjectionMatrix();
      bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(58), b: B(59), scene: world, samples: 8, samplesDraft: 3, subDark: .84,
    update(t, uu, pp) {
      com(t); u.uRev.value = 9999; lineM.opacity = 0; tPk.visible = true; tPk.material.opacity = ss(B(58), B(58.25), t); const k = E.out3(seg(t, B(58), B(59))); cam.position.set(px + lerp(20, 44, k), lerp(34, 46, k), Z + lerp(360, 330, k)); look.set(px + 40, lerp(-110, -128, k), Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 44; cam.near = 1; cam.far = 20000; cam.updateProjectionMatrix();
      bl(pp); flipAt(t, pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s3 = {
    a: B(59), b: B(60), scene: world, samples: 8, samplesDraft: 3, subDark: .84,
    update(t, uu, pp) {
      com(t); u.uRev.value = 9999; const k = E.io2(seg(t, B(59), B(60))); lineM.opacity = ss(B(59), B(59.2), t); line.scale.x = lerp(.01, ex - px + 2, E.io2(seg(t, B(59), B(59.8))));
      tPk.visible = true; tNow.visible = true; tDate.visible = true; endDot.visible = t > B(59.4); tNow.material.opacity = tDate.material.opacity = ss(B(59.4), B(59.7), t); cam.position.set(lerp(px + 66, px + 96, k), 40, Z + lerp(380, 350, k)); look.set(lerp(px + 66, px + 90, k), -118, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 44; cam.near = 1; cam.far = 20000; cam.updateProjectionMatrix();
      bl(pp); flipAt(t, pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  // 山顶的钱顺着真实曲线往下流
  const ht = new Float32Array(1024); { const a = SSE.findIndex(q => q[0] >= pk[0]); const y0 = pk[0], y1 = 2008.85; for (let i = 0; i < 1024; i++) { const yy = lerp(y0, y1, i / 1023); let j = a; while (j < n - 1 && SSE[j + 1][0] < yy) j++; ht[i] = Hh(SSE[j][1]); } }
  const ta = new THREE.DataTexture(ht, 1024, 1, THREE.RedFormat, THREE.FloatType); ta.minFilter = ta.magFilter = THREE.NearestFilter; ta.needsUpdate = true;
  const fn = 40000, fS = new Float32Array(fn * 4), fP = new Float32Array(fn * 3), r = rng(92); for (let i = 0; i < fn * 4; i++) fS[i] = r();
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fP, 3)); fg.setAttribute('aS', new THREE.BufferAttribute(fS, 4)); fg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const fu = { uT: { value: 0 }, uPx: { value: H }, uA: { value: 0 }, tH: { value: ta }, uX0: { value: px }, uX1: { value: X(2008.85) }, uZ: { value: Z } };
  const flow = new THREE.Points(fg, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: fu,
    vertexShader: /* glsl */`in vec4 aS; uniform sampler2D tH; uniform float uT,uPx,uA,uX0,uX1,uZ; out vec3 vC; void main(){ float l=fract(aS.x+uT*(.16+.12*aS.y)); float h=texture(tH,vec2(l,.5)).r; vec3 p=vec3(mix(uX0,uX1,l)+(aS.z-.5)*1.4,h+(aS.w-.5)*2.+1.2,uZ+(aS.y-.5)*3.); vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.2,(.05+.13*aS.w*aS.w)*uPx/(-mv.z)); vC=mix(vec3(1.,.5,.12),vec3(1.,.86,.52),aS.y)*1.1*uA*smoothstep(0.,.03,l)*(1.-smoothstep(.9,1.,l)); }`,
    fragmentShader: `precision highp float; in vec3 vC; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; O=vec4(vC*exp(-dot(d,d)*11.),1.); }` })); flow.frustumCulled = false; G.add(flow);
  const s4 = {
    a: B(60), b: B(61), scene: world, samples: 8, samplesDraft: 3, subDark: .84,
    update(t, uu, pp) {
      com(t); curtain.layers.set(0); sky.u.uMoonK.value = 0; fu.uT.value = t; fu.uA.value = 1; u.uRev.value = 9999; lineM.opacity = 0; const k = seg(t, B(60), B(61)); cam.position.set(px - 26 + 14 * k, py + 16 - 12 * k, Z + 62 - 6 * k); look.set(px + 26, py * .52, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 58; cam.near = 1; cam.far = 20000; cam.updateProjectionMatrix();
      bl(pp); pp.exposure = 1.1 * (1 - ss(B(60.75), B(61), t) * .8); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  return [s1, s2, s3, s4];
}
