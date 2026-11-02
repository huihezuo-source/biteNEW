import * as THREE from 'three';
import { W, H, UI, clamp, ss, seg, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { GREEN, RED, drawScreen, camSet } from '../ctx.js';
import { tag, RED_L, GREEN_L, WHITE } from '../util.js';
import { candleMat } from '../world.js';
import { night } from './mid.js';
import { DATA } from '../data.js';
import { proj } from '../util.js';

// 2008 年：247 个交易日垒成一座山，山脊就是真实收盘价
function makeRidge() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010203); 
  const a = DATA.y08.closes, n = a.length, dx = .118, sy = .0068, y0 = 1500, m = 36, Z = 26;
  const px = i => i * dx, py = i => (a[i] - y0) * sy, pos = new Float32Array(n * (m + 1) * 3), idx = [];
  const nz = (x, z) => { let s = 0, f = .16, A = 1; for (let k = 0; k < 5; k++) { s += A * Math.sin(x * f * 1.1 + z * f * 1.3 + k * 2.1) * Math.cos(z * f * .9 - x * f * .5 + k * 1.7); f *= 2.1; A *= .5; } return s; };
  for (let i = 0; i < n; i++) for (let j = 0; j <= m; j++) { const v = -1 + 2 * j / m, z = v * Z, d = Math.abs(z), drop = d * (.72 + d * .03), bump = nz(i * dx, z) * clamp(d * .1) * 2.1; pos.set([px(i), py(i) - drop + Math.min(bump, drop * .6), z], (i * (m + 1) + j) * 3); if (i < n - 1 && j < m) { const p = i * (m + 1) + j, q = p + m + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const mountain = new THREE.Mesh(g, new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN,vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normal; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; varying vec3 vN,vW;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){ vec3 n=normalize(vN); if(dot(n,cameraPosition-vW)<0.) n=-n; vec3 L=normalize(vec3(.72,.42,.56)); float d=max(dot(n,L),0.); float r=pow(max(dot(n,normalize(vec3(-.5,.3,.8))),0.),2.);
  vec3 rock=vec3(.05,.12,.095);
  vec3 c=rock*(d*d*3.6+r*.3+.03); float ly=smoothstep(-22.,4.,vW.y-vW.z*.0); c*=.5+.8*ly; c*=exp(-max(0.,vW.z)*.05); c+=vec3(.02,.5,.24)*exp(-abs(vW.z)*1.1)*.7;
  gl_FragColor=vec4(c,1.); }` })); scene.add(mountain);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); front.visible = false;
  const sun = new THREE.DirectionalLight(0x9fe8c6, 3.2); sun.position.set(44, 16, 34); scene.add(sun, sun.target); sun.target.position.set(24, 0, 0);
  scene.add(new THREE.HemisphereLight(0x233a33, 0x000000, .55));
  // 山脊线
  const cg = new Float32Array((n - 1) * 36); for (let i = 0; i < n - 1; i++) { const x = px(i), X = px(i + 1), y = py(i), Y = py(i + 1), w = .05; cg.set([x, y, .02, X, Y, .02, X, Y + w, .02, x, y, .02, X, Y + w, .02, x, y + w, .02, x, y, .02, X, Y + w, .02, X, Y, .02, x, y, .02, x, y + w, .02, X, Y + w, .02], i * 36); }
  const cl = new THREE.BufferGeometry(); cl.setAttribute('position', new THREE.BufferAttribute(cg, 3)); const crest = new THREE.Mesh(cl, new THREE.MeshBasicMaterial({ color: new THREE.Color(.1, 2.2, .95) })); scene.add(crest);
  // 14 盏灯
  const bulb = new THREE.SphereGeometry(.42, 20, 14), lamps = DATA.y08.hits.map((h, i) => { const up = DATA.y08.next[i] > 0, m = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2.2, 2.1) })); m.position.set(px(h), py(h) + .3, .9); scene.add(m); return { m, up, h }; });
  const hi = new THREE.Mesh(new THREE.BoxGeometry(80, .025, .025).translate(40, py(0), .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) })); scene.add(hi);
  return { scene, lamps, hi, px, py, n, L: (n - 1) * dx, cam: new THREE.PerspectiveCamera(32, W / H, .1, 300) };
}

// 天平：放在屋里的桌上，头顶一束白光
function makeScale(c) {
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8cfd2, metalness: .75, roughness: .34 }), g = new THREE.Group(), under = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.045, .07, 2.4, 24).translate(0, 1.2, 0), steel), foot = new THREE.Mesh(new THREE.CylinderGeometry(.5, .56, .08, 40).translate(0, .04, 0), steel);
  const beam = new THREE.Group(); beam.position.y = 2.4; beam.add(new THREE.Mesh(new THREE.BoxGeometry(3.3, .05, .07), steel));
  const mkPan = (sx, col) => { const p = new THREE.Group(); p.position.x = sx * 1.6; const pan = new THREE.Mesh(new THREE.CylinderGeometry(.56, .5, .04, 40).translate(0, -1.36, 0), steel); p.add(pan); for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5, x = Math.cos(a) * .48, z = Math.sin(a) * .48, L = Math.hypot(x, 1.36, z); const r = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, L, 6), steel); r.position.set(x / 2, -.68, z / 2); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-x, 1.36, -z).normalize()); p.add(r); } const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5).translate(0, -1.09, 0), candleMat(col, 1)); p.add(b); return p; };
  const L = mkPan(-1, new THREE.Color(1, .05, .035)), R = mkPan(1, new THREE.Color(.02, .95, .38)); beam.add(L, R); g.add(post, foot, beam);
  const u2 = g.clone(true); c.room.scene.add(g); c.room.under.add(u2); c.extras.push(g, u2);
  return { g, u2, beam, L, R, b2: u2.children[2] };
}

export function lateShots(c) {
  const { room, cam, ph, V } = c, rd = makeRidge(), sc = makeScale(c), P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  return [
    { a: 99.4, scene: rd.scene, samples: 8, samplesDraft: 2, subDark: .7,
      update(t, l, pp) { night(pp, 1.15); pp.vig = .5; pp.bloom = .18; const a = E.io2(seg(t, 98.4, 108)), z = E.io3(seg(t, 109.4, 111.2));
        for (const o of rd.lamps) { const on = ss(105.2 + o.h * .006, 105.4 + o.h * .006, t); o.m.visible = on > .01; o.m.scale.setScalar(on * lerp(1, .2, z)); const r = ss(107.7, 108.1, t); o.m.material.color.copy(r > .5 ? (o.up ? new THREE.Color(3, .25, .16) : new THREE.Color(.1, 3, 1.2)) : new THREE.Color(2, 2.2, 2.1)); }
        rd.hi.visible = t > 103; rd.hi.scale.x = E.out3(seg(t, 103.1, 104.6));
        const f = rd.lamps[3], fx = rd.px(f.h), fy = rd.py(f.h), q0 = P([11, 19, 74], [17, 13, 74], a), l0 = P([13, 12.4, 0], [15, 10.4, 0], a), q = P(q0, [fx + .3, fy + .7, 7.4], z), lk = P(l0, [fx + .25, fy + .25, 0], z);
        camSet(rd.cam, q, lk, 32, lerp(.03, -.02, a)); return rd.cam; },
      label(x, t) { const a = ss(103.3, 103.7, t) * (1 - ss(109.2, 109.6, t)); if (a > 0) tag(x, '早走的人', W * .74, 276 * UI, { size: 60, color: WHITE, alpha: a, shadow: 16 }); const b = ss(100.8, 101.2, t) * (1 - ss(109.2, 109.6, t)); if (b > 0) tag(x, '−65%', W * .72, 930 * UI, { size: 150, color: GREEN_L, alpha: b, weight: 900, family: 'JB', shadow: 26 }); const n = ss(107.8, 108.2, t) * (1 - ss(109.2, 109.6, t)); if (n > 0) { tag(x, '9 涨', W * .3, 1180 * UI, { size: 96, color: RED_L, alpha: n, weight: 900, shadow: 24 }); tag(x, '5 跌', W * .3, 1290 * UI, { size: 96, color: GREEN_L, alpha: n, weight: 900, shadow: 24 }); } const z = ss(111.2, 111.6, t) * (1 - ss(113.4, 113.7, t)); if (z > 0) { const f = rd.lamps[3]; const [ax, ay] = proj(rd.cam, rd.px(f.h), rd.py(f.h), 0), [bx, by] = proj(rd.cam, rd.px(f.h + 1), rd.py(f.h + 1), 0); x.save(); x.globalAlpha = z; x.strokeStyle = '#fff'; x.lineWidth = 4 * UI; x.setLineDash([12 * UI, 10 * UI]); x.beginPath(); x.moveTo(ax - 200 * UI, ay); x.lineTo(ax + 200 * UI, ay); x.moveTo(ax - 200 * UI, by); x.lineTo(ax + 200 * UI, by); x.stroke(); x.restore(); tag(x, '那天卖', ax + 40 * UI, ay + 76 * UI, { size: 66, color: WHITE, alpha: z, shadow: 22, align: 'left' }); tag(x, '第二天卖', ax + 40 * UI, by - 66 * UI, { size: 66, color: RED_L, alpha: z, shadow: 22, align: 'left' }); } } },
    { a: 113.8, scene: room.scene, samples: 8, samplesDraft: 2, subDark: .7,
      update(t, l, pp) { c.only(sc.g, sc.u2); c.noFinger(); c.layPhone(); ph.a.visible = ph.b.visible = false; drawScreen('sold', 0); night(pp, 1.08);
        const T1 = 116.4, T2 = 117.5, kick = (t0, a) => { const d = t - t0; return d > 0 ? a * Math.exp(-d * 1.5) * Math.cos(d * 5.2) : 0; };
        const tilt = t < T1 ? -.02 : (t < T2 ? lerp(-.02, .26, E.out3(seg(t, T1, T1 + .4))) : 0) + (t >= T2 ? .004 + kick(T2, -.26) * -1 * .9 : 0);
        for (const b of [sc.beam, sc.b2]) { b.rotation.z = tilt; b.children[1].rotation.z = -tilt; b.children[2].rotation.z = -tilt; const dL = 1 - E.in2(seg(t, T1 - .3, T1)), dR = 1 - E.in2(seg(t, T2 - .3, T2)); b.children[1].children[b.children[1].children.length - 1].position.y = dL * 2.6; b.children[1].children[b.children[1].children.length - 1].visible = t > T1 - .3; b.children[2].children[b.children[2].children.length - 1].position.y = dR * 2.6; b.children[2].children[b.children[2].children.length - 1].visible = t > T2 - .3; }
        c.poseCommon(t, new THREE.Color(1, .98, .94), 1); const U = room.U; U.uPos.value.set(0, 5.6, 0); U.uN.value.set(0, -1, 0); U.uPow.value = 1.5; ph.scr.color.setRGB(0, 0, 0); room.key.position.set(1.4, 4.4, 2.2); room.key.intensity = 44; room.key.color.setRGB(1, .97, .92);
        const k = E.io2(seg(t, 113.8, 124.6)); camSet(cam, [lerp(2.6, -1.8, k), lerp(1.5, 2.2, k), 12.4 - k * 1.4], [0, 1.5, 0], 26, .02); pp.aperture = .012; pp.focus = 12; return cam; },
      label(x, t) { const a = ss(116.5, 116.9, t) * (1 - ss(121.2, 121.5, t)), a2 = ss(117.6, 118, t) * (1 - ss(121.2, 121.5, t)); if (a > 0) { tag(x, '+2.42%', W * .28, 520 * UI, { size: 88, color: RED_L, alpha: a, weight: 900, family: 'JB', shadow: 22 }); tag(x, '涨的时候平均', W * .28, 420 * UI, { size: 50, color: WHITE, alpha: a, shadow: 16 }); tag(x, '−2.47%', W * .72, 520 * UI, { size: 88, color: GREEN_L, alpha: a2, weight: 900, family: 'JB', shadow: 22 }); tag(x, '跌的时候平均', W * .72, 420 * UI, { size: 50, color: WHITE, alpha: a2, shadow: 16 }); } const b = ss(119.7, 120.1, t) * (1 - ss(121.3, 121.7, t)); if (b > 0) tag(x, '50 : 50', W / 2, 250 * UI, { size: 120, color: WHITE, alpha: b, weight: 900, family: 'JB', shadow: 22 }); } },
  ];
}
