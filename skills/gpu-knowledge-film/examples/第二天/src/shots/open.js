import * as THREE from 'three';
import { W, H, UI, clamp, ss, seg, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { drawRich } from '../text.js';
import { GREEN, RED, drawScreen, camSet } from '../ctx.js';
import { tag, RED_L, WHITE } from '../util.js';
import { HIT1 } from '../script.js';

// —— 绿色城市：每根柱子是一只股票，封死的跌停板高高堆着卖单 ——
export function makeCity() {
  const nx = 88, nz = 60, n = nx * nz, r = rng(2025), box = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const mat = new THREE.ShaderMaterial({ uniforms: { uGrow: { value: 0 }, uHero: { value: 0 }, uMir: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`attribute float aH,aK; varying vec3 vL,vW; varying vec3 vNn; varying float vH; varying float vK; uniform float uGrow,uMir,uTime;
void main(){ vec3 p=position; float h=aH*uGrow*(aK>2.5?1.:1.); p.y*=max(h,.02); if(aK>.5&&aK<1.5) p.y*=1.+.03*sin(uTime*1.3+aH*40.);
 vec4 w=instanceMatrix*vec4(p,1.); w.y*=uMir; vW=(modelMatrix*w).xyz; vL=p; vNn=normal; vH=h; vK=aK; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.); }`,
    fragmentShader: /* glsl */`precision highp float; varying vec3 vL,vW; varying vec3 vNn; varying float vH,vK; uniform float uHero,uMir;
void main(){
  vec3 lock=vec3(.012,.82,.3), mid=vec3(.008,.2,.09), red=vec3(1.,.09,.06);
  vec3 c=vK<.5?lock:vK<1.5?mid:vK<2.5?red:mix(lock,vec3(1.),uHero);
  float top=step(.5,vNn.y);
  float g=clamp(vL.y/max(vH,.02),0.,1.);
  vec3 col=top>.5?c*(vK<.5?1.5:1.1):c*(.03+.46*g*g*g);
  if(vK>2.5) col=c*(top>.5?3.+uHero*6.:.5+uHero*1.6);
  float line=smoothstep(.0,.06,abs(fract(vL.y*2.2)-.5))*.5+.5; col*=top>.5?1.:line; if(top<.5&&vK<.5) col+=c*.5*smoothstep(.9,1.,g);
  float d=length(vW-cameraPosition); col*=exp(-d*.022);
  if(uMir<0.) col*=.2*exp(vW.y*.5);
  gl_FragColor=vec4(col,1.);
}` });
  const heroI = Math.floor(nz / 2) * nx + Math.floor(nx / 2);
  const hs = new Float32Array(n), ks = new Float32Array(n), M = new THREE.Matrix4();
  const mesh = new THREE.InstancedMesh(box, mat, n), mir = new THREE.InstancedMesh(box, mat.clone(), n); mir.material.uniforms.uMir.value = -1;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, q = r(); const kind = k === heroI ? 3 : q < .56 ? 0 : q < .975 ? 1 : 2;
    hs[k] = kind === 0 ? 1.5 + 3.4 * r() ** 1.6 : kind === 1 ? .3 + r() * .9 : kind === 2 ? .2 + r() * .3 : 6.2; ks[k] = kind;
    M.makeScale(.84, 1, .84); M.setPosition(i - nx / 2, 0, j - nz / 2); mesh.setMatrixAt(k, M); mir.setMatrixAt(k, M);
  }
  box.setAttribute('aH', new THREE.InstancedBufferAttribute(hs, 1)); box.setAttribute('aK', new THREE.InstancedBufferAttribute(ks, 1));
  mesh.frustumCulled = false; mir.frustumCulled = false;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000201); scene.add(mesh, mir);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .62, depthWrite: false })); floor.renderOrder = 1; scene.add(floor);
  const hero = (Math.floor(nx / 2) - nx / 2);
  return { scene, U: [mat.uniforms, mir.material.uniforms], hx: hero, hz: Math.floor(nz / 2) - nz / 2 };
}

