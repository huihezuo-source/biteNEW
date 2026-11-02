import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { renderer, fsMat, blit, GLSL_NOISE, clamp, E, ss, seg, rng } from './core.js';

// —— 把着色器烤成贴图 ——
export function bake(frag, size = 1024, uniforms = {}, srgb = true) {
  const rt = new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, depthBuffer: false, colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace });
  rt.texture.anisotropy = 16;
  const m = fsMat(`${GLSL_NOISE}\n${frag}`, uniforms); blit(m, rt); m.dispose(); renderer.setRenderTarget(null);
  return rt.texture;
}

// —— 环境光：暗室 + 几条柔光 ——
export function makeEnv(kind = 'room') {
  const s = new THREE.Scene(); s.background = new THREE.Color(kind === 'studio' ? 0x020203 : 0x050403);
  const box = (x, y, z, sx, sy, sz, c, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); s.add(m); return m; };
  if (kind === 'room') { box(0, 6, 0, 8, .2, 3, 0xffd9b0, 6); box(-7, 2, -3, .2, 4, 4, 0xffb070, 3); box(7, 1, 2, .2, 5, 1.2, 0x9fc4ff, 2.5); box(0, 1, 8, 5, 3, .2, 0x2a3a60, 2); }
  else if (kind === 'studio') { box(-1.2, 8, 0, .5, .2, 16, 0xffffff, 30); box(2.4, 8, -1, .22, .2, 16, 0xdce8ff, 26); box(-4.4, 8, 0, 1.1, .2, 14, 0xffe9d0, 14); box(5.6, 7, 0, .6, .2, 14, 0xbfd4ff, 12); box(-9, 3, 0, .2, 7, 2, 0xfff0dd, 9); box(9, 3, 0, .2, 7, 2, 0xcfe0ff, 9); box(0, -6, 0, 12, .2, 12, 0x223040, 1.0); }
  else if (kind === 'gold') { box(0, 7, 2, 7, .2, 7, 0xfff0d0, 12); box(-7, 2, 0, .2, 6, 3, 0xffc070, 8); box(7, 3, -3, .2, 7, 2, 0xffe0b0, 10); box(0, 1, 8, 6, 4, .2, 0x5a3a18, 3); box(0, -5, 0, 14, .2, 14, 0x2a1a08, 2); }
  else if (kind === 'coin') { // 产品摄影：一圈竖向柔光 + 顶光，金属才有高光条
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b = box(Math.cos(a) * 9, 0, Math.sin(a) * 9, i % 3 === 0 ? 1.7 : .5, 18, .2, i % 2 ? 0xfff0d0 : 0xffc880, i % 3 === 0 ? 26 : 13); b.lookAt(0, 0, 0); }
    box(0, 9, 0, 9, .2, 9, 0xfff4e0, 16); box(0, -9, 0, 18, .2, 18, 0xa8682a, 9);
  }
  const p = new THREE.PMREMGenerator(renderer); const rt = p.fromScene(s, .012); p.dispose();
  return rt.texture;
}

