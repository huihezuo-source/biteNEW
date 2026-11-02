import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeFlaps, setRow, idx, getAtlas, CHARS } from '../flip.js';
import { textPlane } from '../text.js';
import { toWater } from '../lake.js';
import { B } from '../script.js';

export const label = (x, s, cx, y, o = {}) => { const { size = 62, color = '#F4EAD6', a = 1, align = 'center', weight = 700 } = o; x.save(); x.globalAlpha = a; x.textAlign = align; x.font = `${weight} ${size * UI}px NSans`; x.fillStyle = color; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 16 * UI; x.fillText(s, cx * UI, y * UI); x.restore(); };
export function big(x, str, cx, y, { size = 170, color = '#FFD27A', glow = 'rgba(255,190,90,.85)', a = 1, s = 1, font = 'JB', weight = 700 } = {}) { x.save(); x.globalAlpha = a; x.translate(cx * UI, y * UI); x.scale(s, s); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `${weight} ${size * UI}px ${font}`; x.fillStyle = color; x.shadowColor = glow; x.shadowBlur = size * .22 * UI; x.fillText(str, 0, 0); x.shadowBlur = 0; x.fillText(str, 0, 0); x.restore(); }
export const topDark = (x, h = 640, a = .92) => { const gr = x.createLinearGradient(0, 0, 0, h * UI); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.72, `rgba(0,0,0,${a * .86})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, h * UI); };

// 这一整段都是水里的影子：镜头往下看水，水面的涟漪直接扰动数字
function digitWall() {
  const u = { tA: { value: getAtlas() }, uN: { value: CHARS.length }, uT: { value: 0 }, uRate: { value: .5 }, uK: { value: 1 }, uTile: { value: new THREE.Vector2(.5, .72) }, uC: { value: new THREE.Vector2(0, 0) }, uPatchR: { value: 0 }, uPatchK: { value: 0 }, uWaveT: { value: 999 }, uWaveK: { value: .01 }, uRingW: { value: 12 } };
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u, side: THREE.DoubleSide, vertexShader: `out vec2 vL; void main(){ vL=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vL; out vec4 O; uniform sampler2D tA; uniform float uN,uT,uRate,uK,uPatchR,uPatchK,uWaveT,uWaveK,uRingW; uniform vec2 uTile,uC; ${GLSL_NOISE}
    void main(){ vec2 P=vL; float dC=length(P-uC); float rr=uWaveT<900.?dC-(uT-uWaveT)/uWaveK:1e4; float ring=exp(-rr*rr/(uRingW*uRingW)); if(uWaveT<900.) P+=normalize(P-uC+1e-4)*ring*uRingW*.45*sin(rr/uRingW*5.);
      vec2 q=P/uTile; vec2 id=floor(q),f=fract(q); float px=max(fwidth(q.x),fwidth(q.y)); float s=hash21(id); float d=length((id+.5)*uTile-uC);
      float inP=step(d,uPatchR)*uPatchK; float rate=(.25+.75*s)*uRate*(1.+7.*inP); float tt=uT*rate+s*57.; float k=floor(tt),fr=fract(tt);
      float d0=floor(hash21(id+k*.73)*10.),d1=floor(hash21(id+(k+1.)*.73)*10.); float p=smoothstep(.8,1.,fr);
      float dt=uT-uWaveT-d*uWaveK; float wave=uWaveT<900.?smoothstep(0.,.18,dt-s*.2):0.; float hit=(uWaveT<900.&&dt>0.)?exp(-dt*3.):0.; if(wave>.0&&wave<1.) p=1.;
      float ch=f.y>.5?(p>.02?d1:d0):(p>.5?d1:d0); vec2 inner=vec2(.12,.08); vec2 g=(f-inner)/(1.-2.*inner);
      float gly=texture(tA,vec2((ch+clamp(g.x,0.,1.))/uN,clamp(g.y,0.,1.))).r*step(0.,g.x)*step(g.x,1.)*step(0.,g.y)*step(g.y,1.);
      float detail=smoothstep(.36,.15,px); float avg=.2*(.8+.4*hash21(id+3.3)); float v=mix(avg,gly,detail);
      float rim=uPatchR>0.?d/uPatchR:0.; vec3 ink=mix(vec3(.62,.72,.86)*.5*(.4+.9*s),vec3(1.,.70,.24)*3.6*(.62+.8*smoothstep(1.,.15,rim)+.9*smoothstep(.8,1.,rim)),inP); vec3 sea=vec3(.015,.72,.25)*(.7+.3*s+4.*hit)*(.45+1.3*fbm(P*.02+vec2(uT*.14,-uT*.09),3)); ink=mix(ink,sea,wave*(1.-inP));
      vec3 c=mix(vec3(.006,.012,.018),ink,v)*uK; if(detail>.01){ float e=min(min(f.x,1.-f.x),min(f.y,1.-f.y)); c*=mix(1.,smoothstep(.0,.05,e)*(.6+.4*smoothstep(.0,.03,abs(f.y-.5))),detail); }
      c+=vec3(.9,.95,1.)*ring*.14*uK; O=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), m); mesh.frustumCulled = false; mesh.position.z = -5; return { mesh, u };
}

