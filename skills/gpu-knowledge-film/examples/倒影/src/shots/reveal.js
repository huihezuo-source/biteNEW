import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { REFLECT_ONLY, MAIN_ONLY, textCloud } from '../lake.js';
import { B } from '../script.js';
import { big, label, topDark } from './board.js';
import { textPlane, waterText } from '../text.js';

// 水面上只有一条点灯的小船。水下是 105 万亿的倒影
export function revealShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G); const Z = -46, r = rng(165);
  const boat = ctx.makeBoat({ light: true, seed: 3 }); boat.group.position.set(0, 0, Z); boat.group.rotation.y = .25; G.add(boat.group);
  const fill = new THREE.DirectionalLight(0xa8bce8, 2.4); fill.position.set(-4, 6, 8); G.add(fill);
  // 实物 1.65，倒影 2.25：字的大小严格按比例
  const gold = textPlane('1.65 万亿', { size: 210, weight: 900, family: 'NSerif', color: '#FFD27A', height: 5.2, gain: 1.8, additive: false }); gold.layers.set(MAIN_ONLY); gold.position.set(0, 7.2, Z - 2); G.add(gold);
  const shade = waterText('2.25 万亿', { size: 210, weight: 900, family: 'NSerif', color: '#2EE08A', height: 7.1, gain: 1.8, additive: false }); shade.position.set(0, 7.8, Z - 2); G.add(shade);
  // 金城：只在倒影里
  const CH = 105, N = 380; const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, .5, 0); const info = new Float32Array(N * 2), d = new THREE.Object3D();
  const cu = { uG: { value: 0 }, uK: { value: 1 } };
  const cm = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: cu,
    vertexShader: /* glsl */`in vec2 aI; uniform float uG; out vec3 vL; out vec3 vN; out vec2 vI; out vec3 vS; void main(){ vL=position; vN=normal; vI=aI; vS=vec3(instanceMatrix[0][0],instanceMatrix[1][1],instanceMatrix[2][2]); vec3 o=instanceMatrix[3].xyz; float dd=length(o.xz-vec2(0.,${(Z - 20).toFixed(1)})); float g=clamp(uG*1.5-dd*.0078-aI.x*.25,0.,1.); g=1.-pow(1.-g,3.); vec3 p=position; p.y*=max(g,.0001); vS.y*=max(g,.0001); gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vL,vN,vS; in vec2 vI; out vec4 O; uniform float uK; ${GLSL_NOISE}
    void main(){ if(vN.y<-.5) discard; vec2 q=abs(vN.x)>.5?vec2(vL.z*vS.z,vL.y*vS.y):vec2(vL.x*vS.x,vL.y*vS.y); vec2 cell=q/vec2(1.02,1.66); vec2 id=floor(cell),f=fract(cell); float h=hash21(id+vI*57.);
      vec3 c=vec3(.016,.03,.062)*(.5+.5*vL.y);
      if(abs(vN.y)<.5){ float gl=smoothstep(.12,.18,f.x)*smoothstep(.88,.82,f.x)*smoothstep(.14,.22,f.y)*smoothstep(.88,.8,f.y); float lit=step(.26+.4*vL.y,h); c+=mix(vec3(.5,.72,1.),vec3(.86,.95,1.),fract(h*17.))*lit*gl*(.7+2.*fract(h*91.)*fract(h*91.)); float e2=min(min(vL.x+.5,.5-vL.x),min(vL.z+.5,.5-vL.z)); c+=vec3(.5,.72,1.)*smoothstep(.03,.0,e2)*.22; }
      else c=vec3(.1,.17,.3);
      O=vec4(c*uK,1.); }` });
  const city = new THREE.InstancedMesh(bg, cm, N); { const placed = []; let i = 0, guard = 0;
    while (i < N && guard++ < N * 80) { const gx = (r() - .5) * 2 * 104, gz = -30 - r() * 70 + r() * 34; const R = Math.hypot(gx * .86, (gz + 30) * .7); const kk = Math.max(0, 1 - R / 104); const h = Math.max(8, (CH - 6) * Math.pow(kk, 1.15) * (.42 + .58 * r() * r()) + 6); const w = 4.2 + r() * 3.4 + kk * 2.4, dp = 4.2 + r() * 3.4; if (placed.some(q => Math.abs(q[0] - gx) < (q[2] + w) / 2 + 1.5 && Math.abs(q[1] - gz) < (q[3] + dp) / 2 + 1.5)) continue; placed.push([gx, gz, w, dp]); const H_ = i === 0 ? CH : h; d.position.set(i === 0 ? 3 : gx, 0, Z + (i === 0 ? -34 : gz)); d.rotation.set(0, 0, 0); d.scale.set(w, H_, dp); d.updateMatrix(); city.setMatrixAt(i, d.matrix); info[i * 2] = r(); info[i * 2 + 1] = r(); i++; } city.count = i; }
  bg.setAttribute('aI', new THREE.InstancedBufferAttribute(info, 2)); city.instanceMatrix.needsUpdate = true; city.frustumCulled = false; city.layers.set(REFLECT_ONLY); G.add(city);
  const look = new THREE.Vector3(), p0 = new THREE.Vector3(), l0 = new THREE.Vector3();
  // 船一直在走，身后拖一串水纹
  const bx = t => lerp(-7, 0, E.out2(seg(t, B(24.5), B(31))));
  const wake = t => { const o = []; if (t > B(31)) return o; const q = Math.floor(t / .7); for (let i = 0; i < 7; i++) { const ti = (q - i) * .7; if (ti < B(24.5)) break; o.push([bx(ti) - 3.2, Z, ti, .3]); } return o; };
  const common = (t, moon = 1, mx = -.2, my = .24) => { ctx.hideOthers(G); sky.u.uMoon.value.set(mx, my, -.96).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = moon; lake.u.uGlit.value = moon * .3; if (!moon) { sky.u.uHor.value.setRGB(.075, .12, .2); lake.u.uHorC.value.setRGB(.075, .12, .2); lake.u.uGlit.value = 0; } ctx.lakeCommon(t); boat.rock(t); boat.group.position.x = bx(t); gold.visible = false; shade.visible = false; city.visible = false; cu.uG.value = 0; lake.u.uChop.value = .16; lake.u.uDist.value = .008; lake.u.uMirror.value = .9; lake.setRipples(wake(t)); };
  const bl = pp => { pp.bloom = .2; pp.threshold = .9; pp.vig = .45; pp.exposure = 1.14; pp.sat = 1.12; };
  // 24–26：从水里的数字抬头：水面上方空无一物，只有一条小船
  const s0 = {
    a: B(24), b: B(26), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, 0);
      const k = E.io3(seg(t, B(24), B(24.55))); const b = ctx.board; if (k < 1) { b.MG.visible = true; b.show(true); b.wall.u.uT.value = t; b.setRows(t); b.wall.u.uK.value = 1 - k; b.tDrop.visible = true; b.rows.forEach(q => { q.f.u.uKey.value = 3.2 * (1 - k); q.f.u.uGlow.value = 1.1 * (1 - k); }); }
      else b.MG.visible = false;
      b.BV.scale.setScalar(1); b.view(0, 2.2, 41); p0.copy(cam.position); l0.copy(b.v2); const f0 = cam.fov;
      const c = E.io2(seg(t, B(24.5), B(26))); const px = lerp(-2, 2, c), py = lerp(3, 3.6, c), pz = Z + lerp(66, 44, c);
      cam.position.set(lerp(p0.x, px, k), lerp(p0.y, py, k), lerp(p0.z, pz, k)); look.set(lerp(l0.x, 0, k), lerp(l0.y, 7, k), lerp(l0.z, Z - 40, k)); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(f0, 40, k); cam.near = 1; cam.far = 60000; cam.updateProjectionMatrix();
      lake.u.uMirror.value = lerp(1, .9, k); lake.setRipples([[0, Z + 4, B(24.6), 1.2], [0, Z + 4, B(25.4), .9], ...wake(t)]); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  // 26–30.5：实物 1.65 万亿，倒影却有 2.25 万亿
  const a1 = {
    a: B(26), b: B(27.5), scene: world, samples: 8, samplesDraft: 3, subDark: .86,
    update(t, u, pp) {
      common(t, 0); shade.visible = true; shade.material.opacity = ss(B(26), B(26.3), t); const k = E.io2(seg(t, B(26), B(27.5))); cam.position.set(lerp(-3, 3, k), lerp(8, 7, k), Z + 34); look.set(0, -6, Z - 2); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 38; cam.near = .2; cam.far = 20000; cam.updateProjectionMatrix(); lake.setRipples([[0, Z + 7, B(26), 1], ...wake(t)]); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const a2 = {
    a: B(27.5), b: B(29), scene: world, samples: 8, samplesDraft: 3, subDark: .86,
    update(t, u, pp) {
      common(t, 0); gold.visible = true; gold.material.opacity = ss(B(27.5), B(27.8), t); const k = E.io2(seg(t, B(27.5), B(29))); cam.position.set(lerp(3, -3, k), 1.6, Z + 34); look.set(0, 4.6, Z - 2); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 38; cam.near = .2; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const a3 = {
    a: B(29), b: B(30.5), scene: world, samples: 8, samplesDraft: 3, subDark: .86,
    update(t, u, pp) {
      common(t, 0); gold.visible = true; shade.visible = true; gold.material.opacity = 1; shade.material.opacity = 1; const k = E.io2(seg(t, B(29), B(30.5))); cam.position.set(lerp(-4, 4, k), 2.6, Z + lerp(36, 32, k)); look.set(0, -.6, Z - 2); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 44; cam.near = .2; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  // 30.5–32：退到整片湖，小船只剩一点灯
  const s1 = {
    a: B(30.5), b: B(32), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, 0); const f = 1 - ss(B(30.5), B(31), t); gold.visible = shade.visible = f > .01; gold.material.opacity = shade.material.opacity = f; const b = E.io3(seg(t, B(30.5), B(32)));
      cam.position.set(lerp(4, 0, b), lerp(2.6, 9, b), Z + lerp(32, 138, b)); look.set(0, lerp(-.6, -14, b), Z - 2); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(44, 40, b); cam.near = .2; cam.far = 20000; cam.updateProjectionMatrix(); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s2 = {
    a: B(32), b: B(34), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, 0); city.visible = true; cu.uG.value = E.out2(seg(t, B(32), B(33.1))); const wind = E.in2(seg(t, B(33), B(33.6))); boat.rock(t, 1 + wind * 3);
      lake.u.uChop.value = lerp(.13, 2.6, wind); lake.u.uDist.value = lerp(.01, .11, wind); lake.u.uMirror.value = lerp(.92, .84, wind); lake.setRipples([[0, Z + 3, B(32) + .04, 1.7], [0, Z + 3, B(32) + .7, 1.2], [0, Z + 3, B(32) + 1.5, 1.2]]);
      const k = E.out3(seg(t, B(32), B(33))), v = seg(t, B(33), B(34)); cam.position.set(v * 7, lerp(9, 9, k), Z + lerp(138, 132, k)); look.set(0, lerp(-14, -46, k), Z - 24); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(40, 64, k); cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .26; pp.threshold = .85; pp.vig = .45; pp.exposure = 1.05; pp.sat = 1.14; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s3 = {
    a: B(34), b: B(35), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, .5); boat.rock(t, 4); city.visible = true; cu.uG.value = 1; lake.u.uChop.value = 2.0; lake.u.uDist.value = .1; lake.u.uMirror.value = .8;
      const k = E.io2(seg(t, B(34), B(35))); cam.position.set(lerp(-9, -6.5, k), lerp(1.5, 2.1, k), Z + lerp(11, 8.5, k)); look.set(.4, 1.2, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 38; cam.near = .1; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .2; pp.threshold = .9; pp.vig = .55; pp.exposure = 1.15; pp.sat = 1.12; pp.aperture = .01; pp.focus = 11; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const s4 = {
    a: B(35), b: B(36), scene: world, samples: 8, samplesDraft: 3, subDark: .8,
    update(t, u, pp) {
      common(t, 0); city.visible = true; cu.uG.value = 1; const k = seg(t, B(35), B(36)); lake.u.uChop.value = lerp(1.2, .3, k); lake.u.uDist.value = lerp(.06, .018, k); lake.u.uMirror.value = .9;
      cam.position.set(0, 6, Z + 120); look.set(0, -40, Z); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 50; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .2; pp.threshold = .85; pp.vig = .5; pp.exposure = 1.05; pp.sat = 1.08; return cam;
    },
    draw(c) { lake.draw(world, c); },
    hud(x, u, t, h) { const gr = x.createRadialGradient(W / 2, 560 * UI, 0, W / 2, 560 * UI, 720 * UI); gr.addColorStop(0, 'rgba(0,0,0,.96)'); gr.addColorStop(.62, 'rgba(0,0,0,.86)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); big(x, '边际定价', 720, 590, { size: 210, font: 'NSerif', weight: 900, color: '#FFF4DF', glow: 'rgba(255,190,90,.8)', s: 1 + .1 * Math.exp(-u * 5) }); label(x, 'MARGINAL PRICING', 720, 690, { size: 58, color: '#F4E7C8', weight: 500 }); h.gain = 2.4; },
  };
  ctx.reveal = { G, city, boat, gold, shade, Z, cu };
  return [s0, a1, a2, a3, s1, s2, s3, s4];
}