// —— 屏幕 UI ——
const lerp_ = (a, b, k) => a + (b - a) * k;
const DAYS = ['涨', '跌', '涨', '涨', '跌', '涨', '跌', '跌', '涨', '涨'];
export function makeScreen() {
  const c = document.createElement('canvas'); c.width = 1179; c.height = 2556; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const RED = '#FF4136', GRN = '#21D07A', GOLD = '#FFC860';
  function rr(a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
  function bubble(y, k, a, scale = 1) {
    const h = 244, w = 846; const bx = 48;
    x.save(); x.globalAlpha = a; x.translate(bx, y + h); x.scale(scale, scale); x.translate(-bx, -(y + h));
    x.fillStyle = '#26272B'; rr(bx, y, w, h, 52); x.fill();
    x.fillStyle = '#A4A6AD'; x.font = '500 46px NSans'; x.textBaseline = 'alphabetic'; x.fillText(`第 ${k + 1} 个交易日  09:15`, bx + 46, y + 72);
    x.fillStyle = '#F4F4F6'; x.font = '800 94px NSans'; x.fillText('明日大盘：', bx + 44, y + 192);
    const d = DAYS[k]; x.fillStyle = d === '涨' ? RED : GRN; x.font = '900 112px NSans'; x.fillText(d, bx + 44 + 472, y + 196);
    x.restore();
  }
  function stamp(y, a, s) {
    if (a <= 0) return; const cx = 1016, cy = y + 122;
    x.save(); x.globalAlpha = a; x.translate(cx, cy); x.scale(s * 1.22, s * 1.22); x.strokeStyle = GOLD; x.lineWidth = 14; x.beginPath(); x.arc(0, 0, 66, 0, Math.PI * 2); x.stroke();
    x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 18; x.beginPath(); x.moveTo(-30, 2); x.lineTo(-8, 26); x.lineTo(34, -24); x.stroke(); x.restore();
  }
  function frame(title = '李老师', sub = '短信') {
    const g = x.createLinearGradient(0, 0, 0, 2556); g.addColorStop(0, '#101114'); g.addColorStop(1, '#08090B'); x.fillStyle = g; x.fillRect(0, 0, 1179, 2556);
  }
  function chrome(title = '李老师') {
    x.fillStyle = '#17181B'; x.fillRect(0, 0, 1179, 362);
    x.fillStyle = '#F4F4F6'; x.font = '700 50px NSans'; x.textBaseline = 'alphabetic'; x.fillText('09:15', 100, 92);
    x.fillStyle = '#F4F4F6'; rr(1020, 58, 86, 40, 12); x.fill();
    x.fillStyle = '#3A3B41'; x.beginPath(); x.arc(590, 214, 62, 0, Math.PI * 2); x.fill(); x.fillStyle = '#E6E6EA'; x.font = '700 62px NSans'; x.textAlign = 'center'; x.fillText('李', 590, 236);
    x.fillStyle = '#F4F4F6'; x.font = '600 44px NSans'; x.fillText(title, 590, 332); x.textAlign = 'left';
  }
  return {
    c, tex,
    drawThread(n, pop, eleven = 0, payGlow = 0) {          // n：已到几条；pop：最新一条的动画 0–1
      frame();
      const H = 296, top = 400, e = E.out3(clamp(eleven * 1.6));
      const sc = k => Math.max(0, k - 5) * H;                        // k 条时的滚动量
      const scroll = lerp_(sc(n - 1), sc(n), E.out3(clamp(pop))) + e * 700;
      for (let i = n - 1; i >= 0; i--) {
        const y = top + i * H - scroll; const a = i === n - 1 ? clamp(pop * 3) : 1; if (y < 200 || y > 2556) continue;
        bubble(y, i, a, i === n - 1 ? .8 + .2 * E.back(clamp(pop * 1.4)) : 1);
        const st = i === n - 1 ? clamp((pop - .45) * 3) : 1; stamp(y, st, i === n - 1 ? 1.6 - .6 * E.out3(st) : 1);
      }
      if (eleven > 0) {
        const a = clamp(eleven * 3), y = 1250 + (1 - E.out3(clamp(eleven * 1.6))) * 200; x.save(); x.globalAlpha = a;
        x.fillStyle = '#2C2D32'; rr(64, y, 960, 640, 56); x.fill();
        x.fillStyle = '#F2F2F4'; x.font = '700 82px NSans'; x.fillText('想跟单吗？', 124, y + 130);
        x.fillStyle = '#C9CAD0'; x.font = '500 62px NSans'; x.fillText('内部跟单群，一位', 124, y + 240);
        x.fillStyle = GOLD; x.font = '900 150px NSans'; x.fillText('¥30,000', 124, y + 410);
        x.fillStyle = RED; rr(124, y + 462, 840, 130, 34); x.fill(); x.fillStyle = '#fff'; x.font = '800 66px NSans'; x.textAlign = 'center'; x.fillText('确认转账', 544, y + 550); x.textAlign = 'left';
        if (payGlow > 0) { x.globalAlpha = payGlow * a; x.strokeStyle = '#FFD9D4'; x.lineWidth = 10; rr(124, y + 462, 840, 130, 34); x.stroke(); }
        x.restore();
      }
      chrome();
      tex.needsUpdate = true;
    },
    drawBoard(scroll) {                                   // 基金排行榜
      const g = x.createLinearGradient(0, 0, 0, 2556); g.addColorStop(0, '#0E0F12'); g.addColorStop(1, '#08090B'); x.fillStyle = g; x.fillRect(0, 0, 1179, 2556);
      const rows = 40, H = 214;
      for (let i = 0; i < rows; i++) {
        const y = 430 + i * H - scroll; if (y < 200 || y > 2556) continue;
        const pct = (182.31 * Math.exp(-i * .052) + 12.4).toFixed(2);
        x.fillStyle = i < 3 ? GOLD : '#8D8F96'; x.font = '800 74px JB'; x.fillText(String(i + 1), 64, y + 118);
        x.fillStyle = '#F2F2F4'; x.font = '600 62px NSans'; x.fillText(['***成长混合 A', '***精选股票 C', '***先进制造 A', '***科技创新 C', '***价值优选 A'][i % 5], 200, y + 88);
        x.fillStyle = '#7D7F86'; x.font = '500 40px NSans'; x.fillText(`连续 ${5 - (i % 3)} 年跑赢大盘`, 200, y + 150);
        x.fillStyle = RED; x.font = '800 76px JB'; x.textAlign = 'right'; x.fillText(`+${pct}%`, 1120, y + 122); x.textAlign = 'left';
        x.fillStyle = '#212226'; x.fillRect(64, y + 194, 1056, 2);
      }
      x.fillStyle = '#17181B'; x.fillRect(0, 0, 1179, 400);
      x.fillStyle = '#F4F4F6'; x.font = '700 50px NSans'; x.fillText('09:15', 100, 92); rr(1020, 58, 86, 40, 12); x.fill();
      x.font = '800 92px NSans'; x.fillText('基金排行榜', 64, 260); x.fillStyle = GOLD; x.font = '600 50px NSans'; x.fillText('近一年  ·  收益最高', 64, 340);
      tex.needsUpdate = true;
    },
    drawGroup(scroll) {                                    // 荐股群
      x.fillStyle = '#0D0E10'; x.fillRect(0, 0, 1179, 2556);
      const msgs = [['A', '老师太准了！！', '#E0524D'], ['B', '+10.02% 涨停！', '#3F8CFF', 1], ['C', '今天又赚了三万', '#22B07D'], ['D', '跟上了，感恩老师', '#D8A23C'], ['E', '+268%', '#9B6DFF', 1], ['F', '刚进群，太晚了吗', '#E0524D'], ['G', '现在加入还来得及', '#3F8CFF'], ['H', '我上个月翻倍了', '#22B07D'], ['I', '+132%', '#D8A23C', 1], ['J', '老师太神了', '#9B6DFF']];
      const H = 268;
      for (let i = 0; i < 44; i++) {
        const y = 430 + i * H - scroll; if (y < 180 || y > 2556) continue; const m = msgs[i % msgs.length];
        x.fillStyle = m[2]; rr(56, y + 6, 124, 124, 30); x.fill(); x.fillStyle = '#fff'; x.font = '800 66px NSans'; x.textAlign = 'center'; x.fillText(m[0], 118, y + 92); x.textAlign = 'left';
        const big = m[3]; x.font = big ? '900 104px JB' : '600 66px NSans'; const w = x.measureText(m[1]).width;
        x.fillStyle = '#26272B'; rr(208, y, w + 96, big ? 190 : 150, 40); x.fill(); x.fillStyle = big ? RED : '#F2F2F4'; x.fillText(m[1], 256, y + (big ? 132 : 98));
      }
      x.fillStyle = '#17181B'; x.fillRect(0, 0, 1179, 360); x.fillStyle = '#F4F4F6'; x.font = '700 50px NSans'; x.fillText('09:15', 100, 92); rr(1020, 58, 86, 40, 12); x.fill(); x.textAlign = 'center'; x.font = '800 66px NSans'; x.fillText('牛股内参 VIP 群（30）', 590, 270); x.textAlign = 'left';
      tex.needsUpdate = true;
    },
    drawReply(typed, sent, status, dark = 0) {             // 回到手机：你回一句
      frame();
      const H = 296; const base = 1300; for (let i = 9; i > 5; i--) { const y = base - (9 - i) * H - 520; if (y > 330) { bubble(y, i, .5); stamp(y, .5, 1); } }
      x.fillStyle = '#2C2D32'; rr(64, 1090, 960, 640, 56); x.fill();
      x.fillStyle = '#F2F2F4'; x.font = '700 82px NSans'; x.fillText('想跟单吗？', 124, 1220); x.fillStyle = '#C9CAD0'; x.font = '500 62px NSans'; x.fillText('内部跟单群，一位', 124, 1330); x.fillStyle = GOLD; x.font = '900 150px NSans'; x.fillText('¥30,000', 124, 1500);
      x.fillStyle = '#5a5b60'; rr(124, 1552, 840, 130, 34); x.fill(); x.fillStyle = '#c8c8cc'; x.font = '800 66px NSans'; x.textAlign = 'center'; x.fillText('确认转账', 544, 1640); x.textAlign = 'left';
      if (sent > 0) { const a = clamp(sent * 3), s = .8 + .2 * E.back(clamp(sent * 1.5)); x.save(); x.globalAlpha = a; x.translate(1115, 1980); x.scale(s, s); x.translate(-1115, -1980);
        x.fillStyle = '#1F6FEB'; rr(525, 1790, 590, 190, 60); x.fill(); x.fillStyle = '#fff'; x.font = '800 92px NSans'; x.fillText('分母是多少？', 572, 1920); x.restore(); }
      if (status > 0) { x.save(); x.globalAlpha = status; x.fillStyle = '#9A9CA3'; x.font = '500 44px NSans'; x.textAlign = 'right'; x.fillText('已送达', 1110, 2046); x.restore(); }
      // 输入框
      x.fillStyle = '#1B1C20'; x.fillRect(0, 2230, 1179, 326); x.strokeStyle = '#3A3B41'; x.lineWidth = 4; rr(64, 2268, 1050, 128, 64); x.stroke();
      x.fillStyle = typed ? '#fff' : '#6d6e74'; x.font = '600 72px NSans'; x.fillText(typed || '短信', 118, 2358);
      if (typed && sent <= 0) { const w = x.measureText(typed).width; x.fillStyle = '#7FB2FF'; x.fillRect(122 + w, 2294, 8, 80); }
      chrome();
      if (dark > 0) { x.fillStyle = `rgba(0,0,0,${dark})`; x.fillRect(0, 0, 1179, 2556); }
      tex.needsUpdate = true;
    },
  };
}

// —— 手机模型（平放，屏幕朝上，长边沿 z）——
export function makePhone(screenTex, env) {
  const g = new THREE.Group();
  const W_ = .0715, D = .1476, T = .0080;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W_, T, D, 8, .0036), new THREE.MeshPhysicalMaterial({ color: 0x77787d, metalness: 1, roughness: .28, clearcoat: .6, clearcoatRoughness: .25, envMap: env, envMapIntensity: 1.1 }));
  g.add(body);
  // 屏：圆角矩形
  const s = new THREE.Shape(); const w = W_ - .0016, h = D - .0016, r = .0088; const x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const sg = new THREE.ShapeGeometry(s, 16); const uv = sg.attributes.uv, pos = sg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x0) / w, (pos.getY(i) - y0) / h);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0, roughness: .06, clearcoat: .6, clearcoatRoughness: .05, envMap: env, envMapIntensity: .07, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.5, specularIntensity: .4 });
  const screen = new THREE.Mesh(sg, glass); screen.rotation.x = -Math.PI / 2; screen.position.y = T / 2 + .00012; g.add(screen);
  // 灵动岛
  const isl = new THREE.Mesh(new RoundedBoxGeometry(.0185, .0001, .0054, 3, .00005), new THREE.MeshBasicMaterial({ color: 0x000000 })); isl.position.set(0, T / 2 + .00022, -D / 2 + .0085); g.add(isl);
  // 侧键
  const km = body.material; [[W_ / 2 + .0003, 0, -.02, .0009, .0028, .016], [-W_ / 2 - .0003, 0, -.03, .0009, .0028, .011], [-W_ / 2 - .0003, 0, -.016, .0009, .0028, .011]].forEach(a => { const b = new THREE.Mesh(new THREE.BoxGeometry(a[3], a[4], a[5]), km); b.position.set(a[0], a[1], a[2]); g.add(b); });
  return { group: g, screen, glass };
}

