import * as THREE from 'three';
import { W, H, UI, clamp, ss, seg, E, lerp, rng } from '../core.js';
import { GREEN, RED, drawScreen, camSet } from '../ctx.js';
import { tag, RED_L, GREEN_L, WHITE } from '../util.js';
import { candleMat } from '../world.js';
import { night } from './mid.js';
import { HIT2 } from '../script.js';

// 被踩下去的网：想走的人太多，价钱被压过了头
function makeNet() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); const U = { uD: { value: 0 }, uT: { value: 0 } };
  const net = new THREE.Mesh(new THREE.PlaneGeometry(44, 44, 220, 220).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float uD,uT; varying vec3 vP; varying float vK; void main(){ vec3 p=position; float r=length(p.xz); float k=exp(-r*r/26.); p.y-=uD*k; p.y+=sin(r*2.2-uT*7.)*.05*exp(-r*.2)*uD; vP=position; vK=k; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `varying vec3 vP; varying float vK; void main(){ vec2 g=abs(fract(vP.xz/1.1-.5)-.5)/fwidth(vP.xz/1.1); float l=1.-min(min(g.x,g.y),1.); vec3 c=mix(vec3(.02,.5,.24),vec3(.06,1.3,.6),vK); gl_FragColor=vec4(c*l*exp(-length(vP.xz)*.09),1.); }` }));
  scene.add(net);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.62, 32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.3) })); scene.add(ball);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.46, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.DoubleSide })); scene.add(ring);
  const n = 7000, r = rng(4), p = new Float32Array(n * 3), s = new Float32Array(n); for (let i = 0; i < n; i++) { const a = r() * 6.28, R = 1.5 + r() * 14; p.set([Math.cos(a) * R, r() * 12, Math.sin(a) * R], i * 3); s[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uT: U.uT, uA: { value: 1 }, uPx: { value: H / 960 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aS; uniform float uT,uPx; varying float vA; void main(){ float k=fract(aS*7.3+uT*(.5+aS*.5)); vec3 q=position; q.xz*=1.-k*.92; q.y=12.*(1.-k)-k*k*2.4; vA=smoothstep(0.,.1,k)*smoothstep(1.,.92,k); vec4 mv=modelViewMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPx*48./max(1.,-mv.z); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.) discard; gl_FragColor=vec4(vec3(.06,1.3,.6)*vA*(1.-d),1.); }` })); pts.frustumCulled = false; scene.add(pts);
  return { scene, U, ball, ring, pts, cam: new THREE.PerspectiveCamera(34, W / H, .1, 200) };
}

// 分时悬崖：一天的跌，走到 2 点 50 已经走完了（曲线是示意）
function makeCliff() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); const n = 240, r = rng(47), L = 26, Hg = 26; let v = 0, ys = [];
  for (let i = 0; i <= n; i++) { const u = i / n, k = Math.min(1, u / .93), tgt = -(1 - (1 - k) ** 1.6) * Hg; v += (r() - .5) * .36; v *= .93; ys.push(tgt + v * (1 - k * .7)); }
  const pos = new Float32Array((n + 1) * 6), hv = new Float32Array((n + 1) * 2), idx = []; for (let i = 0; i <= n; i++) { const x = i / n * L; pos.set([x, ys[i], 0, x, -Hg - 2, 0], i * 6); hv[i * 2] = 1; hv[i * 2 + 1] = 0; if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aH', new THREE.BufferAttribute(hv, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: `attribute float aH; varying float vH; void main(){ vH=aH; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vH; void main(){ float l=smoothstep(.992,1.,vH); gl_FragColor=vec4(vec3(.03,1.,.42)*(pow(vH,5.)*.3+l*5.),1.); }` });
  scene.add(new THREE.Mesh(g, m));
  const open = new THREE.Mesh(new THREE.BoxGeometry(60, .03, .03).translate(20, 0, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(.7, .7, .7) })); scene.add(open);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.26, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); scene.add(dot);
  const Yat = x => { const f = clamp(x / L) * n, i = Math.min(n - 1, Math.floor(f)); return lerp(ys[i], ys[i + 1], f - i); };
  return { scene, dot, L, Hg, Yat, cam: new THREE.PerspectiveCamera(34, W / H, .1, 300) };
}

// 跌，你全吃了。涨，你走了。
function makeCrash(c) {
  const n = 520, r = rng(93), box = new THREE.BoxGeometry(1, 1, 1), scene = c.room.scene;
  const mat = new THREE.ShaderMaterial({ vertexShader: `attribute vec3 aC; varying vec3 vC,vL,vN; void main(){ vC=aC; vL=position; vN=normal; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vC,vL,vN; void main(){ vec3 a=abs(vL); float top=step(.5,abs(vN.y)); float e=top>.5?min(.5-a.x,.5-a.z):(abs(vN.x)>.5?.5-a.z:.5-a.x); float g=vL.y+.5; gl_FragColor=vec4(vC*(top*1.5+(1.-top)*(.14+.8*g*g))+vC*(1.-smoothstep(0.,.08,e))*1.5,1.); }` });
  const mesh = new THREE.InstancedMesh(box, mat, n), C = new Float32Array(n * 3), b = []; for (let i = 0; i < n; i++) { const g = i < 300; const a = r() * 6.28, R = g ? 1.5 + r() ** .7 * 3.6 : .6 + r() * 3.6; b.push({ g, x: g ? Math.cos(a) * R : Math.cos(a) * R, z: g ? Math.sin(a) * R - .5 : Math.sin(a) * R * .5 - 3.4, w: g ? .05 + r() * .06 : .11 + r() * .1, h: g ? .3 + r() * .9 : 1 + r() * 2.2, t0: g ? HIT2 + r() * 1.7 : HIT2 + 2.13 + r() * 2.4, v: 10 + r() * 12, rest: r() * r() * 1.1 * Math.exp(-(R - 1.5) * .42) }); const col = g ? [.02, .95, .38] : [1, .05, .035]; C.set(col, i * 3); }
  box.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 3)); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  const mir = new THREE.InstancedMesh(box, mat, n); mir.instanceMatrix = mesh.instanceMatrix; mir.frustumCulled = false; c.room.under.add(mir); c.extras.push(mesh, mir);
  const O = new THREE.Object3D();
  return { mesh, mir, set(t) { for (let i = 0; i < n; i++) { const o = b[i], d = t - o.t0; let y, s = d > 0 ? 1 : .0001; if (o.g) { y = Math.max(o.rest + o.h / 2, 9 - .5 * 26 * d * d - o.v * d); } else { y = -o.h / 2 + 1.5 * o.h * ss(0, .1, d) + Math.max(0, d) ** 2 * o.v * 1.7; } O.position.set(o.x, y, o.z); O.scale.set(o.w * 2, o.h, o.w * 2); O.rotation.set(0, i, 0); O.scale.multiplyScalar(s); O.updateMatrix(); mesh.setMatrixAt(i, O.matrix); } mesh.instanceMatrix.needsUpdate = true; } };
}

export function turnShots(c) {
  const { room, cam, V } = c, nt = makeNet(), cf = makeCliff(), cr = makeCrash(c);
  return [
    { a: 74.2, scene: nt.scene, samples: 8, samplesDraft: 2, subDark: .6,
      update(t, l, pp) { night(pp, 1.1); pp.bloom = .22; const press = E.in2(seg(t, 74.3, 76.2)), back = E.out3(seg(t, 76.35, 77)); const D = press * 5.6 * (1 - back * .55); nt.U.uD.value = D; nt.U.uT.value = t; nt.ball.position.y = .62 - D; nt.ball.material.color.setRGB(lerp(2.2, 3.2, back), lerp(2.4, .3, back), lerp(2.3, .22, back)); nt.pts.visible = t < 76.3; camSet(nt.cam, [7.5, 7, 17], [0, -1.8, 0], 32, -.04); return nt.cam; },
      label(x, t) { const a = ss(74.6, 75, t); tag(x, '本来的价', W * .68, 640 * UI, { size: 58, color: WHITE, alpha: a, shadow: 14 }); } },
    { a: 77, scene: cf.scene, samples: 8, samplesDraft: 2, subDark: .6,
      update(t, l, pp) { night(pp, 1.1); pp.bloom = .2; const k = E.io2(seg(t, 77.1, 80.6)), x = k * cf.L * .93, y = cf.Yat(x) + .26; cf.dot.position.set(x, y, .1); const w = E.io3(seg(t, 80.3, 83.2));
        const dr = E.io2(seg(t, 83.2, 87.3)); const q = [lerp(x + 1.6, 12, w), lerp(y + 3.4, -12, w), lerp(17, 68, w) - dr * 7], lk = [lerp(x + 2.4, 13, w) + dr * 2, lerp(y - 2, -14, w) - dr * 2, 0]; camSet(cf.cam, q, lk, 34, -.03 * (1 - w)); return cf.cam; },
      label(x, t) {
        const k = E.io2(seg(t, 77.1, 80.6)), mm = 570 + k * 320, hh = Math.floor(mm / 60), a = ss(77.1, 77.5, t);
        tag(x, `${String(hh).padStart(2, '0')}:${String(mm % 60 | 0).padStart(2, '0')}`, W / 2, 250 * UI, { size: 150, color: WHITE, alpha: a, weight: 800, family: 'JB', shadow: 24 });
        const b = ss(83.3, 83.7, t); if (b > 0) { tag(x, '−8,640 元', W / 2, 460 * UI, { size: 130, color: GREEN_L, alpha: b, weight: 900, family: 'JB', shadow: 26 }); tag(x, '已经发生了', W / 2, 584 * UI, { size: 62, color: WHITE, alpha: b, shadow: 16 }); }
        const s = ss(77.4, 77.8, t) * (1 - ss(86.6, 87, t)); x.save(); x.globalAlpha = s * .5; x.font = `500 ${30 * UI}px NSans`; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText('分时走势为示意', W / 2, 92 * UI); x.restore(); } },
    // 抽空：全黑，只剩一点光
    { a: 87.3, scene: room.scene, samples: 6, samplesDraft: 2,
      update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); drawScreen('sold', 0); c.poseCommon(t, GREEN, 0); night(pp, 1); camSet(cam, [0, 1.2, 9], [0, .4, 0], 24); return cam; },
      // 一条线是收盘，白点是你。线的那边隐约亮起来，就是第二天
      hud(x, l, t) { const a = ss(87.5, 88, t), y = 1160 * UI, g = x.createLinearGradient(W * .5, 0, W, 0), red = ss(91, 93.6, t); x.save(); x.globalAlpha = a; x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 3 * UI; x.beginPath(); x.moveTo(W * .5, 760 * UI); x.lineTo(W * .5, 1500 * UI); x.stroke();
        if (red > 0) { const rg = x.createRadialGradient(W * .62, y, 10 * UI, W * .62, y, 560 * UI); rg.addColorStop(0, `rgba(255,44,32,${.62 * red})`); rg.addColorStop(1, 'rgba(255,44,32,0)'); x.save(); x.beginPath(); x.rect(W * .5, 0, W * .5, H); x.clip(); x.fillStyle = rg; x.fillRect(0, 0, W, H); x.restore(); } x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 30 * UI; x.beginPath(); x.arc(W * .5 - 90 * UI, y, 20 * UI, 0, 7); x.fill(); x.restore(); } },
    // 第二记重音
    { a: HIT2 - .02, scene: room.scene, samples: 10, samplesDraft: 3, subDark: .75,
      update(t, l, pp) { c.only(cr.mesh, cr.mir); c.noFinger(); c.layPhone(); drawScreen('sold', 0); night(pp, 1.08); pp.bloom = .3; cr.set(t); const red = ss(HIT2 + 2.1, HIT2 + 2.5, t); room.U.uPow.value = 1; c.poseCommon(t, red > .5 ? RED : GREEN, lerp(1.1, .9, red)); room.U.uPos.value.set(0, .5, 0); ph(c); const s = l < 2 ? 0 : .0;
        camSet(cam, [1.2, 5.6, 8.2], [0, .75, -.3], 30, -.03 + Math.sin(t * 9) * .004 * Math.exp(-l)); pp.fx = [];
        const hit = (t0) => { const d = t - t0; if (d >= 0 && d < 1.1) pp.fx.push({ fx: 'shock', k: E.out3(d / 1.1) * 1.4, c: [.5, .56], w: .13, amp: .06, split: .024, col: [.8, .75, .9] }); if (d >= 0 && d < .07) pp.fx.push({ fx: 'ink', k: 1, thr: .3 }); if (d >= 0 && d < .4) pp.fx.push({ fx: 'lens', k: 1.3 * Math.exp(-d * 6), c: [.5, .55] }); };
        hit(HIT2); hit(HIT2 + 2.13); return cam; } },
  ];
}
function ph(c) { c.ph.scr.color.setRGB(0, 0, 0); }
