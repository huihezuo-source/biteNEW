import * as THREE from 'three';
export const P = new URLSearchParams(location.search);
export const W = +(P.get('w') || 1440), H = +(P.get('h') || 1920);
export const QUALITY = P.get('q') || 'draft';
export const FPS = +(P.get('fps') || 30);
export const UI = W / 1440;              // 界面尺寸缩放
export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.info.autoReset = true;

// —— 数学 ——
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
export const E = {
  out2: k => 1 - (1 - k) ** 2, out3: k => 1 - (1 - k) ** 3, out4: k => 1 - (1 - k) ** 4, out5: k => 1 - (1 - k) ** 5,
  in2: k => k * k, in3: k => k ** 3, in4: k => k ** 4,
  io2: k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2,
  io3: k => k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2,
  io4: k => k < .5 ? 8 * k ** 4 : 1 - (-2 * k + 2) ** 4 / 2,
  expo: k => k >= 1 ? 1 : 1 - 2 ** (-10 * k),
  back: k => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

// —— 共用 GLSL ——
export const GLSL_NOISE = /* glsl */`
float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p,int oct){float s=0.,a=.5;for(int i=0;i<oct;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vnoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p,int oct){float s=0.,a=.5;for(int i=0;i<oct;i++){s+=a*vnoise3(p);p=p*2.03+vec3(17.1,9.2,3.3);a*=.5;}return s;}
`;

export const FS_VERT = /* glsl */`in vec3 position; out vec2 vUv; void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }`;
export function fsMat(frag, uniforms = {}, opts = {}) {
  return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: `precision highp float; precision highp int; in vec2 vUv; out vec4 O;\n${frag}`, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending, ...opts });
}
const triGeo = new THREE.BufferGeometry();
triGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const tri = new THREE.Mesh(triGeo); tri.frustumCulled = false;
const triScene = new THREE.Scene(); triScene.add(tri);
const triCam = new THREE.Camera();
export function blit(mat, target) { tri.material = mat; renderer.setRenderTarget(target); renderer.render(triScene, triCam); }
export function hdrTarget(w, h, o = {}) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.NoColorSpace, generateMipmaps: false, ...o });
}
