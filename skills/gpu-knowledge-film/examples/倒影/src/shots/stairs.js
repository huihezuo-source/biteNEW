import * as THREE from 'three';
import { W, H, UI, clamp, seg, ss, E, lerp, rng, GLSL_NOISE } from '../core.js';
import { B } from '../script.js';
import { dustFigure } from '../figure.js';
import { textPlane, waterText } from '../text.js';
import { REFLECT_ONLY, MAIN_ONLY, toWater } from '../lake.js';

// 人和钱都在水面上；价格是每个人脚下、只存在于水里的那根柱子
const PR = [10, 20, 30, 40, 50], K = .84, DX = 10.5;
export function stairShots(ctx) {
  const { lake, sky, world, cam } = ctx;
  const G = new THREE.Group(); world.add(G); ctx.groups.push(G); const Z = -60, X0 = -2 * DX, FS = 5.4;
  const r = rng(50), TT = [B(48), B(49), B(50), B(51)], riseAt = i => B(46) + i * .53144;
  // 卖出的人各自上船，朝月亮那边走远
  const DIRS = [[-.57, -.82], [-.48, -.88], [-.4, -.91], [-.37, -.93]], LEN = [84, 72, 60, 46];
  const boatAt = (i, t) => { const tt = Math.max(0, t - TT[i] - 1.3), d = LEN[i] * (1 - Math.exp(-tt / 4.5)) * ss(0, 1.2, tt); return [X0 + i * DX + .6 + DIRS[i][0] * d, Z + 5.4 + DIRS[i][1] * d]; };
  // 水里的价格柱
  const mats = [], blocks = [], nums = [];
  PR.forEach((p, i) => {
    const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { uH: { value: 1 }, uG: { value: 1 }, uF: { value: 0 } },
      vertexShader: `out vec3 vL; out vec3 vN; out vec3 vW; void main(){ vL=position; vN=normal; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */`precision highp float; in vec3 vL,vN,vW; out vec4 O; uniform float uH,uG,uF; ${GLSL_NOISE}
      void main(){ vec3 N=normalize(vN); float top=step(.5,N.y); float yy=clamp(vW.y/max(uH,.01),0.,1.); vec2 q=(abs(N.x)>.5?vec2(vL.z,vL.y):vec2(vL.x,vL.y))/vec2(7.2,1.); float edge=smoothstep(.40,.5,abs(q.x)); vec3 amber=mix(mix(vec3(.9,.05,.03),vec3(1.,.2,.1),yy),mix(vec3(.02,.72,.26),vec3(.1,1.,.5),yy),uF);
        vec3 c=amber*(.05+1.15*pow(yy,3.)+.5*edge*(.3+yy))*uG; float n=fbm(vec2(q.x*5.,vW.y*.5),4); c*=.86+.28*n;
        if(top>.5){ vec2 e=abs(vL.xz)/7.2; float l=smoothstep(.44,.5,max(e.x,e.y)); c=vec3(.02,.016,.012)+mix(vec3(1.,.3,.2),vec3(.2,1.,.55),uF)*(l*3.4+.34)*uG; }
        O=vec4(c,1.); }` });
    const b = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1, 7.2), m); b.position.set(X0 + i * DX, 0, Z); b.layers.set(REFLECT_ONLY); G.add(b); blocks.push(b); mats.push(m);
    const n = waterText(`¥${p}`, { size: 240, weight: 700, family: 'LoraV', color: '#FFF1E6', height: 4.6, gain: 1.5, additive: false }); n.position.set(X0 + i * DX, 0, Z + 3.7); G.add(n); nums.push(n);
  });
  const n20 = waterText('¥20', { size: 240, weight: 700, family: 'LoraV', color: '#FFE6D0', height: 4.6, gain: 1.6, additive: false }); n20.position.set(X0 + 4 * DX, 0, Z + 3.7); G.add(n20);
  const lossT = waterText('−¥30', { size: 240, weight: 800, family: 'LoraV', color: '#2EE08A', height: 5.4, gain: 2.2, additive: false }); lossT.position.set(X0 + 4 * DX, 29.4, Z + 3.7); G.add(lossT);
  const nA = waterText('¥10', { size: 240, weight: 700, family: 'LoraV', color: '#FFE6D8', height: 2.5, gain: 2, additive: false }); nA.position.set(X0, 1.5, Z + 3.7); G.add(nA);
  const nTop = waterText('¥50', { size: 240, weight: 700, family: 'LoraV', color: '#FFE6D8', height: 6, gain: 2, additive: false }); nTop.position.set(X0 + 4 * DX, 6.6, Z + 3.7); G.add(nTop);
  // 塌掉的那一截留一个虚框：这 30 块只在水里存在过
  const gu = { uA: { value: 0 } }, ghost = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 25.2), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: gu,
    vertexShader: `out vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `precision highp float; in vec2 vU; out vec4 O; uniform float uA; void main(){ vec2 e=min(vU,1.-vU)*vec2(7.2,25.2); float l=1.-smoothstep(.1,.2,min(e.x,e.y)); float dash=step(.45,fract(vU.y*12.+vU.x*2.)); O=vec4(vec3(.1,1.,.42)*(l*dash*1.9+.04)*uA,1.); }` })); ghost.position.set(X0 + 4 * DX, 29.4, Z + 3.65); ghost.layers.set(REFLECT_ONLY); G.add(ghost);
  // 水面上的石头
  const stone = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.7, 2.4, 1.6, 22, 3), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .85, metalness: .1 }), 5); stone.frustumCulled = false; G.add(stone); const dm = new THREE.Object3D();
  const figs = PR.map((p, i) => { const f = dustFigure(26000, 200 + i); f.u.uScale.value = FS; G.add(f.pts); return f; });
  const tMesh = new THREE.Mesh(ctx.tulip.T.flower.geometry, ctx.tulip.T.flower.material); tMesh.frustumCulled = false; tMesh.scale.setScalar(.55); G.add(tMesh); const hs = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 4.6, 10), ctx.tulip.T.group.children[1].material); hs.position.y = -2.3; tMesh.add(hs); const tL = new THREE.PointLight(0xffc890, 14, 14, 2); G.add(tL);
  // 真金币：逆着郁金香飞
  const u = { uT: { value: 0 }, uFrom: { value: new THREE.Vector3() }, uTo: { value: new THREE.Vector3() }, uA: { value: 0 } };
  const CN = 620, cgeo = new THREE.CylinderGeometry(.27, .27, .05, 24), cig = new THREE.InstancedBufferGeometry(); cig.index = cgeo.index; cig.setAttribute('position', cgeo.attributes.position); cig.setAttribute('normal', cgeo.attributes.normal); cig.instanceCount = CN; const CS = new Float32Array(CN * 4); for (let i = 0; i < CN * 4; i++) CS[i] = r(); cig.setAttribute('aS', new THREE.InstancedBufferAttribute(CS, 4));
  const coinFlow = new THREE.Mesh(cig, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: u,
    vertexShader: /* glsl */`in vec4 aS; uniform float uT,uA; uniform vec3 uFrom,uTo; out vec3 vN; out vec3 vW;
    mat3 rot(vec3 a,float t){ a=normalize(a); float c=cos(t),s=sin(t),o=1.-c; return mat3(o*a.x*a.x+c,o*a.x*a.y-a.z*s,o*a.z*a.x+a.y*s,o*a.x*a.y+a.z*s,o*a.y*a.y+c,o*a.y*a.z-a.x*s,o*a.z*a.x-a.y*s,o*a.y*a.z+a.x*s,o*a.z*a.z+c); }
    void main(){ float l=fract(aS.x+uT*(.62+.42*aS.y)); vec3 p=mix(uFrom,uTo,l); p.y+=sin(l*3.14159)*(2.9+1.1*aS.w); float sw=.3+.75*sin(l*3.14159); p+=vec3(aS.z-.5,aS.w-.5,aS.y-.5)*2.*sw; mat3 R=rot(vec3(aS.x-.5,aS.y-.5,aS.z-.5)+.01,uT*(5.+7.*aS.w)+aS.z*30.); float k=uA>.02?1.:0.; vec3 w=R*(position*(.72+.5*aS.y)*k)+p; vN=R*normal; vW=w; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vN,vW; out vec4 O; void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); vec3 Rf=reflect(-V,N); float env=.1+1.7*pow(max(Rf.y*.5+.5,0.),4.)+6.*pow(max(dot(Rf,normalize(vec3(-.3,.4,-.86))),0.),40.); vec3 c=vec3(1.,.62,.2)*env; O=vec4(c,1.); }` })); coinFlow.frustumCulled = false; coinFlow.layers.set(MAIN_ONLY); G.add(coinFlow);
  // 拿到钱的人坐船离开：真钱走了
  const boats = PR.slice(0, 4).map((p, i) => { const b = ctx.makeBoat({ light: false, seed: 11 + i }); b.group.scale.setScalar(.9); G.add(b.group); return b; });
  const gains = PR.slice(0, 4).map((p, i) => { const m = textPlane('+¥10', { size: 170, weight: 700, family: 'LoraV', color: '#FFD27A', height: 2.6, gain: 2, additive: false }); m.layers.set(MAIN_ONLY); G.add(m); return m; });
  const fill = new THREE.DirectionalLight(0xa8bce8, 1); fill.position.set(-5, 8, 10); G.add(fill);
  const look = new THREE.Vector3();
  const stoneY = (i, t) => lerp(-2.4, -.1, E.out3(seg(t, riseAt(i), riseAt(i) + .4)));
  const priceH = (i, t) => { const t0 = i === 0 ? riseAt(0) : TT[i - 1]; let h = PR[i] * K * E.out3(seg(t, t0, t0 + .7)); if (i === 4) h = lerp(h, 20 * K, E.io3(seg(t, B(52), B(52.7)))); return h; };
  function pose(t) {
    let holder = 0, moving = -1, mk = 0; for (let i = 0; i < 4; i++) { if (t >= TT[i]) holder = i + 1; if (t >= TT[i] && t < TT[i] + 1.5) { moving = i; mk = E.io2((t - TT[i]) / 1.5); } }
    for (let i = 0; i < 5; i++) { dm.position.set(X0 + i * DX, stoneY(i, t), Z); dm.rotation.set(0, i, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); stone.setMatrixAt(i, dm.matrix); } stone.instanceMatrix.needsUpdate = true;
    figs.forEach((f, i) => { const xs = X0 + i * DX; let x = xs, y = stoneY(i, t) + .82, z = Z, g = 0; const sold = i < 4 && t >= TT[i]; f.pts.visible = t >= riseAt(i) + .15;
      if (sold) { const step = E.io2(seg(t, TT[i] + .8, TT[i] + 1.3)), [bx, bz] = boatAt(i, t); g = ss(TT[i] + .1, TT[i] + .7, t); x = lerp(xs, bx, step); z = lerp(Z, bz, step); y = lerp(y, .55, step) + Math.sin(step * Math.PI) * 1.2; }
      f.u.uT.value = t; f.u.uBase.value.set(x, y, z); f.u.uC.value.setRGB(lerp(.72, 1, g), lerp(.8, .5, g), lerp(1, .12, g)); f.u.uC2.value.setRGB(lerp(.95, 1, g), lerp(.97, .8, g), lerp(1, .42, g)); f.u.uK.value = (f.pts.visible ? ss(riseAt(i) + .15, riseAt(i) + .4, t) : 0) * lerp(.42, .7, g) * (i < 4 ? 1 - .72 * ss(TT[i] + 2, TT[i] + 5, t) : 1); });
    boats.forEach((b, i) => { const on = t >= TT[i] + .35; b.group.visible = on; if (!on) return; const [bx, bz] = boatAt(i, t); b.rock(t); b.group.position.set(bx, b.group.position.y - 1.6 * (1 - ss(TT[i] + .35, TT[i] + .85, t)), bz); b.group.rotation.y = -.12 - i * .05; b.halo.material.opacity = ss(TT[i] + .35, TT[i] + .9, t); });
    gains.forEach((m, i) => { const a = ss(TT[i] + .45, TT[i] + .75, t) * (1 - ss(TT[i] + 1.7, TT[i] + 2, t)); m.visible = a > .01; m.material.opacity = a; const b = figs[i].u.uBase.value; m.position.set(b.x, b.y + FS + 2.2, b.z); });
    const hp = figs[holder].u.uBase.value; let fx = hp.x + 1.6, fy = hp.y + 3.3, fz = hp.z + .8; if (moving >= 0 && t < TT[moving] + 1.3) { const v = E.io2((t - TT[moving]) / 1.3), s0 = X0 + moving * DX + 1.3, s1 = X0 + (moving + 1) * DX + 1.3; fx = lerp(s0, s1, v); fy = stoneY(moving, t) + .82 + 3.9 + Math.sin(v * Math.PI) * 4.4; fz = Z + .8; }
    tMesh.position.set(fx, fy, fz); tL.position.set(fx, fy + .6, fz + 1.4); ctx.tulip.T.u.uOpen.value = .5; tMesh.visible = t >= riseAt(0) + .15;
    u.uA.value = 0; if (moving >= 0) { const a = figs[moving + 1].u.uBase.value, b = figs[moving].u.uBase.value; u.uFrom.value.set(a.x, a.y + 3, a.z); u.uTo.value.set(b.x, b.y + 3, b.z); u.uA.value = ss(0, .16, mk) * (1 - ss(.8, 1, mk)); }
    blocks.forEach((b, i) => { b.visible = t < B(54.25) || i === 4; const h = Math.max(priceH(i, t), .02); b.scale.y = h; b.position.y = h / 2; mats[i].uniforms.uH.value = h; mats[i].uniforms.uG.value = i === holder ? 1.25 : .7; mats[i].uniforms.uF.value = i === 4 ? ss(B(52), B(52.3), t) : 0; nums[i].position.y = h - 2.7; nums[i].visible = h > 4; });
    const fall = seg(t, B(52), B(52.2)); nums[4].visible = fall < .5 && priceH(4, t) > 4; n20.visible = fall >= .5; n20.position.y = priceH(4, t) - 2.7; lossT.visible = t > B(52.3); lossT.material.opacity = ss(B(52.3), B(52.6), t); gu.uA.value = ss(B(52.2), B(52.6), t); ghost.visible = gu.uA.value > .01; nA.visible = t > B(47) && t < B(48); nTop.visible = t > B(51.25) && t < B(52); nTop.material.opacity = ss(B(51.25), B(51.5), t);
  }
  const com = t => { ctx.hideOthers(G); tL.intensity = 14; sky.u.uMoon.value.set(.2, .72, -.66).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); sky.u.uMoonK.value = 1; lake.u.uGlit.value = .1; ctx.lakeCommon(t); u.uT.value = t; ctx.tulip.T.u.uT.value = t; pose(t); lake.u.uChop.value = .14; lake.u.uDist.value = .008; lake.u.uMirror.value = .92; lake.setRipples([0, 1, 2, 3, 4].map(i => [X0 + i * DX, Z + 3, riseAt(i), 1.2]).concat(TT.map((tt, i) => [X0 + (i + 1) * DX, Z + 3, tt, 1.3]))); };
  const bloom = pp => { pp.bloom = .24; pp.threshold = .85; pp.vig = .46; pp.exposure = 1.12; pp.sat = 1.12; };
  const shot = (a, b, sub, fn, hud) => ({ a, b, scene: world, samples: 8, samplesDraft: 3, subDark: sub, update(t, uu, pp) { com(t); fn(t); gains.forEach(m => { const s = cam.position.distanceTo(m.position) / 36; m.scale.setScalar(s); m.position.y += 1.2 * (s - 1); }); cam.up.set(0, 1, 0); cam.lookAt(look); cam.near = .3; cam.far = 20000; cam.updateProjectionMatrix(); bloom(pp); return cam; }, draw(c) { lake.draw(world, c); }, hud });
  // 45–48：石头一块块冒出水面，人站上去
  const s1 = shot(B(46), B(47), .84, t => { const k = seg(t, B(46), B(47)), HIT = ctx.coin.HIT; ctx.coin.G.visible = true; ctx.coin.pose(t, 28); lake.u.uMoon.value.set(.1, .42, -.9).normalize(); lake.u.uGlit.value = .5; lake.u.uBroad.value = 0; lake.setRipples([[0, 28, HIT, 1.5], [0, 28, HIT + .5, 1.2], [0, 28, HIT + 1, 1], [0, 28, HIT + 1.6, .9], ...[0, 1, 2, 3, 4].map(i => [X0 + i * DX, Z + 3, riseAt(i), 1.2])]); cam.position.set(lerp(-4, -2, k), 6, Z + lerp(126, 118, k)); look.set(0, -21, Z); cam.fov = 38; });
  // 这只“股票”就是那朵花：先把它亮出来
  const s1b = shot(B(47), B(48), .84, t => { nums[0].visible = false; const k = E.io2(seg(t, B(47), B(48))); tL.intensity = 46; cam.position.set(X0 + lerp(5.6, 4.4, k), 3, Z + lerp(19, 16.5, k)); look.set(X0 + 1.1, .9, Z); cam.fov = 40; });
  const s2 = shot(B(48), B(52), .92, t => { const v = seg(t, B(48), B(52)); if (t < B(49.5)) { const px = X0 + DX * (.5 + E.io2(seg(t, B(48.8), B(49.5)))); cam.position.set(px - 3, 5, Z + 38); look.set(px, -3, Z); cam.fov = 44; } else if (t >= B(51)) { const k = seg(t, B(51), B(52)); const px = X0 + 3.6 * DX; cam.position.set(px - 8 + 4 * k, 6, Z + 38 - 3 * k); look.set(px, -2.5, Z); cam.fov = 44; } else { const k = seg(t, B(49.5), B(51)); cam.position.set(lerp(-6, 6, k), 6, Z + 122 - k * 6); look.set(lerp(-3, 3, k), -21, Z); cam.fov = 38; } });
  const s3 = shot(B(52), B(54.25), .92, t => { lake.setRipples([[X0 + 4 * DX, Z + 2, B(52) + .1, 1.6], [X0 + 4 * DX, Z + 2, B(52.5), 1.2]]); lake.u.uChop.value = .2; lake.u.uDist.value = .012; const k = E.io2(seg(t, B(52), B(54.25))); cam.position.set(lerp(6, 8, k), 6, Z + lerp(118, 112, k)); look.set(lerp(3, 4, k), -21, Z); cam.fov = 38; });
  // 54.25–56：E 的背后：四条点灯的船已经走远，水里只剩价格柱
  const s4 = shot(B(54.25), B(56), .86, t => { const k = seg(t, B(54.25), B(56)), ex = X0 + 4 * DX; sky.u.uMoon.value.set(-.6735, .1994, -.7117).normalize(); lake.u.uMoon.value.copy(sky.u.uMoon.value); lake.u.uGlit.value = .14; lake.u.uChop.value = .14; cam.position.set(ex + 9.4 - 2.2 * k, 4.6 - .3 * k, Z + 16 - 3.6 * k); look.set(ex + 7.4 - 30.8, 4.4, Z + 12.8 - 39.4); cam.fov = 46; });
  return [s1, s1b, s2, s3, s4];
}