// —— 你的房间：贴在墙洞后面 ——
export function makeRoom(origin, env, screen) {
  const room = new THREE.Group(); room.position.copy(origin);
  const wood = bake(/* glsl */`
    uniform float k; void main(){ vec2 p=vUv*vec2(2.2,5.5);
      float warp=fbm(p*vec2(.9,.5),5)*1.8; float y=p.x*16.+warp+.15*sin(p.y*1.2);
      float ring=.5+.5*sin(y*6.2831*.8); ring=pow(ring,1.4);
      float fine=fbm(vec2(p.x*90.,p.y*4.),4);
      vec3 a=vec3(.022,.0135,.010),b=vec3(.085,.050,.032); vec3 c=mix(a,b,ring*.72+.28*fine);
      c*=.86+.3*fbm(p*.9+3.,4); O=vec4(pow(c,vec3(1./2.2)),1.); }`, 2048);
  const woodR = bake(`void main(){ vec2 p=vUv*vec2(2.2,5.5); float f=fbm(vec2(p.x*90.,p.y*4.),4); float r=.22+.22*f; O=vec4(0.,r,0.,1.); }`, 1024, {}, false);
  const wm = new THREE.MeshPhysicalMaterial({ map: wood, roughnessMap: woodR, roughness: 1, metalness: 0, clearcoat: .5, clearcoatRoughness: .22, envMap: env, envMapIntensity: .32 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0x8f8679, roughness: .92, envMap: env, envMapIntensity: .25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: .7, envMap: env, envMapIntensity: .3 });
  const FL = -1.2, CE = 1.45, Lz = -5.2, X = 1.72;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(X * 2, CE - FL, -Lz), [plaster, plaster, plaster, wm, new THREE.MeshBasicMaterial({ visible: false }), plaster]);
  shell.position.set(0, (CE + FL) / 2, Lz / 2); shell.material.forEach?.(m => { m.side = THREE.BackSide; }); room.add(shell);
  // 书桌
  const DT = -.46;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, .036, 1.0), wm); top.position.set(0, DT - .018, -1.05); room.add(top);
  [[-.78, -.62], [.78, -.62], [-.78, -1.48], [.78, -1.48]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .7, .05), dark); l.position.set(x, DT - .036 - .35, z); room.add(l); });
  // 灯
  const lampG = new THREE.Group(); lampG.position.set(-.56, DT, -1.32);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .018, 40), new THREE.MeshStandardMaterial({ color: 0x1b1b1d, metalness: .9, roughness: .35, envMap: env })); base.position.y = .009; lampG.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .34, 16), base.material); pole.position.y = .18; lampG.add(pole);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.075, .135, .17, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe2bb, emissive: 0xffb36b, emissiveIntensity: 2.4, side: THREE.DoubleSide, roughness: .8 })); shade.position.y = .4; lampG.add(shade);
  room.add(lampG);
  const bulb = new THREE.PointLight(0xffa860, 2.1, 12, 2); bulb.position.set(-.56, DT + .36, -1.32); room.add(bulb);
  const fill = new THREE.PointLight(0xffb070, 4.2, 9, 2); fill.position.set(.9, 1.0, -3.2); room.add(fill);
  const sc = null;
  // 书架与串灯：景深里的光斑
  const r = rng(9); const shelf = new THREE.Group(); shelf.position.set(-.2, 0, Lz + .16);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, .02, .26), dark); b.position.set(0, -.8 + i * .62, 0); shelf.add(b); for (let j = 0; j < 22; j++) if (r() > .3) { const h = .24 + r() * .18; const bk = new THREE.Mesh(new THREE.BoxGeometry(.03 + r() * .05, h, .19), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.05 + r() * .1, .3 + r() * .3, .07 + r() * .16), roughness: .8 })); bk.position.set(-1.1 + j * .105, -.8 + i * .62 + h / 2 + .01, 0); shelf.add(bk); } }
  room.add(shelf);
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .62, .26).multiplyScalar(5) });
  for (let i = 0; i < 26; i++) { const k = i / 25; const s = new THREE.Mesh(new THREE.SphereGeometry(.009, 8, 8), bm); s.position.set(-1.6 + 3.2 * k, 1.12 - .14 * Math.sin(k * Math.PI * 3) ** 2, Lz + .1); room.add(s); }
  const gc = document.createElement('canvas'); gc.width = gc.height = 512; { const x = gc.getContext('2d'); const g = x.createRadialGradient(256, 256, 30, 256, 256, 256); g.addColorStop(0, 'rgba(255,214,170,.95)'); g.addColorStop(.35, 'rgba(255,170,110,.3)'); g.addColorStop(1, 'rgba(255,150,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); }
  const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(.46, .6), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .10, toneMapped: false })); halo.rotation.x = -Math.PI / 2; halo.rotation.z = .62; halo.position.set(0, DT + .0012, -1.0); room.add(halo);
  return { room, DT, bulb, shade, sc, fill, bm, halo };
}
