import * as THREE from 'three';
import { STUDIO, U } from './machine.js';
// —— 液态金属：几颗球按体积融合再分开，光线步进 ——
export function makeMelt() {
  const M = 6;
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`precision highp float; in vec3 position; out vec2 vP; void main(){ vP=position.xy; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader: /* glsl */`precision highp float; in vec2 vP; uniform mat4 uInv; uniform vec3 uCam; uniform vec4 uS[${M}]; uniform vec4 uC[${M}]; uniform int uN; uniform float uK; out vec4 O; ${STUDIO}
      float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
      float map(vec3 p){ float d=1e5; for(int i=0;i<uN;i++){ d=smin(d,length(p-uS[i].xyz)-uS[i].w,uK); } return d; }
      vec4 tintAt(vec3 p){ vec4 c=vec4(0.); float w=0.; for(int i=0;i<uN;i++){ float d=max(length(p-uS[i].xyz)-uS[i].w,.002); float k=1./(d*d*d); c+=uC[i]*k; w+=k; } return c/w; }
      void main(){
        vec4 a=uInv*vec4(vP,-1.,1.), b=uInv*vec4(vP,1.,1.); vec3 ro=a.xyz/a.w, rd=normalize(b.xyz/b.w-ro);
        float t=0., d=0.; bool hit=false;
        { float q=(0.-ro.z)/rd.z; float tmax=q>0.?q:1e3; t=max(0.,tmax-6.);
          for(int i=0;i<72;i++){ vec3 p=ro+rd*t; d=map(p); if(d<.0006){ hit=true; break; } t+=d*.9; if(t>tmax) break; } }
        if(!hit){
          float q=(0.-ro.z)/rd.z; vec3 P=ro+rd*q; float s=0.; for(int i=0;i<uN;i++){ vec3 c=uS[i].xyz; float r=uS[i].w; vec2 e=(P.xy-(c.xy-vec2(0.,r*.75)))/vec2(r*1.5,r*1.9); s=max(s,exp(-dot(e,e)*2.2)); }
          O=vec4(0.,0.,0.,s*.42); return; }
        vec3 p=ro+rd*t; vec2 e=vec2(.0015,0.);
        vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
        vec3 r=reflect(rd,n); float F=pow(1.-max(dot(n,-rd),0.),5.);
        vec4 tc=tintAt(p); vec3 base=mix(vec3(.93,.94,.96),tc.rgb,tc.a);
        vec3 col=studio(r)*mix(base,vec3(1.),F*.8); col*=1.-.5*(1.-smoothstep(-.9,.35,n.z));
        O=vec4(col,1.); }`,
    uniforms: { ...U, uInv: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uN: { value: 0 }, uK: { value: .1 }, uS: { value: Array.from({ length: M }, () => new THREE.Vector4()) }, uC: { value: Array.from({ length: M }, () => new THREE.Vector4()) } },
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 6;
  const mv = new THREE.Matrix4();
  mesh.onBeforeRender = (r, s, cam) => { mv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); mat.uniforms.uInv.value.copy(mv).invert(); };
  return { mesh, set(list, k) { mat.uniforms.uN.value = list.length; mat.uniforms.uK.value = k; list.forEach((b, i) => { mat.uniforms.uS.value[i].set(b.x, b.y, b.z, b.r); mat.uniforms.uC.value[i].set(b.c[0], b.c[1], b.c[2], b.c[3]); }); } };
}
