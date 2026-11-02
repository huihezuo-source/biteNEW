import * as THREE from 'three';
import { W, H, UI, clamp, ss, seg, E, lerp, rng } from '../core.js';
import { GREEN, RED, drawScreen, camSet } from '../ctx.js';
import { WARM, candleMat } from '../world.js';
import { tag, RED_L, GREEN_L, WHITE } from '../util.js';
import { DATA } from '../data.js';
import { drawRich } from '../text.js';

const P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const night = (pp, e = 1) => { pp.vig = .62; pp.threshold = 1.05; pp.knee = .7; pp.bloom = .16; pp.grain = .02; pp.exposure = e; pp.lift = [0, 0, 0]; pp.ca = .0012; };
const hot = (c, k) => new THREE.Color(c.r * k, c.g * k, c.b * k);

// 红 K 线：盒子本身发光，桌上有倒影
function makeCandles(c) {
  const rets = DATA.eight.slice(1).map((v, i) => v / DATA.eight[i] - 1), S = 74, list = []; let y = .02;
  const mat = candleMat(new THREE.Color(1, .05, .035), 1);
  rets.forEach((r, i) => { const h = r * S + .16, g = new THREE.Group(); const core = new THREE.Mesh(new THREE.BoxGeometry(.3, 1, .3), mat); g.add(core); list.push({ g, core, y, h, x: -.3 + i * .22, z: -.55 - i * .3 }); y += h; });
  const a = new THREE.Group(), b = new THREE.Group(); list.forEach(o => { a.add(o.g); const g2 = o.g.clone(); o.g2 = g2; b.add(g2); });
  c.room.scene.add(a); c.room.under.add(b); c.extras.push(a, b);
  return { a, b, list, top: y };
}

// 上证那天之后的 378 个交易日：一堵真实的墙，地板是那天的收盘价
function makeFloorLine() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020202);
  const a = DATA.apr.closes, n = a.length, c0 = DATA.apr.c0, dx = .17, sy = .0155, pos = new Float32Array(n * 6), hv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i < n; i++) { const x = i * dx, y = (a[i] - c0) * sy; pos.set([x, 0, 0, x, y, 0], i * 6); hv[i * 2] = 0; hv[i * 2 + 1] = 1; if (i < n - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aH', new THREE.BufferAttribute(hv, 1)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uX: { value: 1e3 } },
    vertexShader: `attribute float aH; varying float vH; varying vec3 vP; void main(){ vH=aH; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vH; varying vec3 vP; uniform float uX; void main(){ if(vP.x>uX) discard; float l=smoothstep(.975,1.,vH); float f=pow(vH,3.); vec3 c=vec3(1.,.1,.07)*(f*.55+l*6.); c*=.55+.45*smoothstep(0.,.5,fract(vP.x/.17)); gl_FragColor=vec4(c,1.); }` });
  scene.add(new THREE.Mesh(g, mat));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 60).rotateX(-Math.PI / 2).translate(100, 0, 0), new THREE.ShaderMaterial({ transparent: true,
    vertexShader: `varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.); }`,
    fragmentShader: `varying vec3 vP; void main(){ float l=exp(-abs(vP.z)*9.)*5.; float g=smoothstep(.97,1.,abs(fract(vP.x/1.7)-.5)*2.)*.05+smoothstep(.96,1.,abs(fract(vP.z/1.7)-.5)*2.)*.05; vec3 c=vec3(.05,1.,.5)*(l+g*exp(-abs(vP.z)*.2)); gl_FragColor=vec4(c,1.); }` }));
  scene.add(floor);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(600, .05, .05).translate(280, 0, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(.1, 2.2, 1) })); scene.add(bar);
  return { scene, mat, dx, n, sy, len: (n - 1) * dx };
}

