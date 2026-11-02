import * as THREE from 'three';
import { N, R, HERO, kAt, lnU, lnD, bits } from '../sim.js';
import { Y0, DY, R0, FLOOR_Y, U, tintOf, xAt, STUDIO } from '../machine.js';
import { curve } from '../flow.js';
import { camSet, proj, tag, topShade, WHITE, RED_L, GREEN_L } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E, rng, QUALITY } from '../core.js';
import { B } from '../script.js';

const F0 = B(49.3), F1 = 104.2, F2 = 107.9, F3 = 110.9, F4 = B(56) + 1.6;
// 所有路都在格阵的边上：一条边的亮度 = 走过它的人数
function makeFan() {
  const cnt = new Float32Array((R + 1) * (R + 1) * 2);
  for (let i = 0; i < N; i++) for (let n = 0; n < R; n++) { const k = kAt[i * (R + 1) + n], b = bits[i * R + n]; cnt[(n * (R + 1) + k) * 2 + b] += 1; }
  const pos = [], col = [], row = [];
  const a = lnU(1), d = lnD(1);
  for (let n = 0; n < R; n++) for (let k = 0; k <= n; k++) for (let b = 0; b < 2; b++) { const c = cnt[(n * (R + 1) + k) * 2 + b]; if (!c) continue;
    const x0 = xAt(n, k), y0 = Y0 - n * DY, x1 = xAt(n + 1, k + b), y1 = Y0 - (n + 1) * DY, l = k * a + (n - k) * d; const t = tintOf(l * 1.2), w = 3.2 * Math.pow(c / 700, .55);
    const rgb = [lerp(1, t[0], t[3]), lerp(1, t[1], t[3]), lerp(1, t[2], t[3])];
    pos.push(x0, y0, .02, x1, y1, .02); col.push(...rgb, w, ...rgb, w); row.push(n, n + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('col', new THREE.BufferAttribute(new Float32Array(col), 4)); g.setAttribute('row', new THREE.BufferAttribute(new Float32Array(row), 1));
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`precision highp float; in vec3 position; in vec4 col; in float row; uniform mat4 viewMatrix,projectionMatrix; out vec4 vC; out float vR; void main(){ vC=col; vR=row; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec4 vC; in float vR; uniform float uRow,uK; out vec4 O; void main(){ if(vR>uRow) discard; O=vec4(vC.rgb*min(vC.a,3.)*uK,1.); }`,
    uniforms: { uRow: { value: 0 }, uK: { value: 1 } } });
  const mesh = new THREE.LineSegments(g, m); mesh.frustumCulled = false; mesh.renderOrder = 4;
  // 他那条路：一串细长的四边形，够粗
  const hp = []; for (let n = 0; n < R; n++) { const k0 = kAt[HERO * (R + 1) + n], k1 = kAt[HERO * (R + 1) + n + 1]; hp.push([xAt(n, k0), Y0 - n * DY], [xAt(n + 1, k1), Y0 - (n + 1) * DY]); }
  const hv = [], hrow = []; const W_ = .1; for (let i = 0; i < hp.length; i += 2) { const [x0, y0] = hp[i], [x1, y1] = hp[i + 1], nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny), ax = nx / L * W_, ay = ny / L * W_; hv.push(x0 - ax, y0 - ay, .03, x0 + ax, y0 + ay, .03, x1 + ax, y1 + ay, .03, x0 - ax, y0 - ay, .03, x1 + ax, y1 + ay, .03, x1 - ax, y1 - ay, .03); const n = i / 2; hrow.push(n, n, n + 1, n, n + 1, n + 1); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hv), 3)); hg.setAttribute('row', new THREE.BufferAttribute(new Float32Array(hrow), 1));
  const hm = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`precision highp float; in vec3 position; in float row; uniform mat4 viewMatrix,projectionMatrix; out float vR; void main(){ vR=row; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in float vR; uniform float uRow,uK; out vec4 O; void main(){ if(vR>uRow) discard; O=vec4(vec3(5.)*uK,1.); }`, uniforms: { uRow: { value: 0 }, uK: { value: 0 } } });
  const hero = new THREE.Mesh(hg, hm); hero.frustumCulled = false; hero.renderOrder = 5;
  const grp = new THREE.Group(); grp.add(mesh, hero); return { grp, m, hm };
}
// A 股也排成一队：4052 颗球，体积按 30 年回报，从小到大。分布按论文的均值和中位数校准
const CN = 4052, ZQ = 120;
function makeAQ() {
  const r = rng(1991), z = []; for (let i = 0; i < CN; i++) { const u = 1 - r(), v = r(); z.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(6.28318 * v)); }
  z.sort((a, b) => a - b); const mu = Math.log(1.1879), sg = 1.39;
  const rr = z.map((q, j) => { const tail = Math.max(0, (j - .95 * CN) / (.05 * CN)); return R0 * Math.cbrt(Math.exp(mu + sg * q + 4.2 * tail ** 3)) * 1.6; }), x = new Float32Array(CN); let c = 0;
  for (let j = 1; j < CN; j++) { c += (rr[j - 1] + rr[j]) * .94; x[j] = c; }
  return { rr, x, L: c };
}
export function fanShots(c) {
  const { scene, balls, cam, plate, pegs, floor } = c;
  const fan = makeFan(); fan.grp.visible = false; scene.add(fan.grp); c.extras.push(fan.grp);
  const sh = [];
  sh.push({ a: F0, scene, samples: 8,
    update(t, l, pp) { c.setRoom(0, 0, 0); c.show({ only: [fan.grp] }); pp.vig = .3; pp.threshold = 1.; pp.bloom = .16; pp.lift = [0, 0, 0]; const k = E.out3(seg(t, F0, F0 + 1.5)), q = seg(t, F0 + 1.3, F1 - .5);
      fan.m.uniforms.uRow.value = 100 * k; fan.m.uniforms.uK.value = lerp(.62, .13, ss(.1, .7, q)); fan.hm.uniforms.uRow.value = 110 * E.io2(ss(0, .85, q)); fan.hm.uniforms.uK.value = 1;
      camSet(cam, [-2.2, Y0 - 21, 96 - 4 * seg(t, F0, F1)], [-2.2, Y0 - 21, 0], 24); return cam; },
    label(x, t) { const a = ss(F0 + .1, F0 + .5, t); const q = ss(F0 + 1.6, F0 + 2.1, t); tag(x, '一万条路', W / 2, 96 * UI, { size: 66, color: WHITE, alpha: a * (1 - q), shadow: 14 }); tag(x, '你走这一条', W - 70 * UI, 420 * UI, { size: 72, color: WHITE, alpha: q, shadow: 14, align: 'right', weight: 900 }); } });
  // A 股那一队：飞过“大盘”这道门
  const Q = makeAQ(), GATE_J = Math.round(.761 * CN), TOP_J = Math.round(.95 * CN), X0 = -Q.L * .5;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.7, .05, 16, 96, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5) })); arch.position.set(X0 + Q.x[GATE_J], FLOOR_Y, ZQ); arch.rotation.y = Math.PI / 2; arch.visible = false; scene.add(arch); c.extras.push(arch);
  const xOf = u => { const j = clamp(u * (CN - 1), 0, CN - 1), a = Math.floor(j), b = Math.min(CN - 1, a + 1); return X0 + lerp(Q.x[a], Q.x[b], j - a); };
  const put = (t, dim = 0, allGreen = 0) => { const grn = tintOf(-6), red = tintOf(6); for (let j = 0; j < CN; j++) { const isRed = j >= GATE_J && !(allGreen && j < TOP_J), a = isRed ? red : grn, d = dim * (j >= TOP_J ? 0 : .92); balls.set(j, X0 + Q.x[j], FLOOR_Y + Q.rr[j], ZQ, Q.rr[j], a[0] * (1 - d), a[1] * (1 - d), a[2] * (1 - d), 1); } balls.commit(CN); };
  const nightQ = pp => { pp.vig = .36; pp.threshold = 1.5; pp.bloom = .12; pp.lift = [0, 0, 0]; pp.sat = 1.18; pp.exposure = 1.2; };
  const setQ = (dim = 0, ag = 0) => { c.setRoom(.4, .03, 1.5); c.show({ balls: 1, ballShadow: 0, mirror: 1, fill: .26, only: [floor, arch] }); put(0, dim, ag); };
  // 贴着队伍看：近处的球擦着镜头走，远处越排越大
  const qCam = (u, d) => { const xc = xOf(u) + d, j = Math.round(clamp(u, 0, 1) * (CN - 1)), rn = Q.rr[j]; return camSet(cam, [xc - 2.2 - rn * 2, FLOOR_Y + .34 + rn * 1.5, ZQ + 1.1 + rn * 2.2], [xc + 5 + rn * 3, FLOOR_Y + .2 + rn * 1.5, ZQ - .4], 58, .04); };
  const head = (x, big, small, col, a = 1, size = 140) => { topShade(x, 400, .62); tag(x, big, W / 2, 275 * UI, { size, color: col, weight: 900, alpha: a, shadow: 14 }); tag(x, small, W / 2, 130 * UI, { size: 72, color: WHITE, alpha: a, shadow: 14 }); };
  const A1 = F1, A2 = 106, A3 = F2, A4 = F3, A5 = 113;
  sh.push({ a: A1, scene, samples: 10, subDark: .8,
    update(t, l, pp) { setQ(); nightQ(pp); qCam(.05, seg(t, A1, A2) * 9); return cam; },
    label(x, t) { head(x, '4,052 只', 'A 股，30 年', WHITE); } });
  sh.push({ a: A2, scene, samples: 10, subDark: .8,
    update(t, l, pp) { setQ(); nightQ(pp); const xc = xOf(lerp(.6, .745, seg(t, A2, A3))), rn = .3; camSet(cam, [xc + 2.6, FLOOR_Y + .5 + rn, ZQ + 1.7], [xc - 7, FLOOR_Y + .34 + rn, ZQ - .5], 58, -.05); return cam; },
    label(x, t) { head(x, `${(lerp(.6, .761, E.out2(seg(t, A2, A3 - .85))) * 100).toFixed(1)}%`, '跑输大盘', GREEN_L); } });
  sh.push({ a: A3, scene, samples: 10, subDark: .8,
    update(t, l, pp) { setQ(); nightQ(pp); const xc = xOf(.75) + E.io2(seg(t, A3, A4 - .2)) * 34; camSet(cam, [xc - 4, FLOOR_Y + 1.55, ZQ + .02], [xc + 26, FLOOR_Y + 1, ZQ], 50); return cam; },
    label(x, t) { const q = proj(cam, X0 + Q.x[GATE_J], FLOOR_Y + 2.7, ZQ), p = ss(A3 + .9, A3 + 1.3, t); if (t < A3 + 1.1) tag(x, '大盘', q[0], q[1] - 54 * UI, { size: 84, color: WHITE, weight: 900, alpha: 1 - p, shadow: 16 }); head(x, '23.9%', '跑赢大盘', RED_L, p, 150); } });
  sh.push({ a: A4, scene, samples: 10, subDark: .8,
    update(t, l, pp) { setQ(ss(A4, A4 + .5, t)); nightQ(pp); const xe = X0 + Q.L, q = E.io2(seg(t, A4, A5)); camSet(cam, [xe - lerp(70, 26, q), FLOOR_Y + 3.4, ZQ + lerp(13, 17, q)], [xe - lerp(40, 8, q), FLOOR_Y + 3, ZQ], 36); return cam; },
    label(x, t) { head(x, '+121.6%', '最好的 5%', RED_L, ss(A4, A4 + .3, t), 150); } });
  sh.push({ a: A5, scene, samples: 10, subDark: .8,
    update(t, l, pp) { setQ(0, 1); nightQ(pp); const k = seg(t, A5, B(56) + 1.6), xc = xOf(.2) + k * 16; camSet(cam, [xc + 14, FLOOR_Y + 5.5 + k, ZQ + 9], [xc - 18, FLOOR_Y + .4, ZQ], 44, .06); return cam; },
    label(x, t) { head(x, '−21.6%', '其余 95%', GREEN_L, ss(A5 + .5, A5 + 1, t), 150); } });
  return sh;
}