export function boardShots(ctx) {
  const { cam, world, lake, sky } = ctx;
  // 虚像坐标系：板子“沉”在水下，朝向斜上方的镜头；实物是它对水面的镜像
  const EA = 42 * Math.PI / 180, YB = 260, ZB = -400, D = 495, ce = Math.cos(EA), se = Math.sin(EA);
  const vp = (x, y, z, out = new THREE.Vector3()) => out.set(x, -YB + y * ce + z * se, ZB - y * se + z * ce);
  const MG = new THREE.Group(); MG.scale.y = -1; const BV = new THREE.Group(); BV.position.set(0, -YB, ZB); BV.rotation.x = -EA; MG.add(BV); world.add(MG); ctx.groups.push(MG);
  const wall = digitWall(); BV.add(wall.mesh);
  const rowDef = [
    { to: '1,344.00', tw: 3.3, th: 5.1, y: 7.6, lock: B(14) },
    { to: '×1,250,081,601', tw: 1.92, th: 3.0, y: .4, lock: B(15) },
    { to: '=1,680,109,671,744', tw: 1.5, th: 2.35, y: -5.2, lock: B(15.5) },
  ];
  const rows = rowDef.map(d => { const f = makeFlaps(d.to.length, d.tw, d.th); f.u.uKey.value = 3.2; f.u.uAmb.value = .05; f.u.uDur.value = .085; f.u.uTintC.value.set(.1, 1, .45); f.u.uGlow.value = 1.1; f.u.uInk.value.setRGB(.96, .93, .86); BV.add(f.mesh); return { ...d, f, x0: -(d.to.length - 1) / 2 * d.tw }; });
  const labs = [['最后一笔成交价', 11.5], ['全部股数', 2.9], ['市值', -3.1]].map(([s, y]) => { const m = textPlane(s, { size: 120, weight: 800, family: 'NSans', color: '#E9E2D2', height: 2.5, gain: 1.8, additive: false }); m.position.set(0, y, .3); BV.add(m); return m; });
  // 水里的字（按画面比例摆）
  const T = (s, o) => { const m = textPlane(s, { weight: 700, family: 'LoraV', height: 60, additive: false, ...o }); BV.add(m); return m; };
  const tVol = T('3,001,459 股', { size: 170, color: '#FFE0A6', gain: 2 }), tVol2 = T('当天成交', { size: 120, family: 'NSans', color: '#FFF1DC', gain: 1.7, height: 34 }), tPct = T('0.24%', { size: 200, color: '#FFD27A', gain: 2.4, height: 60 }), tAll = T('99.76%', { size: 240, color: '#FFF1E0', gain: 2.2, height: 86 }), tAll2 = T('一股没动', { size: 120, family: 'NSans', color: '#FFF1DC', gain: 1.8, height: 34 }), tDrop = T('−12.5 亿', { size: 220, color: '#2EE08A', gain: 2.2, height: 6.6 });
  const texts = [tVol, tVol2, tPct, tAll, tAll2];
  toWater(MG);
  const place = (m, V, y, a = 1) => { const k = V / 400; m.visible = a > .01; m.position.set(0, y * k, 2); m.scale.setScalar(k); m.material.opacity = a; };
  const NEW1 = '1,343.00', NEW3 = '=1,678,859,590,143', T4 = B(20.75), T5 = B(21.75);
  const dig = (i, st) => ((st * 7 + i * 13) % 10 + 10) % 10;
  function setRows(t) {
    rows.forEach((d, ri) => { const f = d.f, n = d.to.length;
      if (t < d.lock) { const step = .09; for (let i = 0; i < n; i++) { const st = Math.floor((t - B(11)) / step + i * .37); f.A.aXY[i * 2] = d.x0 + i * d.tw; f.A.aXY[i * 2 + 1] = d.y; f.A.aFrom[i] = dig(i, st - 1); f.A.aTo[i] = dig(i, st); f.A.aStart[i] = B(11) + (st - i * .37) * step; f.A.aTint[i] = 0; } f.u.uDur.value = .085; }
      else { f.u.uDur.value = .17; const fromR = Array.from({ length: n }, (_, i) => String(dig(i, 3))).join(''); if (ri === 0 && t >= T4) setRow(f, 0, d.to, NEW1, T4, { x0: d.x0, y: d.y, stagger: 0, tint: 1, tw: d.tw }); else if (ri === 2 && t >= T5) setRow(f, 0, d.to, NEW3, T5, { x0: d.x0, y: d.y, stagger: .05, tint: 1, tw: d.tw }); else setRow(f, 0, fromR, d.to, d.lock, { x0: d.x0, y: d.y, stagger: .025, tw: d.tw }); }
      f.u.uT.value = t; f.commit(); });
  }
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  // 镜头是一支长焦：只平移和变焦，水面的涟漪负责让画面活起来
  const view = (cx, cy, V, drift = 0) => { vp(cx + drift, cy, D, v1); vp(cx, cy, 0, v2); cam.position.copy(v1); cam.up.set(0, ce, -se); cam.lookAt(v2); cam.fov = 2 * Math.atan(V / 2 / D) * 180 / Math.PI; cam.near = 1; cam.far = 60000; cam.updateProjectionMatrix(); const L = vp(cx, cy + 12, 40, new THREE.Vector3()); rows.forEach(r => r.f.u.uL.value.set(L.x, -L.y, L.z)); };
  const hit = () => { const k = cam.position.y / (cam.position.y - v2.y); return [cam.position.x + (v2.x - cam.position.x) * k, cam.position.z + (v2.z - cam.position.z) * k]; };
  const water = (t, chop = .22, dist = .009) => { BV.scale.setScalar(1); ctx.hideOthers(MG); ctx.lakeCommon(t); sky.u.uMoonK.value = 0; lake.u.uMoon.value.set(.02, .68, -.73).normalize(); lake.u.uGlit.value = .05; lake.u.uFogK.value = 0; lake.u.uChop.value = chop; lake.u.uDist.value = dist; lake.u.uMirror.value = 1; lake.u.uDeep.value.setRGB(0, .002, .004); wall.u.uT.value = t; texts.forEach(m => { m.visible = false; }); tDrop.visible = false; };
  const show = r => { rows.forEach(d => { d.f.mesh.visible = r; }); labs.forEach(m => { m.visible = r; }); };
  const bl = pp => { pp.bloom = .16; pp.threshold = .95; pp.vig = .42; pp.exposure = 1.12; pp.contrast = 1.06; pp.sat = 1.08; };
  // 低机位：整片湖的倒影都是数字，算术题就写在水里
  const m0 = {
    a: B(9.5), b: B(11), scene: world, samples: 8, samplesDraft: 3, subDark: .9,
    update(t, u, pp) {
      water(t, .3, .012); view(0, 2.2, 41); BV.scale.setScalar(13); show(true); labs.forEach(m => { m.visible = false; }); wall.u.uPatchK.value = 0; wall.u.uWaveT.value = 999; wall.u.uK.value = .9; wall.u.uRate.value = .6; setRows(t); sky.u.uMoon.value.set(.1, .07, -.99).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = 1; lake.u.uGlit.value = .3; lake.u.uFogK.value = 1; lake.u.uMirror.value = .96; lake.setRipples([[0, -40, B(9.5), 1.6], [-34, -18, B(10), 1.2], [28, -70, B(10.5), 1.2]]);
      const k = E.io2(seg(t, B(9.5), B(11) - .5)), d = E.in3(seg(t, B(11) - .6, B(11))); cam.position.set(lerp(lerp(-5, 5, k), 0, d), lerp(7, 3, d), lerp(lerp(124, 92, k), -170, d)); cam.up.set(0, 1, 0); cam.lookAt(0, lerp(-175, -300, d), lerp(-300, -340, d)); cam.fov = lerp(62, 22, d); cam.near = 1; cam.far = 60000; cam.updateProjectionMatrix();
      bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const m1 = {
    a: B(11), b: B(16), scene: world, samples: 10, samplesDraft: 3, subDark: .92,
    update(t, u, pp) {
      water(t); show(true); wall.u.uPatchK.value = 0; wall.u.uWaveT.value = 999; wall.u.uK.value = 1; wall.u.uRate.value = .6; setRows(t); labs[0].visible = t > B(13.4); labs[1].visible = t > B(14.8); labs[2].visible = t > B(15.3);
      const z = E.io3(seg(t, B(12.1), B(13.3))), s = seg(t, B(11), B(12.1)); const cx = lerp(lerp(-5.4, -1.2, s), 0, z), cy = lerp(7.6, 2.2, z), V = Math.exp(lerp(Math.log(7), Math.log(41), z)); view(cx, cy, V, Math.sin(t * .5) * 3); lake.u.uGlit.value = 0;
      const h = hit(); lake.setRipples([[h[0], h[1], B(14), 1.1], [h[0], h[1], B(15), 1.1], [h[0], h[1], B(15.5), 1.1]]); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  // 0.24%：长焦拉到全貌，金点缩成针尖；全貌时金点面积正好占画面 0.24%
  const VF = 400, PR_ = VF * .031;
  const m4 = {
    a: B(16), b: B(18.5), scene: world, samples: 8, samplesDraft: 3, subDark: .9,
    update(t, u, pp) {
      water(t); show(false); wall.u.uPatchK.value = 1; wall.u.uPatchR.value = PR_; wall.u.uWaveT.value = 999; wall.u.uK.value = 1.3; wall.u.uRate.value = .6;
      const k = E.io3(seg(t, B(16.2), B(18.2))); const V = Math.exp(lerp(Math.log(30), Math.log(VF), k)); view(0, 0, V); const h = hit(); lake.setRipples([[h[0], h[1], B(16), .6]]);
      place(tVol, V, 128, ss(B(16.9), B(17.15), t)); place(tVol2, V, 84, ss(B(16.9), B(17.15), t)); place(tPct, V, -78, ss(B(17.5), B(17.7), t)); pp.bloom = .2; pp.threshold = .95; pp.vig = .3; pp.exposure = 1.15; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  const m5 = {
    a: B(18.5), b: B(20.5), scene: world, samples: 8, samplesDraft: 3, subDark: .9,
    update(t, u, pp) {
      water(t, .7, .02); lake.u.uMoon.value.set(.3, .6, -.74).normalize(); lake.u.uGlit.value = .2; lake.u.uBroad.value = 0; show(false); wall.u.uPatchK.value = 1; wall.u.uPatchR.value = PR_; wall.u.uC.value.set(0, 0); wall.u.uWaveT.value = B(18.6); wall.u.uWaveK.value = .0072; wall.u.uRingW.value = 16; wall.u.uK.value = 1.3; wall.u.uRate.value = .6;
      const V = lerp(VF, 372, E.out3(seg(t, B(18.5), B(20.5)))); view(0, 0, V); const h = hit(); lake.u.uRipK.value = .3; lake.setRipples([[h[0], h[1], B(18.6), 4.2]]);
      place(tAll, V, 130, ss(B(18.55), B(18.8), t)); place(tAll2, V, 72, ss(B(18.55), B(18.8), t)); pp.bloom = .24; pp.threshold = .9; pp.vig = .3; pp.exposure = 1.12; pp.sat = 1.15; return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  // 一滴水落下，一个 4 变成 3，涟漪扩到哪里，哪里的数字就变红
  const tw1 = rowDef[0].tw, cx0 = -(8 - 1) / 2 * tw1 + 4 * tw1, cy0 = rowDef[0].y;
  const m6 = {
    a: B(20.5), b: B(24), scene: world, samples: 10, samplesDraft: 3, subDark: .92,
    update(t, u, pp) {
      water(t, .2, .008); show(true); wall.u.uPatchK.value = 0; wall.u.uC.value.set(cx0, cy0); wall.u.uWaveT.value = T4; wall.u.uWaveK.value = .1; wall.u.uRingW.value = 2.4; wall.u.uRate.value = .6; setRows(t);
      const a = E.io3(seg(t, B(21.45), B(22.1))); wall.u.uK.value = lerp(1, .42, a); lake.u.uGlit.value = 0; const V = Math.exp(lerp(Math.log(5.8), Math.log(41), a)); view(lerp(cx0, 0, a), lerp(cy0, 2.2, a), V); const h = hit(); lake.u.uRipK.value = 1; lake.setRipples([[h[0], h[1], T4, .7], [h[0], h[1], T5, .8]]);
      tDrop.visible = t > T5 + .3; tDrop.position.set(0, 15.8, 2); tDrop.scale.setScalar(1 + .2 * Math.exp(-(t - T5 - .3) * 6)); bl(pp); return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  ctx.board = { MG, BV, wall, view, water, setRows, rows, labs, v1, v2, cam, tDrop, show };
  return [m0, m1, m4, m5, m6];
}
