import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv } from '../phone.js';
import { makeBomber, holeSpots } from '../plane.js';
import { drawRich } from '../text.js';

export function bomberShots(ctx) {
  const { cam } = ctx;
  const env = makeEnv('studio');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const plane = makeBomber(env); scene.add(plane.group);
  // 背景：冷色暗雾
  const bg = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, uniforms: { uG: { value: 1 } }, vertexShader: `out vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); }`, fragmentShader: /* glsl */`precision highp float; in vec3 vD; out vec4 O; uniform float uG; ${GLSL_NOISE} void main(){ vec3 d=normalize(vD); float n=fbm(d.xz*3.+d.y,5); vec3 c=mix(vec3(.004,.006,.010),vec3(.03,.04,.058),smoothstep(.3,.8,n)*(.4+.6*smoothstep(.6,-.8,d.y))); O=vec4(c*uG,1.); }` })); bg.frustumCulled = false; scene.add(bg);
  const keyL = new THREE.SpotLight(0xffffff, 3500, 200, .55, .8, 1.5); keyL.position.set(-16, 46, -14); keyL.target.position.set(0, 0, 0); keyL.castShadow = true; keyL.shadow.mapSize.set(2048, 2048); keyL.shadow.bias = -.0005; keyL.shadow.radius = 5; scene.add(keyL, keyL.target);
  plane.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // 弹孔：贴在上表面
  const spots = holeSpots(); const ray = new THREE.Raycaster(); plane.group.updateMatrixWorld(true);
  const targets = []; plane.group.traverse(o => { if (o.isMesh) targets.push(o); });
  const hg = new THREE.CircleGeometry(.5, 20); hg.rotateX(-Math.PI / 2);
  const holeMat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.NormalBlending, uniforms: { uT: { value: 0 }, uHeat: { value: 1 } },
    vertexShader: `in float aT; out float vT; out vec2 vU; out float vR; in float aR; void main(){ vT=aT; vR=aR; vU=uv-.5; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in float vT,vR; in vec2 vU; out vec4 O; uniform float uT,uHeat; ${GLSL_NOISE}
    void main(){ float age=uT-vT; if(age<0.) discard; float r=length(vU)*2.; float a=atan(vU.y,vU.x); float e=.34+.07*sin(a*7.+vR*40.)+.05*sin(a*13.+vR*17.); 
      float hole=smoothstep(e+.02,e-.02,r); float burn=smoothstep(.95,e,r)*.8; float hot=exp(-age*1.1); float ring=exp(-pow((r-e)*9.,2.));
      vec3 c=mix(vec3(.02,.016,.014),vec3(0.),hole); vec3 glow=vec3(1.,.07,.03)*(5.5*uHeat+12.*hot)*ring+vec3(1.,.09,.04)*2.2*uHeat*smoothstep(1.,.4,r)+vec3(1.,.5,.12)*18.*hot*exp(-r*r*6.);
      O=vec4(c+glow,max(max(hole,burn*.75),max(ring*uHeat,smoothstep(1.,.4,r)*.55*uHeat))); if(O.a<.01) discard; }` });
  const im = new THREE.InstancedMesh(hg, holeMat, spots.length); const aT = new Float32Array(spots.length), aR = new Float32Array(spots.length); const d = new THREE.Object3D(); let n = 0;
  const T1 = 79.46; const beats = [0, 1, 1.5, 2, 2.5, 2.75]; const up = new THREE.Vector3(0, -1, 0);
  spots.forEach((s, i) => {
    ray.set(new THREE.Vector3(s.x, 20, s.z), up); const h = ray.intersectObjects(targets, false)[0]; if (!h) return;
    d.position.copy(h.point); d.position.y += .012; const nn = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nn.y < 0 ? nn.negate() : nn); const sc = .46 + .34 * s.k; d.scale.set(sc, sc, sc); d.updateMatrix(); im.setMatrixAt(n, d.matrix);
    const bucket = Math.floor(s.k * 6); aT[n] = T1 + beats[Math.min(5, bucket)] + (s.k * 37 % 1) * .34; aR[n] = s.k; n++;
  });
  im.count = n; hg.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1)); hg.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 1)); im.frustumCulled = false; im.renderOrder = 2; scene.add(im);
  // 装甲（直觉方案）：蓝图式发光斜线面
  const armor = new THREE.Group(); const am = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: `out vec2 vU; out vec3 vP; void main(){ vU=uv; vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vU; in vec3 vP; out vec4 O; uniform float uA,uT; void main(){ float h=smoothstep(.34,.5,abs(fract((vP.x+vP.z)*1.15+uT*.6)-.5)); vec2 e=min(vU,1.-vU); float edge=smoothstep(.022,.008,min(e.x,e.y)); vec3 c=vec3(.25,.62,1.)*(h*.32+.10+edge*2.4); O=vec4(c*uA*1.6,1.); }` });
  [[0, 2.8, 2.5, 9.2], [-7.4, -.8, 12.4, 4.4], [7.4, -.8, 12.4, 4.4], [0, 9.2, 10.4, 2.3]].forEach(([x, z, w, l]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), am); m.rotation.x = -Math.PI / 2; m.position.set(x, 2.3, z); armor.add(m); }); armor.renderOrder = 3; scene.add(armor);
  // 金圈：真正该加装甲的地方
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .62, .18).multiplyScalar(5), transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = []; [[-3.9, -3.9], [-7.8, -3.1], [3.9, -3.9], [7.8, -3.1], [0, -7.2]].forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.74, 64), ringM); m.rotation.x = -Math.PI / 2; m.position.set(x, 2.2, z); rings.push(m); scene.add(m); });
  const look = new THREE.Vector3(); const A = 76.96, B_ = 90.46;
  const p = new THREE.Vector3();
  const s15 = {
    a: A, b: B_, scene, samples: 10, samplesDraft: 3, subDark: .9,
    update(t, u, pp) {
      holeMat.uniforms.uT.value = t;
      const heat = 1 - .35 * ss(84.9, 85.6, t) ; holeMat.uniforms.uHeat.value = heat;
      plane.parts.engines.forEach((e, i) => { e.prop.rotation.z = t * 8 + i; });
      // 机位：先贴着蒙皮滑过 → 俯瞰全机 → 缓慢环绕
      const macro = 1 - E.io3(seg(u, 1.1, 2.5));
      const yaw = -.34 + u * .036, pitch = 1.16 + .018 * u;
      const dist = lerp(68 - .4 * u, 7.5, macro);
      const tgt = p.set(lerp(0, -.3, macro), .6, lerp(5.6, -2 + u * 3, macro));
      cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist + macro * -3, tgt.y + Math.sin(pitch) * dist * (1 - .78 * macro), tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist + macro * 3);
      cam.up.set(lerp(0, -.3, macro), 0, -1 + macro * .3); cam.lookAt(tgt); cam.up.normalize(); cam.fov = lerp(30, 42, macro); cam.near = .1; cam.far = 3000; cam.updateProjectionMatrix();
      const armorIn = E.out3(seg(t, 82.56, 83.2)), armorOut = ss(85.46, 85.75, t);
      am.uniforms.uA.value = armorIn * (1 - armorOut); am.uniforms.uT.value = t; armor.position.y = 0; armor.visible = am.uniforms.uA.value > .002;
      const gold = E.out3(seg(t, 87.46, 88.1)); ringM.opacity = gold; rings.forEach((m, i) => { const s = 1 + (1 - gold) * 2 + .05 * Math.sin(t * 5 + i); m.scale.set(s, s, s); });
      pp.bloom = .13; pp.threshold = 1.0; pp.vig = .6; pp.exposure = lerp(.9, .46, macro); pp.sat = 1.05; pp.contrast = 1.1; pp.lift = [0, .004, .012];
      return cam;
    },
    hud(x, u, t, h) {
      const a = ss(0, .2, u) * (1 - ss(2.2, 2.5, u)); if (a > 0) {
        const s = 1 + .22 * Math.exp(-u * 7);
        const gr = x.createLinearGradient(0, 0, 0, 1240 * UI); gr.addColorStop(0, `rgba(0,0,0,${.96 * a})`); gr.addColorStop(.72, `rgba(0,0,0,${.92 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 1240 * UI);
        x.save(); x.translate(W / 2, 620 * UI); x.scale(s, s); x.textAlign = 'center'; x.globalAlpha = a; x.font = `900 ${300 * UI}px NSerif`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(255,170,60,.9)'; x.shadowBlur = 60 * UI; x.fillText('1943', 0, 0); x.shadowBlur = 0; x.fillText('1943', 0, 0); x.restore();
        x.save(); x.globalAlpha = a; x.textAlign = 'center'; x.font = `500 ${84 * UI}px LoraV`; x.fillStyle = '#F4EFE4'; x.fillText('Abraham Wald', W / 2, 760 * UI); x.font = `600 ${58 * UI}px NSans`; x.fillStyle = '#E4DFD4'; x.fillText('亚伯拉罕·瓦尔德', W / 2, 856 * UI); x.fillText('哥伦比亚大学统计研究组', W / 2, 936 * UI); x.restore();
      }
      if (t > 79.46 && t < 85.46) { const c = Math.min(238, Math.floor(238 * E.out2(seg(t, 79.46, 82.4)))); x.save(); x.textAlign = 'center'; x.globalAlpha = (1 - ss(85.1, 85.46, t)); x.font = `700 ${120 * UI}px JB`; x.fillStyle = '#FF5A4A'; x.shadowColor = 'rgba(255,50,30,.9)'; x.shadowBlur = 30 * UI; x.fillText(String(c), W * .19, 880 * UI); x.shadowBlur = 0; x.font = `700 ${58 * UI}px NSans`; x.fillStyle = '#F2ECE2'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 14 * UI; x.fillText('个弹孔', W * .19, 958 * UI); x.font = `500 ${42 * UI}px NSans`; x.fillText('（示意）', W * .19, 1018 * UI); x.restore(); }
      const g2 = ss(87.8, 88.3, t); if (g2 > 0) { x.save(); x.globalAlpha = g2 * (1 - ss(90.1, 90.4, t)); x.textAlign = 'center'; x.font = `800 ${70 * UI}px NSans`; x.fillStyle = '#FFD27A'; x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = 22 * UI; x.fillText('发动机', W * .19, 860 * UI); x.fillText('驾驶舱', W * .19, 940 * UI); x.font = `700 ${50 * UI}px NSans`; x.fillStyle = '#F4EFE4'; x.fillText('没有弹孔', W * .19, 1018 * UI); x.restore(); }
      h.gain = 2.0;
    },
  };
  return [s15];
}
