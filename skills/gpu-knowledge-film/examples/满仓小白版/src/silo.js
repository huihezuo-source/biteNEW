import * as THREE from 'three';
import { W, H, renderer, GLSL_NOISE, rng, ss, clamp } from './core.js';
import { N } from './sim.js';
import { R0, Y0, U, STUDIO } from './machine.js';

// —— 钢仓：10000 颗球按六方紧密堆积，仓壁正面镂空“满仓”两字 ——
export const SILO = { cx: 0, cy: Y0 + 8.4, w: 8, h: 10.67, top: 0, bot: 0, zFront: 2.14 };
SILO.top = SILO.cy + SILO.h / 2; SILO.bot = SILO.cy - SILO.h / 2;
const d = R0 * 2.0;
export const slot = { x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), rank: new Int32Array(N) };
{
  const cols = 32, deep = 6; const ry = d * .8165; const list = [];
  let layer = 0; while (list.length < N) { const off = layer % 2 ? d / 2 : 0, offz = layer % 2 ? d * .29 : 0;
    for (let c = 0; c < cols; c++) for (let z = 0; z < deep; z++) { if (list.length >= N) break; const ox = (z % 2 ? d / 2 : 0) + off; list.push([(c - cols / 2 + .5) * d + ox - d / 4, SILO.bot + R0 + layer * ry, .22 + z * d * .866 + offz, layer]); }
    layer++; }
  // 账户和堆积位置打乱
  const r = rng(909), ids = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  ids.forEach((id, k) => { const p = list[k]; slot.x[id] = p[0] + (r() - .5) * .05; slot.y[id] = p[1] + (r() - .5) * .04; slot.z[id] = p[2] + (r() - .5) * .08; slot.rank[id] = k; });
  SILO.levelTop = list[N - 1][1] + R0;
}

function letters() {
  const c = document.createElement('canvas'); c.width = 1536; c.height = 2048; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 960px NSerif`; x.fillText('满', 768, 540); x.fillText('仓', 768, 1500);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 16;
  return t;
}
export function makeSilo() {
  const g = new THREE.Group();
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`precision highp float; in vec3 position; in vec2 uv; uniform mat4 viewMatrix,projectionMatrix,modelMatrix; out vec3 vW; out vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`precision highp float; in vec3 vW; in vec2 vUv; uniform sampler2D tM; uniform vec3 cameraPosition; uniform float uKey,uRoom,uStrip,uCold; out vec4 O; ${GLSL_NOISE}
      void main(){
        vec2 uvm=(vUv-.5)*3.+.5; float a=(uvm.x>0.&&uvm.x<1.&&uvm.y>0.&&uvm.y<1.)?texture(tM,uvm).r:0.;
        vec3 v=normalize(cameraPosition-vW);
        float brush=fbm(vW.xy*vec2(.9,34.),3)-.5;
        vec3 alb=vec3(.90,.915,.93)*(1.+brush*.05);
        vec3 plate=alb*(uRoom*1.42+uKey*.28);
        if(a>.5){
          // 字壁：钢板有厚度，沿视线偏移采样
          vec2 off=-v.xy/max(v.z,.2)*vec2(1./8.,1./10.67)*.42; float w=0.,hit=0.;
          for(int i=1;i<=10;i++){ float k=float(i)/10.; if(texture(tM,uvm+off*k).r<.5){ hit=k; w=1.; break; } }
          if(w<.5) discard;
          float sh=mix(.72,.05,hit)+(off.y>0.?0.:.1);
          O=vec4(alb*vec3(sh)*uRoom*1.25,1.); return;
        }
        float edge=smoothstep(.0,.5,a);
        O=vec4(plate*(1.-.5*edge),1.);
      }`,
    uniforms: { ...U, tM: { value: letters() } },
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(SILO.w * 3, SILO.h * 3), mat); front.position.set(SILO.cx, SILO.cy, SILO.zFront); front.renderOrder = 7;
  const backM = new THREE.MeshBasicMaterial({ color: 0x050607 }); const back = new THREE.Mesh(new THREE.PlaneGeometry(SILO.w * 1.3, SILO.h * 1.3), backM); back.position.set(SILO.cx, SILO.cy, .02); back.renderOrder = 1;
  g.add(front, back); g.userData = { front, back };
  return g;
}