// 粒子大眼：有人盯着你的账户
function makeEye() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); const n = 5200, r = rng(9), p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const q = r(); let x, y;
    if (q < .42) { const a = r() * Math.PI * 2, R = 1.05 + .55 * r() ** .7; x = Math.cos(a) * R; y = Math.sin(a) * R; s[i] = 1; }           // 虹膜
    else { const u = -1 + 2 * r(), up = r() < .5 ? 1 : -1, e = (1 - u * u); x = u * 4.3; y = up * e * 1.95 + (r() - .5) * .1; s[i] = 2; }    // 眼睑
    p.set([x, y, (r() - .5) * .3], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uOpen: { value: 0 }, uPx: { value: H / 960 }, uLook: { value: 0 }, uT: { value: 0 } },
    vertexShader: `attribute float aS; uniform float uOpen,uPx,uLook,uT; varying float vS; void main(){ vec3 q=position; vS=aS; if(aS<1.5){ float a=atan(q.y,q.x); q.xy*=1.+.03*sin(a*9.+uT); q.x+=uLook; } else q.y*=uOpen; float fade=aS<1.5?smoothstep(0.,.3,uOpen):1.; if(aS<1.5&&abs(q.y)>1.95*(1.-pow(q.x/4.3,2.))*uOpen) fade=0.; vS=fade; vec4 mv=modelViewMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPx*3.4*(aS<1.5?1.:1.5); }`,
    fragmentShader: `varying float vS; void main(){ if(vS<.01) discard; float d=length(gl_PointCoord-.5)*2.; gl_FragColor=vec4(vec3(.1,1.,.5)*exp(-d*d*3.)*1.5*vS,1.); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(.84, 48), new THREE.MeshBasicMaterial({ color: 0 })); pupil.position.z = .3; scene.add(pupil);
  const cam = new THREE.PerspectiveCamera(30, W / H, .1, 100);
  return { scene, mat, cam, pupil };
}

// 一颗骰子：运气差
function makeDie() {
  const m = new THREE.MeshStandardMaterial({ color: 0xd9dedc, roughness: .3 }), pip = new THREE.MeshBasicMaterial({ color: 0x050505 }), g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5, 4, 4, 4), m); g.add(box);
  const F = { '0,1,0': [[0, 0]], '0,-1,0': [[-1, -1], [1, 1], [-1, 1], [1, -1], [-1, 0], [1, 0]], '1,0,0': [[-1, -1], [1, 1]], '-1,0,0': [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]], '0,0,1': [[-1, -1], [0, 0], [1, 1]], '0,0,-1': [[-1, -1], [1, 1], [-1, 1], [1, -1]] };
  for (const [k, ps] of Object.entries(F)) { const [a, b, c] = k.split(',').map(Number), n = new THREE.Vector3(a, b, c); for (const [u, v] of ps) { const d = new THREE.Mesh(new THREE.CircleGeometry(.042, 18), pip); d.lookAt(n); d.position.copy(n).multiplyScalar(.2505); const X = new THREE.Vector3(b, c, a), Y = new THREE.Vector3().crossVectors(n, X); d.position.addScaledVector(X, u * .13).addScaledVector(Y, v * .13); g.add(d); } }
  return g;
}

// 夜城：每扇窗后面都有一个人在看手机
function makeNight() {
  const n = 2600, r = rng(31), box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), mat = new THREE.ShaderMaterial({ uniforms: { uRed: { value: 0 } },
    vertexShader: `varying vec3 vW,vS,vN; varying float vI; void main(){ vec4 w=instanceMatrix*vec4(position,1.); vW=w.xyz; vec3 s=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz)); vS=position*s; vN=normal; vI=instanceMatrix[3].x*1.7+instanceMatrix[3].z*3.1; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; varying vec3 vW,vS,vN; varying float vI; uniform float uRed;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){ if(vN.y>.5){ gl_FragColor=vec4(vec3(.002),1.); return; }
  vec2 uv=abs(vN.x)>.5?vec2(vS.z,vS.y):vec2(vS.x,vS.y); vec2 g=uv*vec2(1.5,1.2); vec2 id=floor(g), f=fract(g);
  float win=step(.16,f.x)*step(f.x,.84)*step(.2,f.y)*step(f.y,.8); float on=step(.56,h(id+vI));
  float d=length(vW.xz); float wave=smoothstep(d-22.,d+22.,uRed*420.-40.);
  vec3 col=mix(vec3(.05,1.,.46),vec3(1.,.1,.07),wave)*(1.2+2.*h(id*1.7+vI));
  float fog=exp(-length(vW-cameraPosition)*.0028);
  vec3 c=vec3(.012,.016,.02)*(.5+.5*vS.y/40.)+col*win*on; gl_FragColor=vec4(c*fog,1.); }` });
  const mesh = new THREE.InstancedMesh(box, mat, n), M = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const a = r() * 6.283, R = 8 + 210 * Math.sqrt(r()), w = 5 + r() * 7, h = 8 + r() * r() * 70 * Math.exp(-R / 150); M.makeScale(w, i === 0 ? 40 : h, w); M.setPosition(i === 0 ? 0 : Math.cos(a) * R, 0, i === 0 ? 0 : Math.sin(a) * R); mesh.setMatrixAt(i, M); }
  mesh.frustumCulled = false; const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000305); scene.add(mesh);
  return { scene, mat, cam: new THREE.PerspectiveCamera(36, W / H, .1, 900) };
}

// 三年峡谷：两壁是 727 个交易日的真实 K 线
function makeCanyon() {
  const a = DATA.sep.closes, n = a.length, lo = 2600, sy = .017, dz = .46, scene = new THREE.Scene(); scene.background = new THREE.Color(0x010302);
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, -.5, 0), mat = new THREE.ShaderMaterial({ uniforms: { uFog: { value: .05 } },
    vertexShader: `attribute float aU; varying float vU; varying vec3 vL,vW,vN; void main(){ vec4 w=instanceMatrix*vec4(position,1.); vW=w.xyz; vL=position; vU=aU; vN=normal; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying float vU; varying vec3 vL,vW,vN; uniform float uFog; void main(){ vec3 c=vU>.5?vec3(.03,.62,.3):vec3(.02,.95,.4); float top=step(.5,vN.y); float g=exp(vL.y*5.); vec3 col=c*(top*3.2+(1.-top)*(.04+g*.9)); col*=exp(-length(vW-cameraPosition)*uFog); gl_FragColor=vec4(col,1.); }` });
  const m2 = 2, mesh = new THREE.InstancedMesh(box, mat, n * m2), M = new THREE.Matrix4(), aU = new Float32Array(n * m2);
  const Y = i => (a[Math.min(n - 1, Math.max(0, Math.round(i)))] - lo) * sy;
  for (let i = 0; i < n; i++) { const up = i && a[i] >= a[i - 1]; for (const [k, sx] of [[0, -1], [1, 1]]) { const j = i * 2 + k; M.makeScale(1.5, 9, dz * .78); M.setPosition(sx * 2.3, Y(i) + (i ? Math.abs(a[i] - a[i - 1]) * sy * .5 : 0), -i * dz); mesh.setMatrixAt(j, M); aU[j] = up ? 1 : 0; } }
  box.setAttribute('aU', new THREE.InstancedBufferAttribute(aU, 1)); mesh.frustumCulled = false; scene.add(mesh);
  // 尽头：六根红柱，涨多少长多少
  const cs = DATA.sep.after, reds = [], S = .0118, yEnd = Y(n - 1), zEnd = -(n + 16) * dz, cm = candleMat(new THREE.Color(1, .05, .035), 1);
  for (let i = 1; i < 7; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(.4, 1, .4), cm); g.position.set(-1.05 + (i - 1) * .46, 0, zEnd); g.visible = false; scene.add(g); reds.push({ g, y0: yEnd + (cs[i - 1] - cs[0]) * S, h: (cs[i] - cs[i - 1]) * S + .1 }); }
  const base = new THREE.Mesh(new THREE.BoxGeometry(40, .03, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color(.1, 2, .9) })); base.position.set(0, yEnd, zEnd); scene.add(base);
  return { scene, mat, cam: new THREE.PerspectiveCamera(46, W / H, .05, 500), n, dz, Y, reds, zEnd };
}

export function midShots(c) {
  const { room, ph, cam, V } = c, cd = makeCandles(c), fl = makeFloorLine(), eye = makeEye(), nc = makeNight(), cy = makeCanyon(), die = makeDie(), die2 = die.clone(); room.scene.add(die); room.under.add(die2); c.extras.push(die, die2);
  const fc = new THREE.PerspectiveCamera(40, W / H, .05, 300);
  return [
    // 涨了：你走了，红柱从桌上冲出去
    { a: 19.3, scene: room.scene, samples: 8, samplesDraft: 2,
      update(t, l, pp) { c.only(cd.a, cd.b); c.noFinger(); c.layPhone(); drawScreen('sold', 0); night(pp, 1.08); pp.bloom = .3;
        const tw = i => i === 0 ? 19.4 : i === 1 ? 20.9 : 22.8 + (i - 2) * .26; let top = .02, hi = 0;
        cd.list.forEach((o, i) => { const k = E.out4(seg(t, tw(i), tw(i) + .5)); const h = Math.max(.001, o.h * k); for (const g of [o.g, o.g2]) { g.position.set(o.x, o.y + h / 2, o.z); g.scale.set(1, h, 1); g.visible = k > 0; } if (k > 0) { top = o.y + h; hi = i; } });
        const o = cd.list[hi]; const glow = 1.5 + ss(22.8, 24.5, t) * .8; c.poseCommon(t, RED, 0); room.U.uLift.value = 1; room.U.uPos.value.set(o.x, Math.min(top, 3) * .5, o.z); room.U.uN.value.set(0, 1, 0); room.U.uCol.value.copy(RED); room.U.uPow.value = glow; ph.scr.color.setRGB(.5, .5, .5);
        const k = E.io3(seg(t, 22.4, 24.8)); const q = P([1.1, .95, 5.4], [1.5, 2.4, 8.2], k); camSet(cam, q, P([.1, .78, -.6], [.5, 2.05, -1.6], k), 28, .03 - k * .06); pp.aperture = .006; pp.focus = 6; return cam; } },
    // 那天的收盘价成了地板
    { a: 24.75, scene: fl.scene, samples: 8, samplesDraft: 2, label(x, t) { const a = ss(25, 25.5, t) * (1 - ss(27.8, 28.1, t)); tag(x, '4 月 7 日收盘 3,096', W / 2, 1210 * UI, { size: 60, color: GREEN_L, alpha: a, shadow: 18 }); },
      update(t, l, pp) { night(pp, 1.1); pp.bloom = .2; const k = E.io2(seg(t, 24.75, 28.2)); fl.mat.uniforms.uX.value = lerp(1, fl.len + 1, E.out2(seg(t, 24.8, 27.6)));
        const x = lerp(-4, fl.len - 22, k), yy = lerp(3.6, 6, k); camSet(fc, [x, yy + .6, 25], [x + 12, yy, 0], 34, -.03); return fc; } },
    // 我一卖就涨：黑屏的手机上，S 之后全是红的
    { a: 28.15, scene: room.scene, samples: 8, samplesDraft: 2,
      update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); drawScreen('after', seg(t, 28.2, 29.8)); c.poseCommon(t, RED, .55); night(pp, 1.05); const k = E.io2(seg(t, 28.15, 30.3)); const q = P([.34, 2.15, 1.05], [.1, 1.72, .62], k); camSet(cam, q, [.02, .03, 0], 31, .05); return cam; } },
    // 有人盯着你的账户
    { a: 30.15, scene: eye.scene, samples: 6, samplesDraft: 2, update(t, l, pp) { night(pp, 1.1); pp.bloom = .3; const u = eye.mat.uniforms; u.uOpen.value = E.out3(seg(t, 30.3, 31.1)) * (1 - E.in3(seg(t, 32.1, 32.46))); u.uT.value = t; u.uLook.value = Math.sin(t * 1.2) * .25; eye.pupil.position.x = u.uLook.value; eye.pupil.visible = u.uOpen.value > .3; camSet(eye.cam, [0, 0, 24 - l * 1.6], [0, 0, 0], 30); return eye.cam; } },
    // 运气差：一颗骰子
    { a: 32.45, scene: room.scene, samples: 8, samplesDraft: 2,
      update(t, l, pp) { c.only(die, die2); c.noFinger(); c.layPhone(); drawScreen('sold', 0); c.poseCommon(t, GREEN, .34); night(pp, 1.1); const k = seg(l, 0, 1.15), e = E.out3(k);
        const b = Math.abs(Math.cos(k * 7.5)) * (1 - k) ** 2 * 1.2; const y = .25 + b, px = lerp(-1.7, .86, e), pz = lerp(-.3, .5, e), rx = (1 - e) * 11, rz = (1 - e) * -8;
        for (const d of [die, die2]) { d.position.set(px, y, pz); d.rotation.set(rx, .4, rz); }
        room.U.uPos.value.set(.5, .6, .4); room.U.uPow.value = .9; room.U.uCol.value.setRGB(.8, .9, .85); room.key.color.setRGB(.8, .9, .85); room.key.intensity = 5; room.key.position.set(.6, 1.6, .9);
        camSet(cam, [1.9, 2.3, 3.4], [.5, .2, .3], 24, -.04); pp.aperture = .008; pp.focus = 4.1; return cam; } },
    // 每个炒股的人：从一扇窗拉到整座城
    { a: 34.45, scene: nc.scene, samples: 8, samplesDraft: 2, update(t, l, pp) { night(pp, 1.15); pp.bloom = .26; const k = seg(l, 0, 3); nc.mat.uniforms.uRed.value = ss(.3, 2.9, l);
        const e = E.in2(k) * .8 + k * .2, cp = P([0, 22, 8], [30, 95, 330], e), lk = P([0, 22, 5], [0, 26, -40], E.io2(k)); camSet(nc.cam, cp, lk, 36, .02); return nc.cam; } },
    // 三年：穿过 727 根 K 线，走到底才卖
    { a: 37.45, scene: cy.scene, samples: 10, samplesDraft: 3, disc: 1, update(t, l, pp) { night(pp, 1.1); pp.bloom = .22; const k = E.io2(seg(t, 37.45, 41.1)), i = k * (cy.n - 1), z = -i * cy.dz, y = cy.Y(i) + 1.3, big = E.io2(seg(t, 44, 46.7));
        cy.reds.forEach((o, j) => { const tj = j === 0 ? 41.5 : 44 + (j - 1) * .36, h = Math.max(.001, o.h * E.out4(seg(t, tj, tj + .5))); o.g.scale.set(1, h, 1); o.g.position.y = o.y0 + h / 2; o.g.visible = t > tj; });
        const ze = cy.zEnd, yE = cy.Y(cy.n - 1), ag = E.out3(seg(t, 41.15, 41.5));
        if (t < 41.15) camSet(cy.cam, [0, y, z], [0, y - .1, z - 8], 46, Math.sin(t * 1.1) * .03);
        else camSet(cy.cam, [.4, yE + 1.4 + big * 3.2, ze + lerp(7.5, 6.4, ag) + big * 9.5], [0, yE + 1.4 + big * 3.4, ze], 44, .02);
        if (t > 41.5) pp.fx = [{ fx: 'rays', k: .9 + big * 1.1, c: [.54, .62 - big * .06], decay: .97, thr: .7, col: [1, .16, .1] }];
        return cy.cam; },
      label(x, t) { if (t < 37.8) return; const a = ss(37.9, 38.3, t) * (1 - ss(40.2, 40.6, t)); tag(x, '2021 — 2024', W / 2, 300 * UI, { size: 60, color: WHITE, alpha: a, shadow: 18, family: 'JB' }); const sa = ss(40.3, 40.6, t) * (1 - ss(41.1, 41.3, t)); if (sa > 0) { x.save(); x.globalAlpha = sa; x.fillStyle = WHITE; x.beginPath(); x.arc(W / 2, 800 * UI, 92 * UI, 0, 7); x.fill(); x.fillStyle = '#033'; x.font = `900 ${104 * UI}px NSans`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('卖', W / 2, 804 * UI); x.restore(); } const v = t < 44 ? 4.15 : lerp(4.15, 26.95, seg(t, 44, 46.4)); const b = ss(41.5, 41.9, t); if (b > 0) tag(x, `+${v.toFixed(0)}%`, W / 2, 300 * UI, { size: 210, color: RED_L, alpha: b, weight: 900, family: 'JB', shadow: 30 }); } },
  ];
}
