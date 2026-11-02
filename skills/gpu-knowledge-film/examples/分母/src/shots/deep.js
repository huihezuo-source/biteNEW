import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { makeEnv } from '../phone.js';
import { makeBomber } from '../plane.js';

// 深海：没飞回来的那些
export function deepShots(ctx) {
  const { cam } = ctx;
  const env = makeEnv('studio');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0);
  const fogC = new THREE.Color(.004, .022, .030);
  scene.fog = new THREE.FogExp2(fogC.getHex(), .0034);
  // 背景水体：上亮下黑，顶部水面 + 光柱
  const water = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 32), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 }, uB: { value: 1 } },
    vertexShader: `out vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vD; out vec4 O; uniform float uT,uB; ${GLSL_NOISE}
    void main(){ vec3 d=normalize(vD); float up=clamp(d.y,-1.,1.);
      vec3 c=mix(vec3(.001,.006,.009),vec3(.012,.085,.105),smoothstep(-.3,.75,up));
      c+=vec3(.05,.36,.42)*pow(clamp(up,0.,1.),5.)*1.4;
      if(up>.0){ vec2 p=d.xz/(d.y+.12); float n=fbm(p*5.+vec2(uT*.14,uT*.1),5); float m=fbm(p*11.-vec2(uT*.2,-uT*.13)+n*2.,4);
        float c1=pow(1.-abs(n*2.-1.),6.)+pow(1.-abs(m*2.-1.),7.)*.7; c+=vec3(.5,.9,.95)*c1*pow(up,3.)*1.3;
        c+=vec3(.9,1.,.98)*exp(-length(p)*4.6)*3.2; }
      float a=atan(d.x,d.z); float ray=vnoise(vec2(a*16.+sin(uT*.2),uT*.12))*vnoise(vec2(a*34.,-uT*.17+4.)); ray=pow(ray,2.); c+=vec3(.08,.42,.46)*ray*smoothstep(-.45,.5,up)*.75;
      O=vec4(c*uB,1.); }` })); water.frustumCulled = false; scene.add(water);
  // 海床 + 焦散
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 320, 320), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, fog: false, uniforms: { uT: { value: 0 }, uFogC: { value: fogC } },
    vertexShader: /* glsl */`${GLSL_NOISE} out vec3 vW; out float vH; float hgt(vec2 p){ return fbm(p*.012,6)*9.+fbm(p*.09,4)*1.4; } void main(){ vec3 p=position; vec2 q=vec2(p.x,-p.y); float h=hgt(q); vH=h; vec4 w=modelMatrix*vec4(p.x,p.y,h,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; in float vH; out vec4 O; uniform float uT; uniform vec3 uFogC; ${GLSL_NOISE}
    void main(){ vec3 dx=dFdx(vW),dy=dFdy(vW); vec3 n=normalize(cross(dx,dy)); if(n.y<0.)n=-n;
      vec2 p=vW.xz; float n1=fbm(p*.13+vec2(uT*.14,uT*.1),4); float n2=fbm(p*.31-vec2(uT*.2,-uT*.13)+n1*2.,3);
      float ca=pow(1.-abs(n1*2.-1.),9.)+pow(1.-abs(n2*2.-1.),11.)*.9;
      vec3 sand=mix(vec3(.05,.075,.075),vec3(.13,.16,.14),fbm(p*.6,4));
      float L=.14+.86*clamp(n.y,0.,1.)**1.; 
      vec3 c=sand*L*.32+vec3(.25,.62,.62)*ca*.7*sand*6.;
      float d=length(cameraPosition-vW); c=mix(c,uFogC,1.-exp(-d*.0034));
      O=vec4(c,1.); }`.replace('**1.','') })); bed.rotation.x = -Math.PI / 2; bed.position.y = -21; bed.frustumCulled = false; scene.add(bed);
  // 主角：正在沉下去的那一架
  const hero = makeBomber(env, { env: .45 }); hero.group.traverse(o => { if (o.isMesh && o.material.fog === undefined) o.material.fog = true; }); scene.add(hero.group);
  // 主光（水面方向）
  const sun = new THREE.DirectionalLight(0xa8fff0, 5.2); sun.position.set(.2, 1, .25); scene.add(sun); scene.add(new THREE.AmbientLight(0x3fa7a8, .12));
  // 残骸群（合并后实例化）
  const geos = []; const tmp = new THREE.Matrix4(); hero.group.updateMatrixWorld(true);
  hero.group.traverse(o => { if (o.isMesh) { let g = o.geometry.clone(); g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.applyMatrix4(o.matrixWorld); if (!g.attributes.uv) return; if (!g.attributes.normal) g.computeVertexNormals(); geos.push(g); } });
  const merged = mergeGeometries(geos, false); merged.computeVertexNormals();
  const N = 420, r = rng(1943); const wm = new THREE.MeshStandardMaterial({ color: 0xaab8ba, metalness: .35, roughness: .62, envMap: env, envMapIntensity: .22, fog: true, side: THREE.DoubleSide });
  const wreck = new THREE.InstancedMesh(merged, wm, N); const d = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const a = r() * 6.28, R = 30 + 700 * r() ** .9; d.position.set((r() - .5) * 2 * (40 + R * .62), -13.6 + r() * 1.4, -46 - R); d.rotation.set((r() - .5) * .36, r() * 6.28, (r() - .5) * .6); const s = .9 + r() * .2; d.scale.setScalar(s); d.updateMatrix(); wreck.setMatrixAt(i, d.matrix); }
  wreck.instanceMatrix.needsUpdate = true; wreck.frustumCulled = false; scene.add(wreck);
  // 气泡与微粒
  const bn = 1100, bp = new Float32Array(bn * 3), bs = new Float32Array(bn * 4), rr = rng(5);
  for (let i = 0; i < bn; i++) { bs[i * 4] = rr(); bs[i * 4 + 1] = rr(); bs[i * 4 + 2] = rr(); bs[i * 4 + 3] = rr(); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('aS', new THREE.BufferAttribute(bs, 4)); bg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const bub = new THREE.Points(bg, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uPx: { value: H } },
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uPx; uniform vec3 uC; out float vA; void main(){ float life=fract(aS.x+uT*(.07+.13*aS.y)); vec3 p=uC+vec3((aS.z-.5)*18.+sin(life*18.+aS.w*30.)*.6,life*64.-10.,(aS.w-.5)*18.+cos(life*14.+aS.y*20.)*.6); vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(.05+.16*aS.y*aS.y)*uPx/(-mv.z); vA=smoothstep(0.,.1,life)*(1.-smoothstep(.75,1.,life)); }`,
    fragmentShader: `precision highp float; in float vA; out vec4 O; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d)*2.; float ring=smoothstep(1.,.86,r)*(.28+.72*smoothstep(.55,.9,r)); O=vec4(vec3(.55,1.,.98)*ring*vA*.55,1.); }` })); bub.frustumCulled = false; scene.add(bub);
  const look = new THREE.Vector3(); const A = 90.46;
  const s17 = {
    a: A, b: 98.46, scene, samples: 8, samplesDraft: 3,
    update(t, u, pp) {
      water.material.uniforms.uT.value = t; bed.material.uniforms.uT.value = t; bub.material.uniforms.uT.value = t;
      // 坠落：头朝下斜插，沉到海床
      const k = E.out2(seg(u, 0, 4.4)); const y = lerp(58, -11.5, k);
      hero.group.position.set(lerp(-4, 3, k), y, -18); hero.group.rotation.set(lerp(-.95, -.05, E.io2(seg(u, 0, 4.2))), lerp(.5, 1.2, k), lerp(.55, .22, k));
      hero.parts.engines.forEach(e => { e.prop.rotation.z = 1.1; });
      bub.material.uniforms.uC.value.copy(hero.group.position);
      // 机位：跟着往下沉，然后抬高拉远露出整片
      const r2 = E.io3(seg(u, 3.0, 6.8));
      cam.position.set(lerp(-12, 26, r2), lerp(lerp(46, -2, E.io2(seg(u, 0, 3.6))), 150, r2), lerp(34, 110, r2)); look.set(lerp(-1, -14, r2), lerp(lerp(40, -7, E.io2(seg(u, 0, 3.6))), -14, r2), lerp(-18, -210, r2));
      cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = lerp(44, 40, r2); cam.near = .3; cam.far = 3000; cam.updateProjectionMatrix();
      wreck.count = N; pp.bloom = .16; pp.threshold = .9; pp.vig = .55; pp.exposure = 1.1 - .2 * ss(5.4, 6, u); pp.sat = 1.1; pp.contrast = 1.05; pp.lift = [0, .006, .012];
      return cam;
    },
    hud(x, u, t, h) {
      const a = ss(95.96, 96.16, t) * (1 - ss(98.0, 98.4, t)); if (a <= 0) return;
      const s = 1 + .16 * Math.exp(-(t - 95.96) * 6);
      x.save(); const gr = x.createRadialGradient(W / 2, 880 * UI, 0, W / 2, 880 * UI, 760 * UI); gr.addColorStop(0, `rgba(0,10,14,${.74 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
      x.translate(W / 2, 900 * UI); x.scale(s, s); x.globalAlpha = a; x.textAlign = 'center'; x.font = `900 ${206 * UI}px NSerif`; x.fillStyle = '#FFFFFF'; x.shadowColor = 'rgba(120,240,240,.95)'; x.shadowBlur = 60 * UI; x.fillText('幸存者偏差', 0, 0); x.shadowBlur = 0; x.fillText('幸存者偏差', 0, 0);
      x.font = `500 ${46 * UI}px JB`; x.fillStyle = '#BFF3EE'; x.letterSpacing = `${14 * UI}px`; x.fillText('SURVIVORSHIP BIAS', 0, 96 * UI); x.restore(); h.gain = 2.2;
    },
  };
  return [s17];
}
