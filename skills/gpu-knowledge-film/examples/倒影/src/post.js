import * as THREE from 'three';
import { W, H, UI, renderer, fsMat, blit, hdrTarget, QUALITY } from './core.js';

// —— 累积缓冲：运动模糊 + 抖动抗锯齿 + 真景深 ——
const hasFloatBlend = !!renderer.getContext().getExtension('EXT_float_blend');
export const sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: false, samples: 0, colorSpace: THREE.NoColorSpace });
export const accumRT = new THREE.WebGLRenderTarget(W, H, { type: hasFloatBlend ? THREE.FloatType : THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, colorSpace: THREE.NoColorSpace });
const addMat = fsMat(`uniform sampler2D t; uniform float k; void main(){ O=vec4(texture(t,vUv).rgb*k,1.); }`, { t: { value: null }, k: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
export function accumClear() { renderer.setRenderTarget(accumRT); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false); }
export function accumAdd(k) { addMat.uniforms.t.value = sceneRT.texture; addMat.uniforms.k.value = k; renderer.autoClear = false; blit(addMat, accumRT); renderer.autoClear = true; }

const hudMat = fsMat(/* glsl */`uniform sampler2D t; uniform float k; void main(){ vec4 c=texture(t,vUv); vec3 rgb=c.a>0.?pow(c.rgb/c.a,vec3(2.2))*c.a:vec3(0.); O=vec4(rgb*k,c.a); }`, { t: { value: null }, k: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
export function hudOver(tex, k) { hudMat.uniforms.t.value = tex; hudMat.uniforms.k.value = k; renderer.autoClear = false; blit(hudMat, accumRT); renderer.autoClear = true; }

// —— 多级 Bloom（COD:AW 13 点下采样 + 帐篷上采样）——
const LEVELS = 8;
const mips = []; { let w = W, h = H; for (let i = 0; i < LEVELS; i++) { w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); mips.push(hdrTarget(w, h)); } }
const downMat = fsMat(/* glsl */`
uniform sampler2D t; uniform vec2 px; uniform float first, thr, knee;
vec3 s(vec2 uv){ return texture(t,uv).rgb; }
float lum(vec3 c){ return dot(c,vec3(.2126,.7152,.0722)); }
vec3 karis(vec3 c){ return c/(1.+max(max(c.r,c.g),c.b)*.25); }
void main(){
  vec2 p=px;
  vec3 a=s(vUv+vec2(-2,2)*p),b=s(vUv+vec2(0,2)*p),c=s(vUv+vec2(2,2)*p),d=s(vUv+vec2(-2,0)*p),e=s(vUv),f=s(vUv+vec2(2,0)*p),g=s(vUv+vec2(-2,-2)*p),h=s(vUv+vec2(0,-2)*p),i=s(vUv+vec2(2,-2)*p),j=s(vUv+vec2(-1,1)*p),k=s(vUv+vec2(1,1)*p),l=s(vUv+vec2(-1,-1)*p),m=s(vUv+vec2(1,-1)*p);
  vec3 r;
  if(first>.5){
    vec3 g0=(a+b+d+e)*.25,g1=(b+c+e+f)*.25,g2=(d+e+g+h)*.25,g3=(e+f+h+i)*.25,g4=(j+k+l+m)*.25;
    r=karis(g0)*.125+karis(g1)*.125+karis(g2)*.125+karis(g3)*.125+karis(g4)*.5;
    float L=max(max(r.r,r.g),r.b); float sft=clamp(L-thr+knee,0.,2.*knee); sft=sft*sft/(4.*knee+1e-5);
    r*=max(sft,L-thr)/max(L,1e-5);
  } else {
    r=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125;
  }
  O=vec4(max(r,vec3(0.)),1.);
}`, { t: { value: null }, px: { value: new THREE.Vector2() }, first: { value: 0 }, thr: { value: 1 }, knee: { value: .5 } });
const upMat = fsMat(/* glsl */`
uniform sampler2D t; uniform vec2 px; uniform float r, w;
void main(){ vec2 p=px*r;
  vec3 c=texture(t,vUv).rgb*4.;
  c+=(texture(t,vUv+vec2(p.x,0)).rgb+texture(t,vUv-vec2(p.x,0)).rgb+texture(t,vUv+vec2(0,p.y)).rgb+texture(t,vUv-vec2(0,p.y)).rgb)*2.;
  c+=texture(t,vUv+p).rgb+texture(t,vUv-p).rgb+texture(t,vUv+vec2(p.x,-p.y)).rgb+texture(t,vUv+vec2(-p.x,p.y)).rgb;
  O=vec4(c/16.*w,1.); }`, { t: { value: null }, px: { value: new THREE.Vector2() }, r: { value: 1 }, w: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });

// —— 总合成：HDR → 色调 → 调色 → 颗粒 → 字幕 ——
const compMat = fsMat(/* glsl */`
uniform sampler2D tHDR,tBloom,tSub;
uniform float uExposure,uBloom,uVig,uGrain,uCA,uWarp,uFlash,uFade,uSeed,uContrast,uSat,uHud,uStreak,uDesat,uShake,uFlip;
uniform vec3 uFlashC,uLift,uGain; uniform vec2 uWarpC,uRes;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec3 aces(vec3 x){ x*=.6; const mat3 I=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777); const mat3 O_=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
  vec3 v=I*x; vec3 a=v*(v+.0245786)-.000090537; vec3 b=v*(.983729*v+.4329510)+.238081; return clamp(O_*(a/b),0.,1.); }
vec3 srgb(vec3 c){ return mix(c*12.92,1.055*pow(max(c,vec3(1e-6)),vec3(1./2.4))-.055,step(.0031308,c)); }
vec3 hdr(vec2 uv){ vec2 d=uv-.5; float r2=dot(d,d);
  vec3 c; c.r=texture(tHDR,uv-d*uCA*(1.+r2)).r; c.g=texture(tHDR,uv).g; c.b=texture(tHDR,uv+d*uCA*(1.+r2)).b; return c; }
void main(){
  vec2 uv=vUv; if(uFlip<.999) uv.y=.5+(vUv.y-.5)/(abs(uFlip)<.002?.002:uFlip);
  vec3 c=vec3(0.);
  if(uWarp>.001){ vec2 dir=(uv-uWarpC); float tot=0.; for(int i=0;i<24;i++){ float k=float(i)/23.; float w=1.-k*.75; c+=hdr(uWarpC+dir*(1.-uWarp*k))*w; tot+=w; } c/=tot; }
  else c=hdr(uv);
  vec3 b=texture(tBloom,uv).rgb;
  if(uStreak>0.){ /* 变形镜头拖尾：横向取样 bloom */ vec3 s=vec3(0.); for(int i=-6;i<=6;i++){ s+=texture(tBloom,uv+vec2(float(i)*.045,0.)).rgb*(1.-abs(float(i))/7.); } c+=s*uStreak*vec3(.55,.75,1.)*.09; }
  c+=b*uBloom;
  if(uv.y<0.||uv.y>1.) c=vec3(0.);
  c*=uExposure;
  c=aces(c);
  c=srgb(c);
  float l=dot(c,vec3(.2126,.7152,.0722));
  c=mix(vec3(l),c,uSat);
  c=mix(c,vec3(l),uDesat);
  c=(c-.5)*uContrast+.5;
  c=c*uGain+uLift*(1.-c);
  vec2 d=(uv-.5)*vec2(uRes.x/uRes.y,1.); float v=1.-uVig*smoothstep(.25,.95,length(d)*1.25); c*=v;
  c*=1.-uFade;
  float g=h12(gl_FragCoord.xy+uSeed*vec2(91.7,37.3))-.5; float g2=h12(gl_FragCoord.yx*.73+uSeed*vec2(13.1,71.9))-.5;
  c+=(g+g2)*uGrain*(1.-.6*l);
  vec4 s=texture(tSub,vUv); c=c*(1.-s.a)+s.rgb;
  { float f=clamp(uFlash,0.,1.); c=1.-(1.-c)*(1.-uFlashC*f); }
  c+=(h12(gl_FragCoord.xy+7.)-.5)/255.;
  O=vec4(c,1.);
}`, {
  tHDR: { value: null }, tBloom: { value: null }, tSub: { value: null },
  uExposure: { value: 1 }, uBloom: { value: .08 }, uVig: { value: .35 }, uGrain: { value: .018 }, uCA: { value: .002 }, uWarp: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 0 }, uSeed: { value: 0 }, uContrast: { value: 1.04 }, uSat: { value: 1.05 }, uHud: { value: 1 }, uStreak: { value: 0 }, uFlip: { value: 1 }, uDesat: { value: 0 }, uShake: { value: 0 },
  uFlashC: { value: new THREE.Color(1, 1, 1) }, uLift: { value: new THREE.Color(.0, .004, .010) }, uGain: { value: new THREE.Color(1, 1, 1) }, uWarpC: { value: new THREE.Vector2(.5, .5) }, uRes: { value: new THREE.Vector2(W, H) },
});
export const defaults = () => ({ exposure: 1, bloom: .10, threshold: 1.0, knee: .6, radius: 1.0, vig: .35, grain: .018, ca: .0016, warp: 0, warpC: [.5, .5], flash: 0, flashC: [1, 1, 1], fade: 0, contrast: 1.04, sat: 1.05, hud: 1, streak: 0, desat: 0, lift: [0, .004, .010], gain: [1, 1, 1], flip: 1 });

export function postProcess(pp, subTex, seed) {
  // Bloom 下采样
  let src = accumRT.texture; let w = W, h = H;
  downMat.uniforms.thr.value = pp.threshold; downMat.uniforms.knee.value = pp.knee;
  for (let i = 0; i < LEVELS; i++) {
    downMat.uniforms.t.value = src; downMat.uniforms.px.value.set(1 / w, 1 / h); downMat.uniforms.first.value = i === 0 ? 1 : 0;
    blit(downMat, mips[i]); src = mips[i].texture; w = mips[i].width; h = mips[i].height;
  }
  // 上采样
  renderer.autoClear = false;
  const weights = [1, 1, 1, 1, 1.1, 1.3, 1.6, 2.0];
  for (let i = LEVELS - 1; i > 0; i--) {
    upMat.uniforms.t.value = mips[i].texture; upMat.uniforms.px.value.set(1 / mips[i].width, 1 / mips[i].height); upMat.uniforms.r.value = pp.radius; upMat.uniforms.w.value = weights[i] * .62;
    blit(upMat, mips[i - 1]);
  }
  renderer.autoClear = true;
  const u = compMat.uniforms;
  u.tHDR.value = accumRT.texture; u.tBloom.value = mips[0].texture; u.tSub.value = subTex;
  u.uExposure.value = pp.exposure; u.uBloom.value = pp.bloom; u.uVig.value = pp.vig; u.uGrain.value = pp.grain; u.uCA.value = pp.ca; u.uWarp.value = pp.warp; u.uWarpC.value.set(pp.warpC[0], pp.warpC[1]);
  u.uFlash.value = pp.flash; u.uFlashC.value.setRGB(pp.flashC[0], pp.flashC[1], pp.flashC[2]); u.uFade.value = pp.fade; u.uSeed.value = seed; u.uContrast.value = pp.contrast; u.uSat.value = pp.sat; u.uStreak.value = pp.streak; u.uDesat.value = pp.desat; u.uFlip.value = pp.flip;
  u.uLift.value.setRGB(pp.lift[0], pp.lift[1], pp.lift[2]); u.uGain.value.setRGB(pp.gain[0], pp.gain[1], pp.gain[2]);
  blit(compMat, null);
}
