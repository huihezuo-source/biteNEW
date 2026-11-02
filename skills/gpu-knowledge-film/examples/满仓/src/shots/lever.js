import * as THREE from 'three';
import { N, R, HERO, kAt, worth, lnU, lnD } from '../sim.js';
import { Y0, DY, R0, FLOOR_Y, U, ballAt, tintOf, radiusOf, moneyFmt, xAt, RAIL_Y, rodX } from '../machine.js';
import { S1, S25, flowRun2, flowRun3, run2, band2, delay2 } from '../flow.js';
import { camSet, proj, tag, topShade, WHITE, INK, RED_L, GREEN_L, RED_D, GREEN_D } from '../util.js';
import { W, H, UI, clamp, lerp, ss, seg, E, rng } from '../core.js';
import { B } from '../script.js';
import { bright } from './hook.js';
import { machineCam, M, lampOn, keyAt } from './run.js';

const LA = 115.5, LB = 119.2, LBb = 120.3, KA = 126.0, SLAM = B(64), GA = 133.6, GC = 137.6, GD = 140.8, GE = B(72);
const NP = { x: 12.6, y: Y0 - 17, w: 9, h: 12 };   // 铭牌钉在板子上
export const medOf = f => 10000 * Math.exp(50 * (lnU(Math.max(f, 1e-5)) + lnD(Math.max(f, 1e-5))));

