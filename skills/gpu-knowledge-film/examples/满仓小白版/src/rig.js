import * as THREE from 'three';
import { W, H } from './core.js';
import { Balls, makePegs, makePlate, makeFloor, makeSky, makeLamps, makeRod, U, tilt } from './machine.js';
import { makeMelt } from './melt.js';
import { N } from './sim.js';
import { makeSilo } from './silo.js';
// 整台机器：所有镜头共用一个场景
export function makeRig() {
  const scene = new THREE.Scene();
  const plate = makePlate(), lo = makePegs(100, 10), hi = makePegs(100, 40), balls = new Balls(N + 64), sky = makeSky(), lamps = makeLamps(), rod = makeRod();
  const pegs = { mesh: lo.mesh, shadow: lo.shadow, setF(f) { lo.setF(f); hi.setF(f); } };
  scene.add(sky, plate, lo.shadow, hi.shadow, balls.shadow, balls.mirror, lo.mesh, hi.mesh, balls.mesh, lamps.g, rod.g); sky.renderOrder = -10;
  const cam = new THREE.PerspectiveCamera(30, W / H, .02, 4000);
  const silo = makeSilo(), floor = makeFloor(), melt = makeMelt(); scene.add(silo, floor, melt.mesh);
  const extras = [silo, floor, melt.mesh];
  const ctx = { scene, plate, pegs, balls, cam, U, extras, silo, floor, melt, sky, lamps, rod,
    setRoom(key, room, strip) { U.uKey.value = key; U.uRoom.value = room; U.uStrip.value = strip; },
    show(o) { tilt.v = o.tilt || 0; plate.material.uniforms.uSpot.value = o.spot || 0; plate.material.uniforms.uSpotX.value = o.spotX || 0; lamps.g.visible = !!o.lamps; rod.g.visible = !!o.rod; rod.rail.visible = !!o.rail; rod.ticks.forEach(t => t.visible = !!o.rail); U.uFill.value = o.fill || 0; U.uFloorMirror.value = o.mirror ? 1 : 0; plate.visible = !!o.plate; lo.mesh.visible = lo.shadow.visible = !!o.pegs && !o.hi; hi.mesh.visible = hi.shadow.visible = !!o.pegs && !!o.hi; balls.mesh.visible = !!o.balls; balls.shadow.visible = !!o.balls && o.ballShadow !== 0; balls.mirror.visible = !!o.mirror; for (const e of extras) e.visible = !!(o.only && o.only.includes(e)); },
  };
  return ctx;
}