export function openShots(c) {
  const { room, ph, cam, hand, V } = c, city = makeCity(), C = new THREE.PerspectiveCamera(30, W / H, .05, 400), P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const night = (pp, e = 1) => { pp.vig = .62; pp.threshold = 1.05; pp.knee = .7; pp.bloom = .16; pp.grain = .02; pp.exposure = e; pp.lift = [0, 0, 0]; pp.ca = .0012; };
  const T = { a: 0, heat: 5.0, city: 6.55, dive: 10.5, back: 11.55, low: 13.6, press: 14.75 };
  return [
    // 第一帧：手机特写，就是海报
    { a: T.a, scene: room.scene, samples: 8, samplesDraft: 2, disc: 1,
      update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); drawScreen(t < T.heat ? 'chart0' : 'heat'); c.poseCommon(t, GREEN, 1); night(pp, 1.05);
        const k = E.io2(seg(t, 0, T.heat)), k2 = E.in3(seg(t, T.heat, T.city));
        const p = P([.5, 2.75, 1.5], [.24, 2.45, 1.0], k), q = P(p, [.01, .42, .03], k2);
        camSet(cam, q, [lerp(.05, 0, k2), .03, lerp(.02, .02, k2)], 31, lerp(.07, 0, k2)); pp.aperture = .006; pp.focus = q[1]; return cam; } },
    // 屏幕里是城市的俯视：柱子长出来，镜头压低飞过去
    { a: T.city, scene: city.scene, samples: 8, samplesDraft: 2,
      update(t, l, pp) { night(pp, 1.1); pp.bloom = .2; const k = seg(t, T.city, 9.9), g = E.out3(seg(t, T.city + .15, T.city + 2.1)), d = E.in3(seg(t, T.dive, T.back));
        for (const u of city.U) { u.uGrow.value = g; u.uHero.value = ss(10.3, 10.6, t); u.uTime.value = t; }
        const e = E.io3(k); const a = [city.hx + .2, 26, city.hz + .1], b = [city.hx - 9, 8.4, city.hz + 30], l0 = [city.hx, 0, city.hz], l1 = [city.hx + 6, .5, city.hz - 12];
        const po = P(a, b, e), lo = P(l0, l1, e);
        const q = P(po, [city.hx + .01, 9.4, city.hz + .05], d), w = P(lo, [city.hx, 6.2, city.hz], E.out3(seg(t, 10.3, 11.1)));
        camSet(C, q, w, lerp(30, 36, e) - d * 6, Math.sin(k * 3.1) * .05); return C; } },
    // 回到手机：那一只还能卖
    { a: T.back, scene: room.scene, samples: 8, samplesDraft: 2, disc: 1,
      update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); drawScreen('clock', t); c.poseCommon(t, GREEN, 1); night(pp, 1.05);
        const k = E.io3(seg(t, T.back, T.low)); const q = P([.02, 2.7, .05], [2.3, .74, 5.0], k);
        camSet(cam, q, [0, lerp(.02, .78, k), 0], lerp(34, 30, k), lerp(0, -.03, k)); pp.aperture = .01 * k; pp.focus = Math.hypot(q[0], q[1], q[2]); return cam; } },
    // 低机位看一眼光柱：屋里只有这一盏灯
    { a: T.low, scene: room.scene, samples: 10, samplesDraft: 3, disc: 1,
      update(t, l, pp) { c.only(); c.noFinger(); c.layPhone(); drawScreen('chart'); c.poseCommon(t, GREEN, 1); night(pp, 1); const k = E.io2(seg(t, T.low, T.press));
        const q = [lerp(2.3, 1.9, k), lerp(.74, .68, k), lerp(5.0, 4.5, k)]; camSet(cam, q, [0, .78, 0], 30, -.03); pp.aperture = .012; pp.focus = 5; return cam; } },
    // 手指伸进来，全片第一次压低
    { a: T.press, scene: room.scene, samples: 10, samplesDraft: 3, disc: 1,
      update(t, l, pp) { c.only(); c.layPhone(); const k = E.io2(seg(t, T.press, HIT1 - .3)), p2 = seg(t, HIT1 - .36, HIT1); drawScreen('chart'); c.poseCommon(t, GREEN, .92 + .3 * p2); night(pp, .98 - k * .1);
        const tip = V(lerp(.95, .05, E.out3(k)), lerp(.9, .1, E.out3(k)) - p2 * .055, lerp(1.7, .69, E.out3(k))); c.finger(tip);
        const q = [.5, 2.05, 1.92]; camSet(cam, q, [.03, .05, .42], 21 - k * 3, .05); pp.aperture = .03; pp.focus = Math.hypot(q[0] - .05, q[1], q[2] - .69); return cam; } },
    // 你手里那只：回到开头那座城，那根白柱
    { a: 121.45, scene: city.scene, samples: 8, samplesDraft: 2, subDark: .7,
      update(t, l, pp) { night(pp, 1.1); pp.bloom = .2; for (const u of city.U) { u.uGrow.value = 1; u.uHero.value = 1; u.uTime.value = t; } const k = E.io2(seg(t, 121.45, 124.7)), a = lerp(.7, 1.5, k); camSet(C, [Math.sin(a) * 15, 8.4, Math.cos(a) * 15], [0, 5.2, 0], 30, -.03); return C; },
      label(x, t) { const a = ss(122.6, 123.1, t) * (1 - ss(124.3, 124.6, t)); if (a > 0) { x.save(); x.globalAlpha = a; x.textAlign = 'center'; x.font = `900 ${240 * UI}px NSerif`; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 30 * UI; x.fillText('？', W / 2 + 12 * UI, 620 * UI); x.restore(); } } },
    // 片名
    { a: HIT1, scene: room.scene, samples: 8, samplesDraft: 2, disc: 1,
      update(t, l, pp) { c.only(); c.layPhone(); drawScreen('sold', 0); c.poseCommon(t, GREEN, lerp(1.5, .1, E.out3(seg(l, 0, 1.2)))); night(pp, 1);
        const up = E.io2(seg(l, .35, 1.9)); const tip = V(.05 + up * 1.2, .045 + up * 1.2, .69 + up * 1.2); c.finger(tip); hand.visible = l < 1.95;
        const q = [.5, 2.05, 1.92]; camSet(cam, q, [.03, .05, .42], 18, .05); pp.aperture = .02; pp.focus = 2.2;
        pp.fx = [{ fx: 'shock', k: E.out3(seg(l, 0, 1.3)) * 1.25, c: [.47, .36], w: .1, amp: .045, split: .018, col: [.2, 1, .55] }]; return cam; },
      label(x, t) { const l = t - HIT1, a = ss(.02, .4, l) * (1 - ss(2.0, 2.3, l)); if (a <= 0) return; x.save(); x.globalAlpha = a; x.textAlign = 'center'; x.fillStyle = '#FFFFFF'; x.shadowColor = 'rgba(120,255,190,.75)'; x.shadowBlur = 54 * UI; x.font = `900 ${250 * UI}px NSerif`; const sp = lerp(1.04, 1, E.out3(seg(l, 0, 1.8))); x.translate(W / 2, 800 * UI); x.scale(sp, sp); x.fillText('第二天', 0, 0); x.fillText('第二天', 0, 0); x.restore(); } },
  ];
}
