import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { textCloud, toWater, toAir } from '../lake.js';
import { makeFlaps, setRow } from '../flip.js';
import { textPlane, waterText } from '../text.js';
import { B } from '../script.js';
import { big, label, topDark } from './board.js';

const mix3 = (u, a, b, k) => u.value.setRGB(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k));
export function dawnShots(ctx) {
  const { lake, sky, world, cam, pier } = ctx;
  const G = pier.G, Z = pier.Z;
  const setDawn = k => {
    mix3(sky.u.uTop, [.0035, .0055, .012], [.055, .085, .17], k); mix3(sky.u.uHor, [.020, .032, .055], [.62, .27, .15], k);
    mix3(lake.u.uHorC, [.020, .032, .055], [.34, .17, .11], k); mix3(lake.u.uDeep, [.0015, .0035, .007], [.016, .014, .02], k);
    sky.u.uStar.value = 1 - k; sky.u.uMoonK.value = 1 - ss(0, .5, k); sky.u.uSunK.value = k; sky.u.uSun.value.set(-.14, lerp(-.02, .07, k), -.99).normalize(); sky.u.uCloud.value = 1;
    if (k > 0) { lake.u.uMoon.value.copy(sky.u.uSun.value); lake.u.uGlit.value = k * .22; }
  };
  ctx.setDawn = setDawn;
  // 金雨：分到手里的真钱
  const N = 7000, q = new THREE.PlaneGeometry(1, 1), ig = new THREE.InstancedBufferGeometry(); ig.index = q.index; ig.setAttribute('position', q.attributes.position); ig.setAttribute('uv', q.attributes.uv); ig.instanceCount = N;
  const S = new Float32Array(N * 4), r = rng(261); for (let i = 0; i < N * 4; i++) S[i] = r(); ig.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
  const ru = { uT: { value: 0 }, uK: { value: 0 } };
  const rainM = new THREE.Mesh(ig, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: ru,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT; out vec2 vU; out float vF; void main(){ float l=fract(aS.x+uT*(.42+.2*aS.y)); float Y=(1.-l)*90.; vec3 c=vec3((aS.z-.5)*180.,Y,-170.+aS.w*142.); vec4 mv=viewMatrix*vec4(c,1.); vec2 sz=vec2(.05+.05*aS.y,2.4+2.*aS.y); vec4 pc=projectionMatrix*viewMatrix*vec4(c+vec3(0.,position.y*sz.y,0.),1.); vec4 p0=projectionMatrix*mv; pc.x+=position.x*sz.x*projectionMatrix[0][0]; gl_Position=pc; vU=uv; vF=smoothstep(0.,.04,l)*(.5+.5*aS.y)*exp(-(-mv.z)*.004)*smoothstep(14.,48.,-mv.z); }`,
    fragmentShader: `precision highp float; in vec2 vU; in float vF; out vec4 O; uniform float uK; void main(){ float e=exp(-pow((vU.x-.5)*3.2,2.))*vU.y; O=vec4(vec3(1.,.74,.34)*e*vF*2.4*uK,1.); }` })); rainM.frustumCulled = false; G.add(rainM);
  // 分红是真钱：站在水面上
  const div = textPlane('2.61 万亿', { size: 210, weight: 900, family: 'NSerif', color: '#FFD27A', height: 13, gain: 2.2, additive: false }); div.position.set(-36, 11, Z - 60); div.visible = false; G.add(div);
  // 水上的数算了分红，水里的倒影没算：实物和倒影不再一致
  const COLS = 8, TW = 3.1, TH = 4.8, FZ = Z - 26, FX = -42, FY = 5.6, R0 = '3,320.89';
  const flA = makeFlaps(COLS, TW, TH), flB = makeFlaps(COLS, TW, TH); const x0 = -(COLS - 1) / 2 * TW, FT = B(69.75) + .05;
  [flA, flB].forEach(f => { f.u.uL.value.set(FX, 22, Z + 30); f.u.uKey.value = 1.5; f.u.uAmb.value = .1; f.u.uDur.value = .2; f.u.uFog.value = .0015; f.u.uFogC.value.setRGB(.2, .11, .08); f.u.uTintB.value.setRGB(1, .68, .2); f.u.uTintC.value.setRGB(1, .55, .42); f.u.uBase.value.setRGB(.02, .018, .02); f.u.uGlow.value = 1; });
  flA.mesh.position.set(FX, 0, FZ); toAir(flA.mesh); G.add(flA.mesh); const mg = new THREE.Group(); mg.scale.y = -1; mg.position.set(FX, 0, FZ); mg.add(flB.mesh); toWater(mg); G.add(mg);
  setRow(flA, 0, R0, '4,217.27', FT, { x0, y: FY, stagger: .05, tint: -1, tw: TW }); setRow(flB, 0, R0, '3,605.77', FT + .3, { x0, y: -FY, stagger: .05, tint: 1, tw: TW }); flA.commit(); flB.commit();
  const lab1 = textPlane('算上分红', { size: 120, weight: 800, family: 'NSans', color: '#FFD27A', height: 3.1, gain: 1.9, additive: false }), lab2 = waterText('上证指数', { size: 120, weight: 800, family: 'NSans', color: '#FFF4EA', height: 3.1, gain: 2.5, additive: false });
  toAir(lab1); lab1.position.set(FX, FY + 4.1, FZ); lab2.position.set(FX, FY + 4.1, FZ); const d0 = textPlane('2020 年 7 月 21 日  同一起点', { size: 90, weight: 700, family: 'NSans', color: '#FFF1DC', height: 3.2, gain: 1.5, additive: false }), d1 = textPlane('2026 年 10 月 30 日盘中', { size: 90, weight: 700, family: 'NSans', color: '#FFF1DC', height: 3.2, gain: 1.5, additive: false }); toAir(d0); toAir(d1); d0.position.set(FX, FY + 8.2, FZ); d1.position.set(FX, FY + 8.2, FZ); const labs = [lab1, lab2, d0, d1]; labs.forEach(l => { G.add(l); l.visible = false; });
  // 太阳挪到画外：这两镜只看字
  const offSun = () => { sky.u.uSun.value.set(.5, .07, -.86).normalize(); lake.u.uMoon.value.copy(sky.u.uSun.value); lake.u.uGlit.value = 0; };
  ctx.dawnRain = ru; ctx.dawnOff = () => { flA.mesh.visible = false; flB.mesh.visible = false; div.visible = false; labs.forEach(l => { l.visible = false; }); };
  const look = new THREE.Vector3();
  const com = (t, dk) => { ctx.hideOthers(G); pier.giant.pts.visible = false; pier.me.u.uT.value = t; pier.me.u.uK.value = .34 * (1 - ss(.1, .6, dk)); pier.me.pts.visible = dk < .6; pier.shadow.visible = dk > .1; ctx.lakeCommon(t); setDawn(dk); ru.uT.value = t; flA.mesh.visible = false; flB.mesh.visible = false; div.visible = false; labs.forEach(l => { l.visible = false; }); lake.setRipples([]); lake.u.uChop.value = .12; lake.u.uDist.value = .008; lake.u.uMirror.value = .86; lake.u.uRain.value = 0; ru.uK.value = 0; };
  const bl = pp => { pp.bloom = .22; pp.threshold = .95; pp.vig = .42; pp.exposure = 1.0; pp.sat = 1.1; };
  const s1 = {
    a: B(66), b: B(68), scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, uu, pp) {
      const dk = E.io2(seg(t, B(66), B(67.2))); com(t, dk); const rn = ss(B(67), B(67.7), t); ru.uK.value = rn; lake.u.uRain.value = rn; const k = seg(t, B(66), B(68));
      cam.position.set(lerp(-9, -5, k), lerp(2.6, 3.2, k), Z + lerp(30, 22, k)); look.set(-1, 6.4, Z - 40); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 42; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(68), b: B(69), scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, uu, pp) {
      com(t, 1); offSun(); ru.uK.value = 1; lake.u.uRain.value = 1.3; lake.u.uChop.value = .1; div.visible = true; const k = seg(t, B(68), B(69)); cam.position.set(lerp(-30, -26, k), 2.6, Z + 8); look.set(lerp(-37, -34, k), 3.5, Z - 60); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 46; cam.near = .2; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s3 = {
    a: B(69), b: B(71), scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, uu, pp) {
      com(t, 1); offSun(); ru.uK.value = .5; lake.u.uRain.value = .4; lake.u.uChop.value = .08; lake.u.uDist.value = .005; lake.u.uMirror.value = .95; flA.mesh.visible = true; flB.mesh.visible = true; labs.forEach(l => { l.visible = true; }); flA.u.uT.value = t; flB.u.uT.value = t; d0.material.opacity = 1 - ss(B(69.65), B(69.8), t); d1.material.opacity = ss(B(69.75), B(69.95), t);
      const k = E.io2(seg(t, B(69), B(71))); cam.position.set(FX + lerp(-3, 3, k), 3.5, FZ + lerp(54, 51, k)); look.set(FX, 1, FZ); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 40; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s4 = {
    a: B(71), b: B(72), scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, uu, pp) {
      com(t, 1); ru.uK.value = .45; lake.u.uRain.value = .4; const k = seg(t, B(71), B(72)); cam.position.set(lerp(-4, 0, k), 2.4, Z + lerp(44, 38, k)); look.set(-2.4, 11, Z - 40); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 50; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
    hud(x, u, t, h) { topDark(x, 720, .5); label(x, '巴菲特 2008 年致股东信，引自格雷厄姆', 720, 640, { size: 60, a: ss(B(71.1), B(71.4), t), color: '#FFF8EC', weight: 600 }); h.gain = 1.6; },
  };
  return [s1, s2, s3, s4];
}

export function backShots(ctx) {
  const { lake, sky, world, cam, pier, reveal } = ctx;
  const Z = -170, Y = 15, SC = .07;
  const mk = (s, seed, c) => { const p = textCloud(s, { size: 360, scale: SC, seed, step: 2, color: c, rise: 24 }); p.scale.y = -1; p.layers.set(1); return p; }; const fix = mk('10', 13, [.62, .8, 1]), a5 = mk('7.25', 15, [.62, .8, 1]), n2 = mk('5.00', 17, [.14, 1, .5]);
  const wFix = fix.userData.width, wA = a5.userData.width, tot = wFix + wA - 2 * SC * 20; fix.position.set(-tot / 2 + wFix / 2, Y, Z); a5.position.set(tot / 2 - wA / 2, Y, Z); n2.position.set(tot / 2 - wA / 2, Y, Z);
  const G = new THREE.Group(); G.add(fix, a5, n2); world.add(G); ctx.groups.push(G); const clouds = [fix, a5, n2]; clouds.forEach(c => { c.userData.u.uBright.value = .55; });
  const look = new THREE.Vector3();
  const s1 = {
    a: B(72), b: B(73), scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, u, pp) {
      ctx.hideOthers(G); ctx.lakeCommon(t); ctx.setDawn(1); sky.u.uSun.value.set(.46, .07, -.88).normalize(); lake.u.uMoon.value.copy(sky.u.uSun.value); clouds.forEach(c => { c.userData.u.uT.value = t; }); a5.userData.u.uT0.value = B(72.2); a5.userData.u.uDur.value = 1.5; n2.userData.u.uIn.value = B(72.6); n2.userData.u.uInDur.value = .7; n2.userData.u.uT0.value = 999; fix.userData.u.uT0.value = 999;
      lake.u.uChop.value = .22; lake.u.uDist.value = .012; lake.u.uMirror.value = .84; lake.u.uRain.value = 0; lake.setRipples([[0, -60, B(72.2), 1.2], [18, -48, B(72.6), 1]]);
      const k = E.io2(seg(t, B(72), B(73))); cam.position.set(lerp(-5, 5, k), lerp(6, 5, k), lerp(40, 28, k)); look.set(0, -15, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 40; cam.near = .5; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = .95; pp.vig = .42; pp.exposure = .92; pp.sat = 1.1; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(73), b: B(74), scene: world, samples: 10, samplesDraft: 3, subDark: .78,
    update(t, u, pp) {
      ctx.hideOthers(reveal.G); reveal.city.visible = false; reveal.gold.visible = false; reveal.shade.visible = false; reveal.boat.rock(t, .6); ctx.lakeCommon(t); ctx.setDawn(1); lake.u.uChop.value = .1; lake.u.uDist.value = .006; lake.u.uMirror.value = .86; lake.u.uRain.value = 0; lake.setRipples([]);
      const k = E.io2(seg(t, B(73), B(74))), rz = reveal.Z; cam.position.set(lerp(-9, -6, k), lerp(3, 1.8, k), rz + lerp(14, 11, k)); look.set(.3, 1.3, rz); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 38; cam.near = .1; cam.far = 20000; cam.updateProjectionMatrix();
      pp.aperture = .012; pp.focus = 13; pp.bloom = .18; pp.threshold = 1; pp.vig = .5; pp.exposure = .95; pp.sat = 1.1; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const e1 = waterText('致每一个，', { size: 140, weight: 900, family: 'NSerif', color: '#FFF4E4', height: 7, gain: 1.5, additive: false }), e2 = waterText('在水边站过的人。', { size: 140, weight: 900, family: 'NSerif', color: '#FFF4E4', height: 7, gain: 1.5, additive: false }); e1.position.set(-6, 9.5, pier.Z - 16); e2.position.set(-6, 17, pier.Z - 16); pier.G.add(e1, e2); e1.visible = e2.visible = false; ctx.endText = [e1, e2];
  const end = {
    a: B(74), b: 162.1, scene: world, samples: 8, samplesDraft: 3, subDark: .78,
    update(t, u, pp) {
      ctx.hideOthers(pier.G); pier.giant.pts.visible = false; pier.me.pts.visible = false; pier.shadow.visible = true; ctx.dawnRain.uK.value = 0; e1.visible = e2.visible = true; const off = 1 - ss(B(74) + 1.8, B(74) + 2.1, t); e1.material.opacity = ss(B(74), B(74) + .3, t) * off; e2.material.opacity = ss(B(74) + .3, B(74) + .6, t) * off; ctx.lakeCommon(t); ctx.setDawn(1); lake.u.uChop.value = .1; lake.u.uDist.value = .006; lake.u.uMirror.value = .86; lake.u.uRain.value = 0; lake.setRipples([]);
      const k = seg(t, B(74), 162); cam.position.set(-12 + 3 * k, 3.4, pier.Z + 34 + 6 * k); look.set(-6, -6.5, pier.Z - 16); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 44; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .2; pp.threshold = .95; pp.vig = .5; pp.exposure = .9; pp.fade = ss(161.5, 162, t); pp.sat = 1.08; return cam;
    },
    draw(c) { lake.draw(world, c); },
    hud(x, u, t, h) { const b = ss(2.1, 2.5, u); if (b > 0) { x.fillStyle = `rgba(0,0,0,${b})`; x.fillRect(0, 0, W, H); big(x, '倒影', 720, 860, { a: b, size: 180, font: 'NSerif', weight: 900, color: '#E6EFFB', glow: 'rgba(170,200,255,.7)' }); [['Goldgar《Tulipmania》2007  ·  Buffett 2008 致股东信', 1000], ['华夏时报 2026-10-15  ·  证券日报  ·  中证指数公司', 1060], ['本片为认知科普，不构成任何投资建议', 1120]].forEach(([s, y]) => label(x, s, 720, y, { size: 46, a: b, weight: 500, color: '#F2EADC' })); } h.gain = 1.9; },
  };
  return [s1, s2, end];
}
