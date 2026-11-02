import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv, bake } from '../phone.js';
import { B } from '../script.js';
import { big, label, topDark } from './board.js';

function contractTex() {
  const c = document.createElement('canvas'); c.width = 1100; c.height = 1560; const x = c.getContext('2d'); const r = rng(1636);
  const g = x.createLinearGradient(0, 0, 1100, 1560); g.addColorStop(0, '#E6D3A6'); g.addColorStop(.5, '#D9C28F'); g.addColorStop(1, '#C4A871'); x.fillStyle = g; x.fillRect(0, 0, 1100, 1560);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${90 + r() * 50},${60 + r() * 30},20,${r() * .05})`; const s = 8 + r() * 120; x.beginPath(); x.ellipse(r() * 1100, r() * 1560, s, s * .7, r() * 3, 0, 6.3); x.fill(); }
  x.fillStyle = '#2A1A0E'; x.textAlign = 'center';
  x.font = 'italic 500 112px LoraI'; x.fillText('Semper Augustus', 550, 190);
  x.font = 'italic 500 58px LoraI'; x.fillText('Haarlem  ·  Anno 1637', 550, 280);
  // 手写行：用连笔波线代替文字
  x.strokeStyle = 'rgba(40,24,12,.85)'; x.lineCap = 'round';
  for (let l = 0; l < 13; l++) { const y = 372 + l * 52; let xx = 110; x.lineWidth = 2.2 + r() * 1.2; while (xx < 980 - r() * 120) { const w = 26 + r() * 74; x.beginPath(); x.moveTo(xx, y); const n = Math.floor(w / 7); for (let i = 1; i <= n; i++) { const px = xx + i / n * w; x.quadraticCurveTo(px - 3, y - 10 * r() - (r() < .13 ? 18 : 0), px, y + (r() - .5) * 6); } x.stroke(); xx += w + 14 + r() * 12; } }
  x.font = 'italic 600 150px LoraI'; x.fillStyle = '#3A1208'; x.fillText('ƒ 3,000', 550, 1120);
  return new THREE.CanvasTexture(c);
}

export function paperShots(ctx) {
  const { cam, lake, sky, world } = ctx;
  // —— 烛光桌面 ——
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020101); const env = makeEnv('room');
  const wood = bake(/* glsl */`void main(){ vec2 p=vUv*vec2(3.,6.); float warp=fbm(p*vec2(.9,.5),5)*1.8; float y=p.x*14.+warp; float ring=.5+.5*sin(y*5.); float fine=fbm(vec2(p.x*90.,p.y*4.),4); vec3 c=mix(vec3(.03,.016,.01),vec3(.15,.075,.035),ring*.7+.3*fine); O=vec4(pow(c,vec3(1./2.2)),1.); }`, 2048);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhysicalMaterial({ map: wood, roughness: .42, clearcoat: .4, clearcoatRoughness: .3, envMap: env, envMapIntensity: .25 })); table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
  const tex = contractTex(); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const pg = new THREE.PlaneGeometry(7.7, 10.9, 60, 84); { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, .03 + .05 * Math.sin(x * .9 + 1) * Math.cos(y * .7) + .22 * Math.pow(Math.max(0, (Math.abs(y) - 4.6) / .9), 2)); } pg.computeVertexNormals(); }
  const paper = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: tex, roughness: .86, side: THREE.DoubleSide, envMap: env, envMapIntensity: .2 })); paper.rotation.x = -Math.PI / 2; paper.position.y = .02; paper.rotation.z = .09; paper.castShadow = true; paper.receiveShadow = true; scene.add(paper);
  const flame = new THREE.PointLight(0xffa858, 46, 34, 2); flame.position.set(-5.4, 6.6, -3.6); flame.castShadow = true; flame.shadow.mapSize.set(1024, 1024); flame.shadow.radius = 7; flame.shadow.bias = -.002; scene.add(flame);
  // 蜡封
  const sealG = (() => { const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI / 2; pts.push(new THREE.Vector2(.62 + .13 * Math.sin(a), .13 * Math.cos(a) + .02)); } pts.reverse(); pts.push(new THREE.Vector2(0, .15)); pts.reverse(); return new THREE.LatheGeometry(pts, 64); })();
  { const p = sealG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .08 * Math.sin(a * 5 + 1) + .05 * Math.sin(a * 11); p.setX(i, x * k); p.setZ(i, z * k); } sealG.computeVertexNormals(); }
  const wax = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0xb8141a, roughness: .3, clearcoat: 1, clearcoatRoughness: .18, envMap: env, envMapIntensity: .9, emissive: 0x3a0406, emissiveIntensity: .8 });
  const SP = [[-2.7, .7], [-1.4, 1.5], [.0, .6], [1.4, 1.5], [2.7, .7]]; const seals = SP.map(([x, z]) => { const m = new THREE.Mesh(sealG, wax); m.position.set(x, .06, z); m.castShadow = true; m.rotation.y = x; scene.add(m); return m; });
  const look = new THREE.Vector3();
  const ST = i => B(39) + i * .53144;
  const desk = {
    a: B(38), b: B(40.25), scene, samples: 10, samplesDraft: 3, subDark: .92,
    update(t, u, pp) {
      const fl = 1 + .1 * Math.sin(t * 11.3) + .07 * Math.sin(t * 17.9 + 1.3) + .05 * Math.sin(t * 29.1); flame.intensity = 74 * fl;
      seals.forEach((m, i) => { const k = seg(t, ST(i) - .09, ST(i)); m.visible = t >= ST(i) - .09; const s = k < 1 ? 1 + 1.6 * (1 - k) ** 2 : 1; m.scale.setScalar(s); m.position.y = .06 + (1 - k) * 2.4; });
      const a = E.io2(seg(t, B(38), B(38.8))); const n = t < ST(0) ? 0 : clamp(Math.floor((t - ST(0)) / .53144) + 1, 0, 5); const pull = E.io2(seg(t, ST(0), ST(4) + .4));
      cam.position.set(lerp(-1.6, -.4, a), lerp(5.8, lerp(8.2, 14.6, pull), a), lerp(6, lerp(4.6, 6.4, pull), a)); look.set(lerp(-1.4, 0, a), 0, lerp(-1.6, lerp(-.2, .6, pull), a)); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 34; cam.near = .1; cam.far = 200; cam.updateProjectionMatrix();
      pp.aperture = .03 * (1 - pull); pp.focus = cam.position.distanceTo(look); pp.bloom = .1; pp.threshold = 1.1; pp.vig = .56; pp.exposure = 1.25; pp.sat = 1.1;
      return cam;
    },
  };
  // —— 纸的风暴：所有合约一起飞起来 ——
  const N = 9000, q = new THREE.PlaneGeometry(1, 1.4, 1, 1), ig = new THREE.InstancedBufferGeometry(); ig.index = q.index; ig.setAttribute('position', q.attributes.position); ig.setAttribute('uv', q.attributes.uv); ig.instanceCount = N;
  const S = new Float32Array(N * 4), r = rng(40); for (let i = 0; i < N * 4; i++) S[i] = r(); ig.setAttribute('aS', new THREE.InstancedBufferAttribute(S, 4));
  const fu = { tP: { value: tex }, uT: { value: 0 }, uGust: { value: 1 }, uFall: { value: 0 }, uMoon: { value: new THREE.Vector3(.16, .22, -.96).normalize() }, uK: { value: 1 } };
  const flock = new THREE.Mesh(ig, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.DoubleSide, uniforms: fu,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uGust,uFall; out vec2 vU; out vec3 vN; out vec3 vW; out float vD; out float vR;
    mat3 rot(vec3 a,float t){ a=normalize(a); float c=cos(t),s=sin(t),o=1.-c; return mat3(o*a.x*a.x+c,o*a.x*a.y-a.z*s,o*a.z*a.x+a.y*s,o*a.x*a.y+a.z*s,o*a.y*a.y+c,o*a.y*a.z-a.x*s,o*a.z*a.x-a.y*s,o*a.y*a.z+a.x*s,o*a.z*a.z+c); }
    void main(){ float T=uT*uGust; float sp=26.+46.*aS.w; float X=mod(aS.x*300.+T*sp,300.)-150.; float Y=2.+pow(aS.y,1.3)*82.+10.*sin(X*.03+aS.z*7.+T*.8); float Z_=-130.+aS.z*140.+14.*sin(X*.02+aS.y*9.+T*.6);
      vec3 c=vec3(X,Y,Z_); float fall=uFall; c.y=mix(c.y,.04+.0*aS.w,smoothstep(0.,1.,fall*(.6+.8*aS.w)));
      mat3 R=rot(vec3(aS.x-.5,aS.y-.5,aS.z-.5)+.01,T*(1.6+3.*aS.w)+aS.w*30.); R=mat3(mix(R[0],vec3(1,0,0),fall*fall),mix(R[1],vec3(0,0,1),fall*fall),mix(R[2],vec3(0,1,0),fall*fall));
      float sz=.8+.4*aS.y; vec3 p=R*(position*sz*1.1)+c; vU=uv; vR=aS.w; vN=R*vec3(0,0,1); vW=p; vec4 mv=viewMatrix*vec4(p,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vU; in vec3 vN,vW; in float vD; in float vR; out vec4 O; uniform sampler2D tP; uniform vec3 uMoon; uniform float uK;
    void main(){ if(vR>=uK) discard; vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); float nl=abs(dot(N,uMoon)); vec3 a=mix(vec3(.82,.76,.62),pow(texture(tP,vU).rgb,vec3(2.2))*1.6,.45);
      vec3 Hh=normalize(uMoon+V); float sp=pow(abs(dot(N,Hh)),60.); vec3 c=a*(.06+1.9*nl*nl*nl)*vec3(.86,.92,1.)+vec3(.9,.94,1.)*sp*2.6;
      float fog=1.-exp(-vD*.0042); c=mix(c,vec3(.010,.014,.024),fog); O=vec4(c,1.); }` })); flock.frustumCulled = false; world.add(flock);
  const G = ctx.tulip.G; G.add(flock); ctx.tulip.flock = flock;
  const com = (t, m = 1) => { ctx.hideOthers(G); ctx.tulipText(false); ctx.tulip.T.u.uT.value = t; sky.u.uMoon.value.set(.16, .22, -.96).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = m; lake.u.uGlit.value = m; ctx.lakeCommon(t); fu.uT.value = t; };
  const storm = {
    a: B(40.25), b: B(41.25), scene: world, samples: 10, samplesDraft: 3, subDark: .88,
    update(t, u, pp) {
      com(t, 0); lake.u.uGlit.value = .6; flock.visible = true; ctx.tulip.T.group.visible = false; fu.uFall.value = 0; fu.uK.value = 1;
      const k = seg(t, B(40.25), B(41.25)); lake.u.uChop.value = 1.4; lake.u.uDist.value = .05; lake.u.uMirror.value = .7; lake.setRipples([]);
      cam.position.set(lerp(-10, 12, k), lerp(4, 8, k), 92); look.set(lerp(0, 8, k), lerp(32, 38, k), -60); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 46; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .26; pp.threshold = .8; pp.vig = .5; pp.exposure = 1.3; pp.sat = 1;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
    hud(x, u, t, h) { const gr = x.createRadialGradient(W / 2, 700 * UI, 0, W / 2, 700 * UI, 800 * UI); gr.addColorStop(0, 'rgba(0,0,0,.92)'); gr.addColorStop(.55, 'rgba(0,0,0,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); big(x, 'windhandel', 720, 720, { size: 170, font: 'LoraV', weight: 600, color: '#FFF0D6', glow: 'rgba(200,220,255,.6)', s: 1 + .1 * Math.exp(-u * 5) }); label(x, '风 的 生 意', 720, 824, { size: 70, color: '#E7E0D2' }); h.gain = 1.9; },
  };
  const settle = {
    a: B(43), b: B(45), scene: world, samples: 10, samplesDraft: 3, subDark: .88,
    update(t, u, pp) {
      com(t, ss(B(44), B(44.3), t)); sky.u.uMoon.value.set(.34, .30, -.89).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); flock.visible = true; ctx.tulip.T.group.visible = true; ctx.tulip.T.u.uOpen.value = .55;
      const k = seg(t, B(43), B(45)); fu.uFall.value = E.out2(seg(t, B(43), B(44))); fu.uK.value = 1.01 - ss(B(43.4), B(44.4), t);
      lake.u.uChop.value = lerp(.9, .16, k); lake.u.uDist.value = lerp(.04, .01, k); lake.u.uMirror.value = .82; lake.setRipples([[0, -30, B(43), 1.2], [0, -30, B(44), 1.4]]);
      cam.position.set(lerp(-8, -3, k), lerp(7, 3, k), lerp(0, -8, k)); look.set(0, 6, -30); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = 40; cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix();
      pp.bloom = .2; pp.threshold = .9; pp.vig = .5; pp.exposure = 1.1;
      return cam;
    },
    draw(c) { lake.draw(world, c); },
  };
  return [desk, storm, settle];
}
