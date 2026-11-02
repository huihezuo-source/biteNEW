import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, UI, clamp, ss, seg, E, lerp, rng } from '../core.js';
import { camSet } from '../ctx.js';
import { tag, topShade, RED_L, GREEN_L, WHITE } from '../util.js';
import { DATA } from '../data.js';
import { night } from './mid.js';

const COLS = 9, PW = .62, PL = 1.3, TW = 200, TH = 420;
const fmt = v => (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%';
function atlas(draw) { const c = document.createElement('canvas'); c.width = TW * 13; c.height = TH * 5; const x = c.getContext('2d'); DATA.big.forEach((d, i) => { x.save(); x.translate((i % 13) * TW, Math.floor(i / 13) * TH); x.beginPath(); x.rect(0, 0, TW, TH); x.clip(); draw(x, d, i); x.restore(); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const front = atlas((x, d) => { x.fillStyle = '#04170d'; x.fillRect(0, 0, TW, TH); x.textAlign = 'center'; x.fillStyle = '#BFEBD3'; x.font = '700 25px JB'; x.fillText(d[0], TW / 2, 62); x.fillStyle = '#17F285'; x.font = '800 36px JB'; x.fillText(fmt(d[1]), TW / 2, 210); x.strokeStyle = '#17F285'; x.lineWidth = 7; x.beginPath(); x.moveTo(28, 250); for (let k = 1; k <= 8; k++) x.lineTo(28 + k * 18, 250 + k * k * 1.5 + (k % 2) * 8); x.stroke(); x.fillStyle = '#7FA58F'; x.font = '700 24px JB'; x.fillText('14:50', TW / 2, 392); });
const back = atlas((x, d) => { const up = d[2] > 0; x.fillStyle = up ? '#E8211A' : '#0BC46E'; x.fillRect(0, 0, TW, TH); x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = '700 26px NSans'; x.fillText('第二天', TW / 2, 70); x.font = '900 44px JB'; x.fillText(fmt(d[2]), TW / 2, 226); });

function faceMat(map, isBack) {
  return new THREE.ShaderMaterial({ uniforms: { map: { value: map }, uB: { value: isBack ? 1 : 0 } },
    vertexShader: `attribute vec4 aT; varying vec2 vUv; varying float vG; void main(){ vec2 t=uv; ${isBack ? 't=1.-t;' : ''} vUv=(vec2(aT.x,4.-aT.y)+t)/vec2(13.,5.); vG=${isBack ? 'aT.w' : 'aT.z'}; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vG; void main(){ vec4 c=texture2D(map,vUv); gl_FragColor=vec4(pow(c.rgb,vec3(2.2))*vG,1.); }` });
}

export function deckShots(c) {
  const N = DATA.big.length, scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const up = DATA.big.map(d => d[2] > 0), T = new Float32Array(N * 4); for (let i = 0; i < N; i++) { T[i * 4] = i % 13; T[i * 4 + 1] = Math.floor(i / 13); }
  const qF = new THREE.PlaneGeometry(PW * .95, PL * .96).rotateX(-Math.PI / 2).translate(0, .036, 0), qB = new THREE.PlaneGeometry(PW * .95, PL * .96).rotateX(Math.PI / 2).translate(0, -.036, 0);
  const attr = new THREE.InstancedBufferAttribute(T, 4); attr.setUsage(THREE.DynamicDrawUsage); qF.setAttribute('aT', attr); qB.setAttribute('aT', attr);
  const bodyG = new RoundedBoxGeometry(PW, .07, PL, 3, .04), bodyM = new THREE.MeshStandardMaterial({ color: 0x050607, metalness: .9, roughness: .35 });
  const body = new THREE.InstancedMesh(bodyG, bodyM, N), fA = new THREE.InstancedMesh(qF, faceMat(front, 0), N), bA = new THREE.InstancedMesh(qB, faceMat(back, 1), N);
  const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 2.1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aC; varying vec3 vC; varying vec2 vUv; void main(){ vC=aC; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vC; varying vec2 vUv; void main(){ vec2 d=(vUv-.5)*2.; float a=exp(-dot(d,d)*4.); gl_FragColor=vec4(vC*a,1.); }` }), N);
  const HC = new Float32Array(N * 3), hAttr = new THREE.InstancedBufferAttribute(HC, 3); hAttr.setUsage(THREE.DynamicDrawUsage); halo.geometry.setAttribute('aC', hAttr); halo.renderOrder = 3;
  const under = new THREE.Group(); under.scale.y = -1; const bodyU = new THREE.InstancedMesh(bodyG, bodyM, N), fU = new THREE.InstancedMesh(qF, fA.material, N), bU = new THREE.InstancedMesh(qB, bA.material, N);
  bodyU.instanceMatrix = body.instanceMatrix; fU.instanceMatrix = fA.instanceMatrix; bU.instanceMatrix = bA.instanceMatrix; under.add(bodyU, fU, bU);
  [body, fA, bA, halo, bodyU, fU, bU].forEach(m => { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .74, depthWrite: false })); table.renderOrder = 2;
  scene.add(under, table, body, fA, bA, halo);
  const stamp = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = '#033'; x.font = '900 84px NSans'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('卖', 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const k0 = new THREE.PointLight(0xffffff, 0, 40, 1.6); k0.position.set(0, 5, -6); scene.add(k0);
  const cam = new THREE.PerspectiveCamera(32, W / H, .05, 200);
  const r = rng(65), drop = Array.from({ length: N }, () => 47.9 + r() * 3.1);
  const tFlip = i => 59 + 4.45 * (1 - (1 - i / (N - 1)) ** 1.9), tSold = i => 55.4 + 3.3 * ((N - 1 - i) / (N - 1)) ** 1.7;
  const XZ = i => { const row = Math.floor(i / COLS), col = i % COLS, n = row === 7 ? 2 : COLS; return [(col - (n - 1) / 2) * .84, -6 + row * 1.56]; };
  // 每部手机盖一个“卖”。章在桌面上按透视拉长，像路面文字，低机位才读得出来
  const stampG = new THREE.PlaneGeometry(.58, .92).rotateX(-Math.PI / 2), stamps = Array.from({ length: N }, (_, i) => { const m = new THREE.Mesh(stampG, new THREE.MeshBasicMaterial({ map: stamp, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7) })), [ax, az] = XZ(i); m.position.set(ax, .1, az); m.renderOrder = 6; m.visible = false; scene.add(m); return m; });
  const reds = [], greens = []; for (let i = N - 1; i >= 0; i--) (up[i] ? reds : greens).push(i);
  // 两组对比：大跌之后 7 红 3 绿；平常的日子 5 红 5 绿
  const cmp = {}; const pick = (arr, n, base, gx, gz, row0, ids) => { for (let k = 0; k < n; k++) ids.push(arr.shift()); };
  const A = [], B = []; pick(reds, 7, 0, 0, 0, 0, A); pick(greens, 3, 0, 0, 0, 0, A); pick(reds, 5, 0, 0, 0, 0, B); pick(greens, 5, 0, 0, 0, 0, B);
  const place = (ids, x0) => ids.forEach((id, k) => { cmp[id] = [x0, .3 + k * .46, 0]; }); place(A, -1.45); place(B, 1.45);
  const O = new THREE.Object3D();
  function pose(t) {
    let nR = 0, nG = 0; const cmpK = E.io3(seg(t, 68.5, 69.5));
    for (let i = 0; i < N; i++) {
      const [gx, gz] = XZ(i), d = 1 - E.in2(seg(t, drop[i], drop[i] + .42)); const f = E.io2(seg(t, tFlip(i), tFlip(i) + .3)); if (t >= tFlip(i) + .15) up[i] ? nR++ : nG++;
      let x = gx, z = gz, y = .05 + d * 9 + Math.sin(f * Math.PI) * .62, s = t < drop[i] ? .0001 : 1, lift = 0;
      const u = up[i]; lift += (u ? 1 : -.0) * ss(63.7, 64.2, t) * (1 - ss(66.3, 66.7, t)) * .28 + (u ? 0 : 1) * ss(66.5, 66.9, t) * (1 - ss(68.3, 68.6, t)) * .28; y += lift;
      const t2 = cmp[i]; if (t2) { const dk = E.io3(seg(t, 68.5 + (B.includes(i) ? 3.2 : 0) + t2[1] * .05, 69.3 + (B.includes(i) ? 3.2 : 0) + t2[1] * .05)); x = lerp(gx, t2[0], dk); z = lerp(gz, t2[2], dk); y = lerp(y, t2[1], dk) + Math.sin(dk * Math.PI) * 1.4; if (B.includes(i)) s *= t > 69 && t < 71.6 ? .0001 : 1; } else s *= 1 - ss(68.5, 69.1, t) + .0001;
      O.position.set(x, y, z); O.rotation.set(0, 0, Math.PI * f); O.scale.setScalar(Math.max(.0001, s) * (t2 ? lerp(1, 1.72, E.io3(seg(t, 68.5 + (B.includes(i) ? 3.2 : 0), 69.3 + (B.includes(i) ? 3.2 : 0)))) : 1)); O.updateMatrix();
      body.setMatrixAt(i, O.matrix); fA.setMatrixAt(i, O.matrix); bA.setMatrixAt(i, O.matrix);
      const sold = 1 - ss(tSold(i), tSold(i) + .1, t) * .95, spike = Math.exp(-Math.abs(t - tSold(i)) * 26), dim = u ? 1 - ss(66.5, 66.7, t) * (1 - ss(68.3, 68.5, t)) * .97 : 1 - ss(63.7, 63.9, t) * (1 - ss(66.3, 66.5, t)) * .97;
      T[i * 4 + 2] = 2.2 * sold + spike * 7; T[i * 4 + 3] = 1.25 * dim;
      const col = u ? [1, .06, .04] : [.03, 1, .42], g = f > .5 ? dim * .9 * ss(.5, 1, f) : .34 * sold * (t > drop[i] ? 1 : 0);
      const c0 = f > .5 ? col : [.03, 1, .42], tw = t > 68.6 ? 0 : 1; HC[i * 3] = c0[0] * g * s * tw; HC[i * 3 + 1] = c0[1] * g * s * tw; HC[i * 3 + 2] = c0[2] * g * s * tw;
      O.position.y = .004; O.rotation.set(0, 0, 0); O.updateMatrix(); halo.setMatrixAt(i, O.matrix);
    }
    attr.needsUpdate = true; hAttr.needsUpdate = true; for (const m of [body, fA, bA, halo]) m.instanceMatrix.needsUpdate = true;
    return [nR, nG];
  }
  let counts = [0, 0]; const HERO = (() => { for (let i = 5; i < N; i++) if (up[i]) return i; return 5; })();
  return [{ a: 47.3, scene, samples: 16, samplesDraft: 3, subDark: .55,
    update(t, l, pp) { night(pp, 1.08); pp.bloom = .24; counts = pose(t); k0.intensity = 40; { const off = 1 - ss(58.8, 59.05, t); stamps.forEach((m, i) => { const d = t - tSold(i); m.visible = d > 0 && off > 0; if (m.visible) { m.scale.setScalar(lerp(1.7, 1, E.in2(clamp(d / .08)))); m.material.opacity = off * lerp(1, .72, ss(.1, .5, d)); } }); } const P = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      const a = E.io2(seg(t, 47.3, 51.5)), b = E.io2(seg(t, 51.5, 58.9)), mac = E.io3(seg(t, 58.9, 59.35)), d = E.io3(seg(t, 60.75, 63.4)), e = E.io3(seg(t, 68.5, 69.8));
      let q = P([-2, 15, 12], [1.8, 2.9, 7.6], a), lk = P([0, 0, 0], [0, .1, 2.2], a);
      q = P(q, [-1.2, 3.7, 3.6], b); lk = P(lk, [.4, 0, -3.1], b);
      { const [mx, mz] = XZ(HERO); q = P(q, [mx + .3, 1.5, mz + .78], mac); lk = P(lk, [mx, .1, mz - .2], mac); }
      q = P(q, [0, 21.5, 1.6], d); lk = P(lk, [0, 0, -.2], d);
      q = P(q, [.36, 8, 14.2], e); lk = P(lk, [0, 2.45, 0], e);
      camSet(cam, q, lk, 32, lerp(.08, 0, Math.max(d, e))); pp.aperture = lerp(.012, 0, Math.max(d, mac)) + e * .008 + mac * (1 - d) * .012; pp.focus = lerp(lerp(7.5, 1.75, mac), 13.6, e);
      // 落进字幕带的章压暗，白字不压白章
      if (t > 55.3 && t < 59.1) { cam.updateMatrixWorld(); const v = new THREE.Vector3(); stamps.forEach(m => { if (!m.visible) return; v.copy(m.position).project(cam); const k = ss(1380 * UI, 1560 * UI, (1 - v.y) / 2 * H); m.material.opacity *= 1 - .6 * k; m.material.color.setScalar(1.7 * (1 - .6 * k)); }); }
      return cam; },
    label(x, t) {
      if (t >= 51.6 && t < 55.1) { const a = ss(51.6, 52, t) * (1 - ss(54.8, 55.1, t)); tag(x, '65', W / 2, 330 * UI, { size: 240, color: '#3FE08E', alpha: a, weight: 900, family: 'JB', shadow: 30 }); }
      if (t >= 58.9 && t < 68.5) { const a = ss(58.9, 59.2, t); topShade(x, 400, .82 * a); const hiR = ss(63.7, 64, t) * (1 - ss(66.4, 66.7, t)), hiG = ss(66.5, 66.8, t) * (1 - ss(68.3, 68.5, t)); tag(x, `涨 ${counts[0]}`, W * .29, 214 * UI, { size: 118 + hiR * 40, color: RED_L, alpha: a, weight: 900, shadow: 30 }); tag(x, `跌 ${counts[1]}`, W * .71, 214 * UI, { size: 118 + hiG * 40, color: GREEN_L, alpha: a, weight: 900, shadow: 30 }); }
      if (t >= 69 && t < 74.3) { const a = ss(69.2, 69.6, t) * (1 - ss(74, 74.3, t)), b = ss(72.3, 72.7, t) * (1 - ss(74, 74.3, t)); tag(x, '大跌的第二天', W * .29, 118 * UI, { size: 62, color: WHITE, alpha: a, shadow: 18 }); tag(x, '69%', W * .29, 232 * UI, { size: 130, color: RED_L, alpha: a, weight: 900, family: 'JB', shadow: 26 }); tag(x, '平常的日子', W * .71, 118 * UI, { size: 62, color: WHITE, alpha: b, shadow: 18 }); tag(x, '53%', W * .71, 232 * UI, { size: 130, color: WHITE, alpha: b, weight: 900, family: 'JB', shadow: 26 }); }
    } }];
}
