// Gravity-well grid: a neon line grid that sags into a funnel under a glowing object, and rings out on every kick.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';

const N = 90, SIZE = 14;
/** depth of the sheet at (x, z): a Gaussian well plus a ripple travelling out from the centre */
const sag = (x: number, z: number, depth: number, ring: number) => {
  const r = Math.hypot(x, z);
  return -depth * Math.exp(-(r * r) / 2.2) - depth * 0.5 / (1 + r * r * 0.6) + 0.18 * ring * Math.sin(r * 3.2 - ring * 0) * Math.exp(-r * 0.25);
};

export class GridWell extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 100);
  pos = new Float32Array(N * N * 3);
  geo = new THREE.BufferGeometry();
  orb = new THREE.Group();
  override init() {
    const s = this.scene; s.background = new THREE.Color(0x05020a); s.fog = new THREE.FogExp2(0x05020a, 0.07);
    const idx: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; this.pos[k * 3] = (i / (N - 1) - 0.5) * SIZE; this.pos[k * 3 + 2] = (j / (N - 1) - 0.5) * SIZE;
      if (i < N - 1) idx.push(k, k + 1); if (j < N - 1) idx.push(k, k + N);
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setIndex(idx);
    s.add(new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.35, 2.4) })));
    // the heavy thing in the well: a glowing jack-o'-lantern-ish orb
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 64, 40), new THREE.MeshStandardMaterial({ color: 0xff6a10, emissive: new THREE.Color(1.6, 0.5, 0.05), roughness: 0.35 }));
    body.scale.y = 0.82; this.orb.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x3a5a1a })); stem.position.y = 0.7; this.orb.add(stem);
    const glow = new THREE.PointLight(0xff8a2a, 30, 8); this.orb.add(glow);
    s.add(this.orb, new THREE.AmbientLight(0x6040a0, 0.6));
  }
  shot(f: FrameInfo): Shot {
    const ring = Math.pow(1 - (f.beat - Math.floor(f.beat)), 3), depth = 2.2 + 0.35 * ring;
    for (let k = 0; k < N * N; k++) this.pos[k * 3 + 1] = sag(this.pos[k * 3]!, this.pos[k * 3 + 2]!, depth, ring);
    this.geo.attributes.position!.needsUpdate = true;
    this.orb.position.y = sag(0, 0, depth, ring) + 0.62; this.orb.rotation.y = f.t * 0.3;
    const a = f.t * 0.12;
    this.cam.position.set(Math.sin(a) * 6.5, 3.6, Math.cos(a) * 6.5); this.cam.lookAt(0, -1.6, 0);
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.9, bloomThreshold: 0.6, vignette: 0.4, grain: 0.02, exposure: 1.0, aperture: 0 } };
  }
}
