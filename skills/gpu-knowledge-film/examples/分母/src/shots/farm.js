import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { W, H, UI, clamp, seg, ss, E, lerp, rng } from '../core.js';
import { makeEnv, makeScreen, bake } from '../phone.js';

// 荐股群 → 拉远：一排架子上的 29 部手机
const COL = 5, ROW = 6;
export function farmShots(ctx) {
  const { cam } = ctx;
  const env = makeEnv('room');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010101);
  const scr = makeScreen();
  const W_ = .0715, D = .1476, T = .008, GX = .112, GY = .205;
  // 机身
  const bodyG = new RoundedBoxGeometry(W_, D, T, 6, .0036);
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0x3a3b40, metalness: 1, roughness: .34, envMap: env, envMapIntensity: .8 });
  const scrG = new THREE.PlaneGeometry(W_ - .0018, D - .0018);
  const scrM = new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }); scrM.color.setScalar(1.35);
  const n = COL * ROW - 1;
  const body = new THREE.InstancedMesh(bodyG, bodyM, n), sm = new THREE.InstancedMesh(scrG, scrM, n);
  const stampC = document.createElement('canvas'); stampC.width = stampC.height = 256; { const x = stampC.getContext('2d'); x.strokeStyle = '#FF3B2B'; x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 104, 0, 6.3); x.stroke(); x.fillStyle = '#FF3B2B'; x.font = '900 136px NSans'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('托', 128, 136); }
  const stampT = new THREE.CanvasTexture(stampC); stampT.colorSpace = THREE.SRGBColorSpace;
  const stM = new THREE.MeshBasicMaterial({ map: stampT, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }); stM.color.setScalar(3.2);
  const st = new THREE.InstancedMesh(new THREE.PlaneGeometry(.058, .058), stM, n); st.frustumCulled = body.frustumCulled = sm.frustumCulled = false;
  const d = new THREE.Object3D(), pos = []; const r = rng(29);
  const order = []; for (let j = 0; j < ROW; j++) for (let i = 0; i < COL; i++) { if (j === ROW - 1 && i === COL - 1) continue; const x = (i - (COL - 1) / 2) * GX, y = ((ROW - 1) / 2 - j) * GY; pos.push([x, y, (r() - .5) * .004, (r() - .5) * .03]); order.push(r()); }
  pos.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.rotation.set(0, 0, p[3]); d.scale.setScalar(1); d.updateMatrix(); body.setMatrixAt(i, d.matrix); d.position.z += T / 2 + .0002; d.updateMatrix(); sm.setMatrixAt(i, d.matrix); });
  body.instanceMatrix.needsUpdate = sm.instanceMatrix.needsUpdate = true; scene.add(body, sm, st);
  // 架子：横梁 + 背板 + 线缆
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: .9, roughness: .42, envMap: env, envMapIntensity: .5 });
  for (let j = 0; j < ROW; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(GX * COL + .12, .012, .05), steel); b.position.set(0, ((ROW - 1) / 2 - j) * GY - D / 2 - .010, -.008); scene.add(b); }
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.BoxGeometry(.018, GY * ROW + .1, .05), steel); c.position.set(s * (GX * COL / 2 + .06), 0, -.008); scene.add(c); });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: .9, envMap: env, envMapIntensity: .15 })); back.position.z = -.08; scene.add(back);
  const glow = new THREE.PointLight(0xbcd2ff, 1.6, 3, 2); glow.position.set(0, 0, .35); scene.add(glow);
  // 第 30 个位置：你
  const you = new THREE.Mesh(new THREE.RingGeometry(.03, .0335, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .65, .2).multiplyScalar(4), transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false })); you.position.set((COL - 1) / 2 * GX, -(ROW - 1) / 2 * GY, .004); scene.add(you);
  const look = new THREE.Vector3();
  const s19 = {
    a: 106.46, b: 112.46, scene, samples: 10, samplesDraft: 3, subDark: .97,
    update(t, u, pp) {
      scr.drawGroup(u * 300);
      const b = E.io3(seg(u, 2.5, 5.0)); const dist = Math.exp(lerp(Math.log(.145), Math.log(1.42), b));
      const px = pos[12]; const x0 = lerp(px[0], 0, b), y0 = lerp(px[1], 0, b);
      cam.position.set(x0 + lerp(.012, .06, b), y0 + lerp(-.006, -.02, b), dist); look.set(x0, y0, 0); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 32; cam.near = .01; cam.far = 50; cam.updateProjectionMatrix();
      // 红章：一个接一个盖下去
      for (let i = 0; i < n; i++) { const tS = 110.0 + order[i] * 1.5; const k = seg(t, tS, tS + .16); const s = k <= 0 ? .0001 : 1 + 1.6 * (1 - E.out3(k)); d.position.set(pos[i][0], pos[i][1], pos[i][2] + T / 2 + .0006); d.rotation.set(0, 0, pos[i][3] - .2); d.scale.setScalar(s); d.updateMatrix(); st.setMatrixAt(i, d.matrix); } st.instanceMatrix.needsUpdate = true;
      you.material.opacity = ss(111.6, 111.9, t);
      scrM.color.setScalar(lerp(1.35, .9, ss(110, 111.5, t)));
      pp.aperture = .0022 * (1 - b * .75); pp.focus = dist; pp.bloom = .11 + .1 * b; pp.threshold = 1.0; pp.vig = .6; pp.exposure = 1;
      return cam;
    },
    hud(x, u, t, h) {
      const a = ss(111.7, 111.95, t) * (1 - ss(112.3, 112.46, t)); if (a > 0) { x.save(); x.globalAlpha = a; x.textAlign = 'center'; x.font = `800 ${58 * UI}px NSans`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 20 * UI; x.fillText('你', W * .79, H * .835); x.restore(); }
      h.gain = 1.6;
    },
  };
  return [s19];
}
