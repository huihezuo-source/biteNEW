import * as THREE from 'three';
import { W, H } from './core.js';
import { makeRoom, makePhone, makeHand, setLamp, setFingerShade, clockRoom, GREEN, RED, PHONE } from './world.js';
import { screenTex, drawScreen } from './screen.js';
import { camSet } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function makeCtx() {
  const room = makeRoom();
  const ph = makePhone(screenTex);
  room.scene.add(ph.a); room.under.add(ph.b);
  const hand = makeHand(); room.scene.add(hand); hand.visible = false;
  const cam = new THREE.PerspectiveCamera(32, W / H, .02, 400);
  const ctx = { room, ph, hand, cam, V };
  // 手机放回桌面原位
  ctx.layPhone = () => { for (const g of [ph.a, ph.b]) { g.position.set(0, PHONE.h / 2, 0); g.rotation.set(0, .14, 0); } };
  ctx.poseCommon = (t, col, pow, dawn = 0) => {
    clockRoom(room, t); room.U.uDawn.value = dawn; room.U.uLift.value = 0;
    const p = ph.a.position, n = V(0, 1, 0).applyEuler(ph.a.rotation);
    setLamp(room, V(p.x, p.y + .05, p.z), n, col, pow);
    ph.scr.color.setRGB(1, 1, 1).multiplyScalar(pow > .01 ? 1.15 + pow * .9 : 0);
  };
  // 手指：指尖落在 tip，从右下方伸进来
  const Y = V(0, 1, 0);
  ctx.finger = (tip, dir = V(.5, .72, .48), bend = .16) => {
    hand.visible = true; hand.position.copy(tip); hand.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
        const top = dir.clone().normalize().multiplyScalar(.9).add(tip); setFingerShade(room, tip, top, 1);
  };
  ctx.noFinger = () => { hand.visible = false; setFingerShade(room, V(0, 0, 0), V(0, 0, 0), 0); };
  // 共用一间屋的镜头各自带物件，切镜时只留自己的
  ctx.extras = []; ctx.only = (...keep) => { for (const o of ctx.extras) o.visible = keep.includes(o); };
  ctx.layPhone();
  return ctx;
}
export { GREEN, RED, drawScreen, camSet };
