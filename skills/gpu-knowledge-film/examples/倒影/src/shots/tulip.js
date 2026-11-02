import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeTulip } from '../tulip.js';
import { B } from '../script.js';
import { big, label, topDark } from './board.js';
import { textPlane, waterText } from '../text.js';
import { MAIN_ONLY } from '../lake.js';

export function tulipShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G); const Z = -30;
  ctx.tulip = { flock: null };
  const T = makeTulip(); T.group.position.set(0, 8.2, Z); G.add(T.group);
  const fl = new THREE.DirectionalLight(0xcfe0ff, 1.8); fl.position.set(-4, 8, 30); G.add(fl);
  const TX = new THREE.Group(); G.add(TX);
  const yr = waterText('1637', { size: 200, weight: 600, family: 'LoraV', color: '#E8EEF8', height: 9, gain: 1.9, additive: false }); yr.position.set(0, 4.9, Z - 1); TX.add(yr);
  const pr = waterText('ƒ3,000', { size: 200, weight: 600, family: 'LoraV', color: '#FF8F7A', height: 9, gain: 2.1, additive: false }); pr.position.set(0, 4.9, Z - 1); TX.add(pr);
  const w1 = textPlane('工匠一年', { size: 110, weight: 700, family: 'NSans', color: '#FFF1DC', height: 1.75, gain: 1.7, additive: false }), w2 = textPlane('ƒ300', { size: 110, weight: 700, family: 'LoraV', color: '#FFD27A', height: 1.75, gain: 1.9, additive: false }); [w1, w2].forEach(m => { m.layers.set(MAIN_ONLY); TX.add(m); }); w1.position.set(-5.2, 5.8, Z); w2.position.set(-5.2, 3.9, Z);
  // 花的倒影换成数字：水上是实物，水里是价格
  const inAir = on => { T.group.traverse(c => c.layers.set(on ? MAIN_ONLY : 0)); }; ctx.tulipText = on => { TX.visible = on; inAir(on); };
  const look = new THREE.Vector3(), base = new THREE.Vector3(0, 8.2, Z);
  const common = (t, m = 1) => { ctx.hideOthers(G); ctx.tulipText(true); T.group.visible = true; if (ctx.tulip.flock) ctx.tulip.flock.visible = false; T.u.uT.value = t; sky.u.uMoon.value.set(.05, .088, -.995).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = m; lake.u.uGlit.value = .1; ctx.lakeCommon(t); };
  // 一镜到底：球茎开花，水里的 1637 被一滴水打散，换成 ƒ3,000
  const a = {
    a: B(36), b: B(38), scene: world, samples: 10, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, 1); const hit = B(37), d = t - hit, k = E.io2(seg(t, B(36), B(38)));
      yr.material.opacity = ss(B(36.05), B(36.4), t) * (1 - ss(hit - .08, hit + .14, t)); pr.material.opacity = ss(hit + .06, hit + .34, t); yr.visible = yr.material.opacity > .01; pr.visible = pr.material.opacity > .01; w1.material.opacity = w2.material.opacity = ss(B(37.3), B(37.6), t); w1.visible = w2.visible = t > B(37.3);
      T.u.uOpen.value = lerp(.12, .55, E.io2(seg(t, B(36), B(37.6))));
      const w = d > 0 ? Math.exp(-d * 2.6) : 0; lake.u.uChop.value = .12 + .5 * w; lake.u.uDist.value = .006 + .05 * w; lake.u.uMirror.value = .92; lake.setRipples([[0, Z + 1, B(36), .8], [0, Z + 1, hit, 1.4], [0, Z + 1, hit + .3, 1.1]]);
      cam.position.set(lerp(1.6, -1.6, k), lerp(7.4, 6.6, k), Z + lerp(35, 29.5, k)); look.set(0, lerp(.4, .2, k), Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 42; cam.near = .1; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .17; pp.threshold = .95; pp.vig = .5; pp.exposure = 1.12; pp.sat = 1.08;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  ctx.tulip = { T, G, common, flock: null };
  return [a];
}
