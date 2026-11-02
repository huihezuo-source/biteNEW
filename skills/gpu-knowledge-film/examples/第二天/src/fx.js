import * as THREE from 'three';
import { W, H, renderer, fsMat, blit, hdrTarget } from './core.js';
import { accumRT } from './post.js';
import { TRANSITIONS } from './fx_transitions.js';

// —— 现成特效：转场来自 gl-transitions，冲击波思路来自 pmndrs/postprocessing ——
const rt = [hdrTarget(W, H), hdrTarget(W, H)];
const copyMat = fsMat(`uniform sampler2D t; void main(){ O=vec4(texture(t,vUv).rgb,1.); }`, { t: { value: null } });
export function grab(i) { copyMat.uniforms.t.value = accumRT.texture; blit(copyMat, rt[i]); }

const cache = new Map();
export function transitionMat(name, params = {}) {
  const key = name + JSON.stringify(params);
  if (cache.has(key)) return cache.get(key);
  const T = TRANSITIONS[name];
  if (!T) throw new Error('没有这个转场：' + name);
  let src = T.s;
  for (const [k, [typ, val]] of Object.entries(T.p)) {
    const v = params[k] !== undefined ? params[k] : val;
    src = src.replace(`/*@${k}*/`, `const ${typ} ${k}=${v};`);
  }
  const m = fsMat(/* glsl */`uniform sampler2D tFrom,tTo; uniform float progress,ratio;
vec4 getFromColor(vec2 uv){ return texture(tFrom,uv); }
vec4 getToColor(vec2 uv){ return texture(tTo,uv); }
${src}
void main(){ O=vec4(transition(vUv).rgb,1.); }`, { tFrom: { value: rt[0].texture }, tTo: { value: rt[1].texture }, progress: { value: 0 }, ratio: { value: W / H } });
  cache.set(key, m); return m;
}
export function mixTransition(name, p, params) { const m = transitionMat(name, params); m.uniforms.progress.value = p; blit(m, accumRT); }

// list：[{ at:切点秒, dur:时长, name, params, ease }]。切点两边的镜头同时渲染
export function timeline(list, shotsOf) {
  return t => {
    for (const e of list) {
      const a = e.at - e.dur / 2, b = e.at + e.dur / 2;
      if (t < a || t >= b) continue;
      const k = (t - a) / e.dur;
      return { from: shotsOf(e.at - 1e-3), to: shotsOf(e.at + 1e-3), p: e.ease ? e.ease(k) : k, name: e.name, params: e.params, at: e.at };
    }
    return null;
  };
}

// —— 打击类：写在 pp.fx 里，Bloom 之前作用在 HDR 上 ——
const HEAD = `uniform sampler2D t; uniform float k,ratio,seed; uniform vec2 c; uniform vec3 col;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}`;
const FX = {
  // 冲击波：k 是半径（0–1.6），三个通道半径略错开就是彩虹环
  shock: `uniform float w,amp,split;
vec2 bend(vec2 uv,float r){ vec2 d=(uv-c)*vec2(ratio,1.); float l=length(d); float x=(l-r)/w; if(abs(x)>1.) return uv;
  float s=(1.+cos(x*3.14159))*.5*sin(x*3.14159); return uv-normalize(d+1e-5)/vec2(ratio,1.)*s*amp; }
void main(){ vec3 o; o.r=texture(t,bend(vUv,k+split)).r; o.g=texture(t,bend(vUv,k)).g; o.b=texture(t,bend(vUv,k-split)).b;
  float l=length((vUv-c)*vec2(ratio,1.)); float e=exp(-pow((l-k)/(w*.35),2.))*amp*18.; o+=col*e; O=vec4(o,1.); }`,
  // 体积光：k 是强度，c 是光源屏幕位置
  rays: `uniform float decay,thr;
void main(){ vec3 o=texture(t,vUv).rgb; vec2 d=(c-vUv)/40.; vec2 p=vUv+d*(h(vUv*911.+seed)-.5); float w=1.; vec3 s=vec3(0.);
  for(int i=0;i<40;i++){ p+=d; vec3 x=texture(t,p).rgb; float L=max(max(x.r,x.g),x.b); s+=x*smoothstep(thr,thr*2.,L)*w; w*=decay; }
  O=vec4(o+s/40.*k*col,1.); }`,
  // 故障：k 是强度，随机块横移加通道分离
  glitch: `void main(){ vec2 uv=vUv; float row=floor(vUv.y*18.); float n=h(vec2(row,seed)); float on=step(1.-k*.7,n);
  uv.x+=on*(h(vec2(row,seed+3.))-.5)*.22*k; float s=.012*k*(1.+on*3.);
  vec3 o=vec3(texture(t,uv+vec2(s,0.)).r,texture(t,uv).g,texture(t,uv-vec2(s,0.)).b);
  O=vec4(o*(1.-.25*k*step(.5,fract(vUv.y*480.))),1.); }`,
  // 一帧墨纸：亮处变墨，暗处变纸，《脑内擂台》的打击帧
  ink: `uniform float thr; void main(){ vec3 x=texture(t,vUv).rgb; float L=dot(x,vec3(.2126,.7152,.0722)); float m=smoothstep(thr*.7,thr*1.3,L+(h(vUv*730.)-.5)*.06);
  vec3 paper=vec3(.84,.74,.60),inkc=vec3(.012,.01,.01); O=vec4(mix(x,mix(paper,inkc,m),k),1.); }`,
  // 桶形畸变：k>0 向外鼓，重击时用
  lens: `void main(){ vec2 d=(vUv-c)*vec2(ratio,1.); float r2=dot(d,d); vec2 uv=c+d*(1.+k*r2)/vec2(ratio,1.)/(1.+k*.25); vec2 ca=(uv-c)*.012*abs(k);
  O=vec4(texture(t,uv+ca).r,texture(t,uv).g,texture(t,uv-ca).b,1.); }`,
};
const fxMats = {};
function fxMat(name) {
  if (fxMats[name]) return fxMats[name];
  const u = { t: { value: null }, k: { value: 0 }, ratio: { value: W / H }, seed: { value: 0 }, c: { value: new THREE.Vector2(.5, .5) }, col: { value: new THREE.Color(1, 1, 1) }, w: { value: .1 }, amp: { value: .03 }, split: { value: .012 }, decay: { value: .96 }, thr: { value: 1 } };
  return fxMats[name] = fsMat(HEAD + FX[name], u);
}
// e：{ fx:'shock', k, c:[x,y], col:[r,g,b], 其它同名 uniform }
export function runFx(list, seed) {
  for (const e of list) {
    const m = fxMat(e.fx), u = m.uniforms;
    u.t.value = accumRT.texture; u.k.value = e.k; u.seed.value = seed;
    if (e.c) u.c.value.set(e.c[0], e.c[1]); if (e.col) u.col.value.setRGB(e.col[0], e.col[1], e.col[2]);
    for (const n of ['w', 'amp', 'split', 'decay', 'thr']) if (e[n] !== undefined) u[n].value = e[n];
    blit(m, rt[0]); copyMat.uniforms.t.value = rt[0].texture; blit(copyMat, accumRT);
  }
}