function plateTex() {
  const c = document.createElement('canvas'); c.width = 1500; c.height = 2000; const x = c.getContext('2d');
  x.fillStyle = '#17191C'; x.fillRect(0, 0, 1500, 2000); x.textAlign = 'center';
  x.strokeStyle = '#5E636A'; x.lineWidth = 10; x.strokeRect(40, 40, 1420, 1920);
  const eng = (s, y, font, col = '#E2E5E9') => { x.font = font; x.fillStyle = 'rgba(0,0,0,.9)'; x.fillText(s, 750, y - 2); x.fillStyle = col; x.fillText(s, 750, y + 2); };
  eng('BELL TELEPHONE LABORATORIES', 300, '500 62px LoraV', '#B9BEC4');
  x.strokeStyle = '#6E737A'; x.lineWidth = 3; x.beginPath(); x.moveTo(220, 350); x.lineTo(1280, 350); x.stroke();
  eng('J. L. KELLY, JR.', 500, '700 112px LoraV'); eng('1956', 640, '700 112px LoraV');
  eng('f* = p/a − q/b', 980, 'italic 500 120px LoraI');
  eng('= 0.5/0.4 − 0.5/0.5', 1160, '500 84px JB', '#C8CDD3');
  eng('= 25%', 1400, '800 190px JB', '#FF5A4A');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
export function leverShots(c) {
  const { scene, balls, cam, plate, pegs, rod, lamps } = c;
  const pm = new THREE.ShaderMaterial({ uniforms: { map: { value: plateTex() }, uT: { value: 0 }, uB: { value: 1 } }, vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uT,uB; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); } float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec3 c=pow(texture2D(map,vU).rgb,vec3(2.2)); vec2 p=vU*vec2(12.,16.); float b=n(p*vec2(1.5,50.))*.6+n(p*vec2(4.,160.))*.4; float st=exp(-pow((p.x*.7+p.y*.7-uT)/2.8,2.)); gl_FragColor=vec4((c*(1.5+st*1.3)+vec3(.72,.82,1.)*(.012+.10*st)*(.4+b))*uB,1.); }` });
  const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(NP.w, NP.h), pm); nameplate.position.set(NP.x, NP.y, .42); nameplate.renderOrder = 4; nameplate.visible = false; scene.add(nameplate); c.extras.push(nameplate);
  const sh = [];
  const nightPP = pp => { pp.vig = .42; pp.threshold = 1.2; pp.bloom = .12; pp.grain = .02; pp.lift = [0, 0, 0]; pp.exposure = 1.05; pp.sat = 1.14; };
  // —— 同一个机位：杠杆和钉阵同框。屋里只剩一盏灯 ——
  const hand = (x, n) => { balls.set(n, x, RAIL_Y + 1.3, 2.7, 2.5, 1, 1, 1, 0); balls.commit(n + 1); };
  const ONE = 6, oneX = -24 + ONE * 4.3;
  const mach = (key, strip, fill, f, spot = .34, line = 1, only = [nameplate]) => { c.setRoom(key, key, strip); c.show({ plate: 1, pegs: 1, balls: 1, lamps: 1, rod: 1, rail: 1, fill, tilt: 1, spot, spotX: oneX, only }); plate.material.uniforms.uLine.value = line; pegs.setF(f); return rod.setF(f); };
  const scale = (x, a, ink = false) => { for (const [f, s, dy, dx] of [[2, '200%', 0, 0], [1, '100%', 0, -26], [.5, '50%', 0, 18], [.25, '25%', 72, 10]]) { const p = proj(cam, rodX(f), RAIL_Y - 1.5, 0); tag(x, s, p[0] + dx * UI, p[1] + (28 + dy) * UI, { size: 66, color: ink ? INK : WHITE, alpha: a, shadow: ink ? 0 : 14, halo: ink ? 18 : 0, weight: 900 }); } };
  const wig = t => 1 - .36 * Math.sin(Math.PI * seg(t, LA + 1, LB)) * Math.sin(2 * Math.PI * seg(t, LA + 1, LB));
  const fPush = t => lerp(1, 2, E.io2(seg(t, LB + .15, 124.9)));
  const one = (lv = 2.4) => lamps.set(i => i === ONE ? lv : .02);
  sh.push({ a: LA, scene, samples: 12,
    update(t, l, pp) { const f = wig(t), x = mach(.05, 1.8, 0, f); one(); nightPP(pp); balls.commit(0); hand(x, 0); const k = E.out3(seg(t, LA, LA + 1.2)); machineCam(cam, 1, 0, 0, .28 * (1 - k)); return cam; },
    over: true, label(x, t) { scale(x, ss(LA + .3, LA + .8, t)); const p = proj(cam, rodX(wig(t)), RAIL_Y, 1.6); tag(x, '仓位', clamp(p[0] + 230 * UI, 200 * UI, W - 200 * UI), p[1] - 110 * UI, { size: 110, color: WHITE, weight: 900, alpha: ss(LA + 1, LA + 1.5, t), shadow: 16 }); } });
  // 手柄特写：一格一格推过 100%
  sh.push({ a: LB, scene, samples: 12,
    update(t, l, pp) { const f = fPush(t), xh = mach(.12, 2.2, 0, f); one(); nightPP(pp); pp.exposure = 1.2; balls.commit(0); hand(xh, 0); camSet(cam, [xh + 2, RAIL_Y + 5, 24], [xh * .6 + rodX(1) * .4, RAIL_Y + 1.6, 0], 30); pp.aperture = .02; pp.focus = 24; return cam; },
    label(x, t) { const p = proj(cam, rodX(1), RAIL_Y - 2.2, 0); tag(x, '100%', p[0], p[1], { size: 92, color: WHITE, weight: 900, shadow: 14 }); } });
  const twoRong = (x, t) => { const a = ss(122.1, 122.4, t), q = ss(123.9, 124.4, t); topShade(x, 440, .8 * a); tag(x, '两融余额', W / 2, 150 * UI, { size: 70, color: WHITE, alpha: a, shadow: 16 }); tag(x, '3.03 万亿', W / 2, 310 * UI, { size: 170, color: RED_L, weight: 900, alpha: a * (1 - q), shadow: 22 }); tag(x, '2.41 万亿', W / 2, 310 * UI, { size: 170, color: GREEN_L, weight: 900, alpha: q, shadow: 22 }); };
  sh.push({ a: LBb, scene, samples: 12,
    update(t, l, pp) { const f = fPush(t), xh = mach(.04, 1.8, 1.4, f); one(); nightPP(pp); pp.exposure = 1.25; flowRun3(balls, t, fPush); hand(xh, balls.count); machineCam(cam); return cam; },
    over: true, label(x, t) { scale(x, 1); twoRong(x, t); } });
  // 铭牌：推上去看，正好是拉回之前
  const npK = t => E.io3(seg(t, KA, KA + 1.25)) * (1 - E.in3(seg(t, SLAM - .42, SLAM)));
  sh.push({ a: KA, scene, samples: 12, subDark: .85,
    update(t, l, pp) { const xh = mach(.04, 1.8, 0, 2); one(); nightPP(pp); pp.exposure = 1.2; balls.commit(0); hand(xh, 0); const k = npK(t); pm.uniforms.uT.value = lerp(1, 26, seg(t, KA + 1, SLAM)); pm.uniforms.uB.value = lerp(.5, 1, k);
      const z = Math.exp(lerp(Math.log(M.z), Math.log(38), k)), x = lerp(M.x, NP.x, k), y = lerp(M.y, NP.y - 1.7, k); camSet(cam, [x + 2 * k * (1 - seg(t, KA + 1.2, SLAM - .4)), y, z], [x, y, 0], M.fov); return cam; },
    over: true, label(x, t) { scale(x, 1 - ss(KA, KA + .4, t)); } });
  // 慢慢拉回来：板子同镜转回去，灯一盏盏亮
  const fPull = t => Math.exp(lerp(Math.log(2), Math.log(.25), E.io2(seg(t, SLAM, GA - .1))));
  const keyOf = f => Math.min(1, keyAt(medOf(f)));
  const inkP = t => ss(131.4, 132.1, t);
  sh.push({ a: SLAM, scene, samples: 12, inkK: inkP,
    update(t, l, pp) { const f = fPull(t), key = keyOf(f), bk = Math.max(.04, key), xh = mach(bk, lerp(1.8, .25, key), 0, f, .34 * (1 - key)); lamps.set(i => t > lampOn(i) ? .02 + (1.2 + 2.6 * key) * ss(0, .12, t - lampOn(i)) : (i === ONE ? 2.4 : .02)); pm.uniforms.uB.value = lerp(.5, 1.6, key); pp.vig = lerp(.42, .1, key); pp.threshold = lerp(1.2, 4, key); pp.exposure = lerp(1.05, 1.3, key); pp.bloom = lerp(.12, .05, key); pp.lift = [0, 0, 0]; pp.sat = 1.14;
      flowRun2(balls, t, f); hand(xh, balls.count); machineCam(cam, 1, 0, 0, .05 * seg(t, SLAM, GA)); return cam; },
    over: true, label(x, t) { const k = inkP(t), f = fPull(t), p = proj(cam, rodX(f), RAIL_Y, 1.6), s = `仓位 ${Math.round(f * 100)}%`, px = clamp(p[0], 240 * UI, W - 240 * UI), py = p[1] - 140 * UI; const a0 = 1 - clamp(k / .38), a1 = clamp((k - .62) / .38); if (a0 > 0) { scale(x, a0, false); tag(x, s, px, py, { size: 92, color: WHITE, weight: 900, shadow: 14, alpha: a0 }); } if (a1 > 0) { scale(x, a1, true); tag(x, s, px, py, { size: 92, color: INK, weight: 900, halo: 18, alpha: a1 }); } } });
  // 第二跑
  const baseB = (r = 0) => { c.setRoom(1, 1, .25); c.show({ plate: 1, pegs: 1, balls: 1, lamps: 1, rod: r, rail: r, tilt: 1, only: [] }); plate.material.uniforms.uLine.value = 1; pegs.setF(.25); lamps.set(() => 3.8); rod.setF(.25); pm.uniforms.uB.value = 1.6; };
  const round2 = (x, t, y = 1408) => { const n = clamp(Math.round(band2(t)), 1, 100); tag(x, `第 ${n} 局`, W / 2, y * UI, { size: 84, color: INK, weight: 900, halo: 20 }); };
  sh.push({ a: GA, scene, samples: 14, ink: true,
    update(t, l, pp) { baseB(); bright(pp); flowRun2(balls, t, .25); const r = band2(t), k = seg(t, GA, GC); camSet(cam, [1, Y0 - r * DY * .9 - 2.4, 22 + 8 * k], [1, Y0 - r * DY * .9 - 3.4, 0], 30); return cam; },
    label(x, t) { round2(x, t); } });
  // 这一次，灯没有灭：和灭灯同一个机位
  sh.push({ a: GC, scene, samples: 14, ink: true,
    update(t, l, pp) { baseB(); bright(pp); flowRun2(balls, t, .25); const k = seg(t, GC, GD); camSet(cam, [-4.2 + k * 3, Y0 - 7, 62 - k * 3], [-4.2 + k * 3, Y0 - 7, 0], 24); return cam; },
    label(x, t) { round2(x, t, 640); } });
  sh.push({ a: GD, scene, samples: 16, ink: true,
    update(t, l, pp) { baseB(1); bright(pp); flowRun2(balls, t, .25); const k = E.io2(seg(t, 143.4, GE)); const cx = lerp(M.x, 2.4, k), cy = lerp(M.y, FLOOR_Y + 7.5, k), z = lerp(M.z, 42, k); camSet(cam, [cx, cy, z], [cx, cy, 0], M.fov); return cam; },
    label(x, t) { round2(x, t, 170); } });
  return sh;
}
