// "The dream job": a big-tech campus of glass towers under a clear morning sky — a ring headquarters, a twisted
// tower, a spire, sky bridges and a tree-lined plaza. Generic architecture only: no real logos or signage.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** curtain-wall texture: glass panes with thin mullions and the odd lit / blinded pane */
export function facade(seed: number, tint: string) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, r = mulberry(seed);
  x.fillStyle = tint; x.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const v = r(); x.fillStyle = v > 0.95 ? 'rgba(255,240,210,0.18)' : v > 0.82 ? 'rgba(255,255,255,0.05)' : v < 0.08 ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0)';
    x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
  }
  x.fillStyle = 'rgba(225,232,240,0.45)';
  for (let k = 0; k <= 8; k++) { x.fillRect(k * 32, 0, 1, 256); x.fillRect(0, k * 32 - 1, 256, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

export class City {
  scene = new THREE.Scene();
  sunDir = new THREE.Vector3(0.55, 0.5, 0.67).normalize();
  constructor(renderer: THREE.WebGLRenderer) {
    const s = this.scene, r = mulberry(17);
    // sky + image light from the same sky
    const sky = new Sky(); sky.scale.setScalar(3000);
    const u = sky.material.uniforms;
    u.turbidity!.value = 2.4; u.rayleigh!.value = 1.3; u.mieCoefficient!.value = 0.004; u.mieDirectionalG!.value = 0.8; u.sunPosition!.value.copy(this.sunDir);
    const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(50); sky2.material.uniforms = u; envScene.add(sky2);
    s.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 0.1, 200).texture; s.environmentIntensity = 0.3;
    s.add(sky);
    s.fog = new THREE.FogExp2(new THREE.Color(0.7, 0.8, 0.92), 0.0008);
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.position.copy(this.sunDir).multiplyScalar(400); sun.target.position.set(0, 0, -150);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1000 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sun.shadow.radius = 3;
    s.add(sun, sun.target, new THREE.HemisphereLight(0xcfe4ff, 0x8a8478, 0.4));

    // ground: plaza stone, lawns, an avenue
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0xcfc9bd, roughness: 0.85 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const lawn = new THREE.MeshStandardMaterial({ color: 0x6aa84a, roughness: 1 });
    for (const [x, z, w, d] of [[-28, -40, 26, 70], [28, -40, 26, 70], [0, -150, 120, 40]] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), lawn); m.position.set(x, 0.15, z); m.receiveShadow = true; s.add(m);
    }
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), new THREE.MeshStandardMaterial({ color: 0x8f8a84, roughness: 0.6 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -200); road.receiveShadow = true; s.add(road);

    // glass materials (a few tints)
    const glass = ['#2c4c6e', '#3a5d7a', '#26445f', '#4a6a86', '#33506a'].map((tint, i) => {
      const map = facade(i + 3, tint);
      return new THREE.MeshPhysicalMaterial({ map, color: 0xffffff, metalness: 0.55, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    });
    const tower = (x: number, z: number, w: number, d: number, h: number, k: number, rot = 0) => {
      const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, d) * 0.08);
      const m = glass[k % glass.length]!.clone(); m.map = m.map!.clone(); m.map.repeat.set(Math.max(1, w / 14), Math.max(1, h / 14)); m.map.needsUpdate = true;
      const me = new THREE.Mesh(g, m); me.position.set(x, h / 2, z); me.rotation.y = rot; me.castShadow = me.receiveShadow = true; s.add(me);
      // setback crown
      if (h > 90) { const c = new THREE.Mesh(new RoundedBoxGeometry(w * 0.7, h * 0.08, d * 0.7, 2, 1), m); c.position.set(x, h + h * 0.04, z); c.rotation.y = rot; c.castShadow = true; s.add(c); }
      return me;
    };
    // rows along the avenue, getting taller with distance
    for (let i = 0; i < 14; i++) for (const side of [-1, 1]) {
      const z = -70 - i * 34 + r() * 8, x = side * (40 + r() * 30 + (i % 3) * 10);
      const h = 40 + i * 9 + r() * 70, w = 18 + r() * 16, d = 18 + r() * 14;
      tower(x, z, w, d, h, i + (side > 0 ? 1 : 0), (r() - 0.5) * 0.3);
      if (r() > 0.55) tower(x + side * (w + 14), z - 10, w * 0.8, d, h * 0.7, i + 2);
    }
    // hero: twisted tower
    const tw = new THREE.BoxGeometry(30, 260, 30, 1, 80, 1), P = tw.attributes.position!;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) + 130, a = (y / 260) * 1.2, X = P.getX(i), Z = P.getZ(i), sc = 1 - (y / 260) * 0.25; P.setXYZ(i, (X * Math.cos(a) - Z * Math.sin(a)) * sc, y, (X * Math.sin(a) + Z * Math.cos(a)) * sc); }
    tw.computeVertexNormals();
    const twm = glass[1]!.clone(); twm.map = twm.map!.clone(); twm.map.repeat.set(3, 26);
    const twist = new THREE.Mesh(tw, twm); twist.position.set(-60, 0, -330); twist.castShadow = twist.receiveShadow = true; s.add(twist);
    // hero: spire
    const spire = tower(70, -380, 34, 34, 300, 0);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.6, 70, 12), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.2 }));
    needle.position.set(spire.position.x, 300 + 24 + 35, spire.position.z); s.add(needle);
    // hero: ring headquarters across the end of the avenue
    const ringProfile = [new THREE.Vector2(70, 0), new THREE.Vector2(92, 0), new THREE.Vector2(92, 22), new THREE.Vector2(70, 22), new THREE.Vector2(70, 0)];
    const ringM = glass[3]!.clone(); ringM.map = ringM.map!.clone(); ringM.map.repeat.set(40, 2);
    const ring = new THREE.Mesh(new THREE.LatheGeometry(ringProfile, 160), ringM); ring.position.set(0, 0, -260); ring.castShadow = ring.receiveShadow = true; s.add(ring);
    const roof = new THREE.Mesh(new THREE.RingGeometry(70, 92, 160), new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5, side: THREE.DoubleSide })); roof.rotation.x = -Math.PI / 2; roof.position.set(0, 22.05, -260); s.add(roof);
    // sky bridges between the first towers
    for (const z of [-104, -172]) { const b = new THREE.Mesh(new THREE.BoxGeometry(70, 4, 6), glass[2]!); b.position.set(0, 46 + (z === -172 ? 20 : 0), z); b.castShadow = true; s.add(b); }
    // plaza trees in rows
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3e2a, roughness: 0.9 }), leaf = [0x4e9a3c, 0x67b048].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
      const g = new THREE.Group(), x = side * 11, z = 20 - i * 14;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3.4, 8), trunk); tr.position.y = 1.7; tr.castShadow = true; g.add(tr);
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + r() * 0.6, 3), leaf[k % 2]!); b.position.set((r() - 0.5) * 1.8, 3.8 + r() * 1.4, (r() - 0.5) * 1.8); b.castShadow = true; g.add(b); }
      g.position.set(x, 0, z); s.add(g);
    }
    // light posts + benches along the plaza
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), metal); p.position.set(side * 7.5, 2.5, 13 - i * 14); p.castShadow = true; s.add(p);
    }
  }
}
