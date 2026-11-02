import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { counter } from './wall.js';

// 1.45 万只基金：每只一根光柱，按排名连成一座金山；最矮的 262 根消失
export function fundsShots(ctx) {
  const { cam, scene: world, wall, sky, city, room, phone, screen, star } = ctx;
  const N = 14500, R = 150, rows = Math.ceil(N / R), r = rng(262);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, .5, 0);
  const aI = new Float32Array(N * 4);
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { uT: { value: 0 }, uDropT: { value: 103.6 } },
    vertexShader: /* glsl */`in vec4 aI; uniform float uT,uDropT; out vec3 vC; out float vH; out float vY; out float vF; out float vDead;
    void main(){ float rank=aI.x,noi=aI.y,dead=aI.z,seed=aI.w; float h=2.+560.*pow(rank,3.2)*(.9+.2*noi)+18.*rank*noi;
      vec3 p=position; float wave=0.; float tD=uDropT+seed*1.5; float k=dead*smoothstep(0.,.5,uT-tD); float flash=dead*smoothstep(-.3,0.,uT-tD);
      float hh=h*(1.-k);  p.y*=max(hh,.01);
      vec4 w=instanceMatrix*vec4(p*vec3(1.,1.,1.),1.); w.y=p.y; 
      vec4 mv=viewMatrix*modelMatrix*w; gl_Position=projectionMatrix*mv;
      vH=position.y; vY=w.y; vF=length(mv.xyz); vDead=flash*(1.-k*.9);
      vC=mix(vec3(.05,.07,.11),mix(vec3(.78,.32,.05),vec3(1.,.62,.2),pow(rank,10.)),smoothstep(.1,.75,rank)); }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vC; in float vH; in float vY; in float vF; in float vDead; out vec4 O;
    void main(){ float top=smoothstep(.9,1.,vH); vec3 c=vC*(.24+.9*vH*vH)+vC*top*3.4; c=mix(c,vec3(1.,.05,.03)*3.2,vDead); float fog=1.-exp(-vF*.00062); c=mix(c,vec3(.016,.011,.008),fog*.8); O=vec4(c,1.); }` });
  const mesh = new THREE.InstancedMesh(g, m, N); const d = new THREE.Object3D();
  const idx = []; for (let i = 0; i < N; i++) { const row = Math.floor(i / R), col = i % R; const rank = row / rows; const x = (col - R / 2) * 5.2 + (r() - .5) * 3.4 + (row % 2) * 2.6, z = -row * 11 + (r() - .5) * 5; d.position.set(x, 0, z); d.scale.set(2.3, 1, 2.3); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); aI[i * 4] = rank + r() * .012; aI[i * 4 + 1] = r(); aI[i * 4 + 2] = 0; aI[i * 4 + 3] = r(); idx.push(i); }
  // 最靠近相机的那一片，抽 262 根
  let cnt = 0; while (cnt < 262) { const row = Math.floor(r() * 26), col = 44 + Math.floor(r() * 62), i = row * R + col; if (aI[i * 4 + 2] < .5) { aI[i * 4 + 2] = 1; cnt++; } }
  g.setAttribute('aI', new THREE.InstancedBufferAttribute(aI, 4)); mesh.frustumCulled = false; mesh.instanceMatrix.needsUpdate = true; mesh.rotation.y = .16; scene.add(mesh);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ color: 0x040405 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.05; scene.add(floor);
  const look = new THREE.Vector3();
  // 18a：榜单（手机）
  const boardShot = {
    a: 98.46, b: 100.96, scene: world, samples: 12, samplesDraft: 4, subDark: .97,
    update(t, u, pp) {
      star.hide(); wall.u.uWallB.value = 1; wall.u.uGlassK.value = 1; wall.u.uT.value = t; wall.u.uYouOpen.value = 1; wall.u.uOnT.value = 999; wall.u.uRevT.value = 999; wall.u.uAll.value = 0; wall.u.uMaskAmt.value = 0; wall.u.uTint.value = 0; wall.u.uYouGain.value = 1;
      screen.drawBoard(u * 220);
      const P = ctx.P0; phone.group.position.copy(P); phone.group.rotation.set(0, .62, 0);
      const dist = lerp(.27, .2, E.out2(seg(u, 0, 2.5))), ang = .3, az = .62 + .14 - u * .05;
      look.set(P.x + Math.sin(.62) * .006, P.y, P.z + Math.cos(.62) * .006);
      cam.position.set(look.x + Math.sin(az) * Math.sin(ang) * dist, look.y + Math.cos(ang) * dist, look.z + Math.cos(az) * Math.sin(ang) * dist); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 30; cam.near = .01; cam.far = 8000; cam.updateProjectionMatrix();
      pp.aperture = .0028; pp.focus = dist; pp.bloom = .10; pp.threshold = 1.1; pp.vig = .6;
      return cam;
    },
  };
  // 18b：金山
  const fieldShot = {
    a: 100.96, b: 106.46, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      m.uniforms.uT.value = t;
      const k = E.io2(seg(u, 0, 5.5)); cam.position.set(lerp(-120, 90, k), lerp(14, 34, k), lerp(150, 210, k)); look.set(lerp(-30, 40, k), lerp(230, 200, k), -700); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 56; cam.near = 1; cam.far = 6000; cam.updateProjectionMatrix();
      pp.bloom = .22; pp.threshold = .95; pp.vig = .5; pp.exposure = 1.05; pp.sat = 1.12; pp.contrast = 1.06;
      return cam;
    },
    hud(x, u, t, h) {
      const a1 = ss(0, .2, u) * (1 - ss(2.2, 2.5, u)); if (a1 > 0) counter(x, '14,500', 300, { size: 170, a: a1, color: '#FFD27A', label: '只公募基金' });
      const a2 = ss(2.5, 2.7, u); if (a2 > 0) { const s = 1 + .2 * Math.exp(-(u - 2.5) * 7); x.save(); x.translate(W / 2, 300 * UI); x.scale(s, s); x.translate(-W / 2, -300 * UI); counter(x, '262', 300, { size: 230, a: a2, color: '#FF6A55', glow: 'rgba(255,60,40,.9)', label: '只  已清盘' }); x.restore(); }
      h.gain = 2.2;
    },
  };
  return [boardShot, fieldShot];
}
