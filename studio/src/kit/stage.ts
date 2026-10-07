// A lit stage for the 3D plates: image-based light, a warm key light with soft shadows, a cool rim light,
// exponential fog to black, and an optional glossy floor with true mirror reflections.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export interface StageOpts {
  env: THREE.Texture;
  fog?: number; // fog density
  floor?: 'mirror' | 'matte' | 'none';
  floorY?: number;
  keyLight?: [number, number, number]; // position
  shadowSize?: number;
  envIntensity?: number;
}

export function makeStage(o: StageOpts) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.environment = o.env;
  scene.environmentIntensity = o.envIntensity ?? 0.35;
  scene.fog = new THREE.FogExp2(0x050507, o.fog ?? 0.035);

  const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
  key.position.set(...(o.keyLight ?? [6, 10, 6]));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const S = o.shadowSize ?? 14;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.5, far: 80 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0x5ac8ff, 1.6);
  rim.position.set(-8, 4, -10);
  scene.add(rim);

  const y = o.floorY ?? 0;
  if (o.floor === 'mirror') {
    const mirror = new Reflector(new THREE.PlaneGeometry(400, 400), { textureWidth: 960, textureHeight: 540, color: new THREE.Color(0x3a3a40), clipBias: 0.003 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = y - 0.002;
    scene.add(mirror);
    // a glossy, slightly rough sheet over the mirror: reflections read as polished desk, not glass
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0e, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.72, clearcoat: 1, clearcoatRoughness: 0.08 }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.y = y; sheet.receiveShadow = true;
    scene.add(sheet);
  } else if (o.floor !== 'none') {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = y; floor.receiveShadow = true;
    scene.add(floor);
  }
  return { scene, key, rim };
}
