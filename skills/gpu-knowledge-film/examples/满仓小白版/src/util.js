import * as THREE from 'three';
import { W, H, UI } from './core.js';
export function camSet(cam, p, l, fov, roll = 0) { cam.position.set(p[0], p[1], p[2]); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(l[0], l[1], l[2]); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); return cam; }
const v = new THREE.Vector3();
// 世界坐标 → 画布像素（当前相机）
export function proj(cam, x, y, z = 0) { v.set(x, y, z).project(cam); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; }
export function pxPerUnit(cam, z = 0) { const d = cam.position.z - z; return H / (2 * Math.tan(cam.fov * Math.PI / 360) * d); }
// 屏幕标注：无底，靠墨色
export function tag(x, s, px, py, o = {}) {
  const { size = 62, color = '#101316', weight = 800, family = 'NSans', align = 'center', alpha = 1, shadow = 0, shadowC = 'rgba(0,0,0,.9)', halo = 0 } = o;
  x.save(); x.globalAlpha = alpha; x.font = `${weight} ${size * UI}px ${family}`; x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = color;
  if (shadow) { x.shadowColor = shadowC; x.shadowBlur = shadow * UI; }
  if (halo) { x.shadowColor = 'rgba(238,241,244,.98)'; x.shadowBlur = halo * UI; x.fillText(s, px, py); x.fillText(s, px, py); x.shadowBlur = 0; }
  x.fillText(s, px, py); if (shadow) x.fillText(s, px, py); x.restore();
}
export const INK = '#101316', RED_D = '#CF1F16', GREEN_D = '#07824A', RED_L = '#FF5A4A', GREEN_L = '#3FE08E', WHITE = '#F4F1EA';

// 顶部压暗，给大字一个干净的底
export function topShade(x, h = 430, a = .8) { const g = x.createLinearGradient(0, 0, 0, h * UI); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.72, `rgba(0,0,0,${a * .86})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, h * UI); }
