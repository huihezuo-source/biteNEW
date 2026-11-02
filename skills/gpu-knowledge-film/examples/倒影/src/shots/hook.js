import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng } from '../core.js';
import { textCloud, toWater, REFLECT_ONLY } from '../lake.js';
import { B } from '../script.js';
import { waterText } from '../text.js';

// 规则：市值这个数字只在水里。水面上方，什么都没有
export function hookShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const Z = -170, Y = 15, SC = .07, GREEN = [.14, 1, .5], COLD = [.62, .8, 1];
  const mk = (s, seed, c, rise) => { const p = textCloud(s, { size: 360, scale: SC, seed, step: 2, color: c, rise }); p.scale.y = -1; p.layers.set(1); return p; };
  const fix = mk('10', 3, COLD, 24), a5 = mk('7.25', 5, COLD, 24), n2 = mk('5.00', 7, GREEN, 24);
  const wFix = fix.userData.width, wA = a5.userData.width, tot = wFix + wA - 2 * SC * 20;
  fix.position.set(-tot / 2 + wFix / 2, Y, Z); a5.position.set(tot / 2 - wA / 2, Y, Z); n2.position.set(tot / 2 - wA / 2, Y, Z);
  const unit = waterText('万亿元  ·  A 股总市值', { size: 110, weight: 700, family: 'NSans', color: '#EEF4FC', height: 11, gain: 2.4 }); unit.position.set(0, Y + 19, Z);
  const G = new THREE.Group(); G.add(fix, a5, n2, unit); world.add(G); ctx.groups.push(G);
  const clouds = [fix, a5, n2]; clouds.forEach(c => { c.userData.u.uBright.value = .62; });
  const look = new THREE.Vector3();
  const night = (t, chop) => { ctx.lakeCommon(t); sky.u.uMoon.value.set(.15, .24, -.96).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = 1; lake.u.uGlit.value = .06; lake.u.uChop.value = chop; lake.u.uDist.value = .012; lake.u.uMirror.value = .92; };
  const set = (fov, near = .5) => { cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = fov; cam.near = near; cam.far = 20000; cam.updateProjectionMatrix(); };
  // 5108 盏绿灯撒满湖面，一盏是一只下跌的股票，一盏都不多
  const N5 = 5108, pos5 = new Float32Array(N5 * 3), s5 = new Float32Array(N5 * 2), r = rng(5108), CZ = 44, CH = 7;
  for (let i = 0; i < N5; i++) { const tau = .012 + .6 * r() ** 1.1, d = CH / tau, xi = (r() * 2 - 1) * 1.16; pos5.set([xi * d * .273, .3, CZ - d], i * 3); s5[i * 2] = r(); s5[i * 2 + 1] = Math.hypot(xi, (tau - .3) / .3); }
  const g5 = new THREE.BufferGeometry(); g5.setAttribute('position', new THREE.BufferAttribute(pos5, 3)); g5.setAttribute('aS', new THREE.BufferAttribute(s5, 2)); g5.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const u5 = { uT: { value: 0 }, uT0: { value: B(3) }, uPx: { value: H } };
  const lamps = new THREE.Points(g5, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: u5,
    vertexShader: /* glsl */`in vec2 aS; uniform float uT,uT0,uPx; out vec3 vC; void main(){ vec4 mv=viewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; float e=uT-uT0-aS.y*.62-aS.x*.1; float k=smoothstep(0.,.1,e); gl_PointSize=clamp(.2*uPx/(-mv.z),2.2,26.); vC=vec3(.07,1.,.4)*(1.1+2.4*aS.x*aS.x)*k*(1.+2.6*exp(-max(e,0.)*6.)); }`,
    fragmentShader: `precision highp float; in vec3 vC; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; O=vec4(vC*exp(-dot(d,d)*14.),1.); }` })); lamps.frustumCulled = false; lamps.layers.set(REFLECT_ONLY);
  const GL = new THREE.Group(); GL.add(lamps); world.add(GL); ctx.groups.push(GL);
  // 你的账户：远处一个很小的数
  const ZA = -330, YA = 34, ac0 = mk('¥100,000', 21, COLD, 24), ac1 = mk('¥97,900', 23, GREEN, 24); ac0.position.set(0, YA, ZA); ac1.position.set(0, YA, ZA);
  const acL = waterText('你的账户', { size: 110, weight: 700, family: 'NSans', color: '#DDE7F5', height: 21, gain: 1.7 }); acL.position.set(0, 10, ZA);
  const GA = new THREE.Group(); GA.add(ac0, ac1, acL); world.add(GA); ctx.groups.push(GA); [ac0, ac1].forEach(c => { c.userData.u.uBright.value = .7; });
  // 片名也只在水里
  const grad = [[0, '#FFFFFF'], [.55, '#DCE8FA'], [1, '#A9C6F2']];
  const t1 = waterText('倒', { size: 420, weight: 900, height: 40, gain: 2.2, grad, additive: false }), t2 = waterText('影', { size: 420, weight: 900, height: 40, gain: 2.2, grad, additive: false });
  t1.position.set(-16.5, 25, Z); t2.position.set(16.5, 25, Z); const TG = new THREE.Group(); TG.add(t1, t2); world.add(TG); ctx.groups.push(TG);
  const sub = waterText('REFLECTION', { size: 90, weight: 500, family: 'JB', color: '#D5E0EE', height: 5.6, gain: 1.3, track: 34 }); sub.position.set(0, 50, Z); TG.add(sub);
  const s0 = {
    a: 0, b: B(3), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      ctx.hideOthers(G); night(t, .3); clouds.forEach(c => { c.userData.u.uT.value = t; });
      a5.userData.u.uT0.value = .8; a5.userData.u.uDur.value = 1.7; n2.userData.u.uIn.value = B(.8); n2.userData.u.uInDur.value = .9; n2.userData.u.uT0.value = 999; fix.userData.u.uT0.value = 999; unit.material.opacity = 1;
      lake.setRipples([[6, -52, .8, 1.0], [24, -46, 1.6, .8], [-16, -60, B(1.5), .8]]);
      const k = E.io2(seg(t, 0, B(3))); cam.position.set(lerp(-5, 5, k), lerp(6.4, 5.2, k), lerp(46, 30, k)); look.set(0, lerp(.2, 1, k), Z); set(40);
      pp.bloom = .24; pp.threshold = .85; pp.vig = .45; pp.exposure = 1.1; pp.sat = 1.14; pp.contrast = 1.06;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const sL = {
    a: B(3), b: B(4), scene: world, samples: 8, samplesDraft: 3, subDark: .86,
    update(t, u, pp) {
      ctx.hideOthers(GL); night(t, .2); sky.u.uMoonK.value = 0; lake.u.uGlit.value = 0; u5.uT.value = t; lake.u.uRain.value = 1.2; lake.u.uDist.value = .018; lake.u.uMirror.value = .96;
      const k = seg(t, B(3), B(4)); cam.position.set(lerp(-2, 2, k), CH, lerp(CZ, CZ - 6, k)); look.set(0, -40, -160); set(40);
      pp.bloom = .3; pp.threshold = .7; pp.vig = .42; pp.exposure = 1.1; pp.sat = 1.14;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const sA = {
    a: B(4), b: B(5), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      const hit = B(4.25); ctx.hideOthers(GA); night(t, .16); sky.u.uMoonK.value = 0; lake.u.uGlit.value = 0; lake.u.uFogK.value = .2; lake.u.uChop.value = .14 + .4 * (t > hit ? Math.exp(-(t - hit) * 3) : 0); [ac0, ac1].forEach(c => { c.userData.u.uT.value = t; });
      ac0.userData.u.uT0.value = hit; ac0.userData.u.uDur.value = .9; ac1.userData.u.uIn.value = hit + .3; ac1.userData.u.uInDur.value = .5; ac1.userData.u.uT0.value = 999; lake.setRipples([[0, -31, hit, 1.5], [0, -31, hit + .3, 1]]);
      const k = seg(t, B(4), B(5)); cam.position.set(0, 7, lerp(34, 26, k)); look.set(0, -45, ZA); set(40);
      pp.bloom = .26; pp.threshold = .8; pp.vig = .5; pp.exposure = 1.14; pp.sat = 1.14;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(5), b: B(8), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      ctx.hideOthers(G); night(t, .42); clouds.forEach(c => { c.userData.u.uT.value = t; }); fix.userData.u.uT0.value = B(5.25); fix.userData.u.uDur.value = 2; n2.userData.u.uIn.value = -9; n2.userData.u.uT0.value = B(6); n2.userData.u.uDur.value = 2; a5.userData.u.uT0.value = -50; unit.material.opacity = 1 - seg(t, B(5), B(5.25));
      lake.setRipples([[0, -56, B(5.25), 1.2], [12, -48, B(6), 1]]);
      const k = E.io3(seg(t, B(5), B(8))); cam.position.set(5, lerp(5.2, 7, k), lerp(30, 6, k)); look.set(0, lerp(1, -30, k), Z); set(lerp(40, 42, k));
      pp.bloom = .24; pp.threshold = .85; pp.vig = .45; pp.exposure = 1.08; pp.sat = 1.14;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s3 = {
    a: B(8), b: B(9.5), scene: world, samples: 8, samplesDraft: 3, subDark: .9,
    update(t, u, pp) {
      ctx.hideOthers(TG); night(t, .3); sky.u.uMoon.value.set(.56, .3, -.77).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); lake.u.uGlit.value = 0; lake.setRipples([[0, -30, B(8), 1.6], [0, -30, B(8.75), 1.2], [0, -30, B(9.2), 1.6]]);
      const w = ss(B(9), B(9.5), t), k = E.out3(seg(t, B(8), B(9.5))); lake.u.uChop.value = lerp(.3, 2.4, w * w); lake.u.uDist.value = lerp(.016, .13, w * w); cam.position.set(lerp(3, 0, k), lerp(8, 7, k), lerp(-16, -30, k)); look.set(0, -22, Z); set(40);
      pp.bloom = .26; pp.threshold = .9; pp.vig = .45; pp.exposure = 1.04; pp.sat = 1.1;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  return [s0, sL, sA, s2, s3];
}
