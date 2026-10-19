// Animated cow from the Quaternius "Farm Animals" pack (CC0, public/models/cow). One FBX load shared by every cow;
// each instance is a skeleton clone posed as a pure function of time (mixer.setTime), with fur-like sheen materials.
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface CowAsset { scene: THREE.Group; clips: THREE.AnimationClip[]; height: number }
let asset: Promise<CowAsset> | null = null;

export function loadCow(): Promise<CowAsset> {
  return (asset ??= new FBXLoader().loadAsync('/models/cow/Cow.fbx').then((g) => {
    // the pack is faceted low-poly: weld vertices and smooth the normals for a soft, sculpted look
    g.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      const geo = m.geometry.clone(); geo.deleteAttribute('normal'); if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
      const w = mergeVertices(geo, 1e-4); w.computeVertexNormals(); m.geometry = w;
    });
    const box = new THREE.Box3().setFromObject(g);
    return { scene: g, clips: g.animations, height: box.max.y - box.min.y };
  }));
}

export type CowCoat = 'holstein' | 'yellow' | 'brown';
const COATS: Record<CowCoat, number[]> = { holstein: [0xf4f1ea, 0x26211d], yellow: [0xb47634, 0x93602c], brown: [0x84502c, 0x4e2e18] };

export class CowModel {
  root = new THREE.Group();
  mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = '';
  neck: THREE.Bone | null = null;
  head: THREE.Bone | null = null;
  constructor(a: CowAsset, coat: CowCoat = 'holstein', size = 1.55) {
    const body = SkeletonUtils.clone(a.scene) as THREE.Group;
    body.scale.multiplyScalar(size / a.height);
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      const src = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhongMaterial[];
      const mats = src.map((s) => {
        const c = s.color ? s.color.clone() : new THREE.Color(1, 1, 1);
        const l = c.r + c.g + c.b;
        // recolour the coat: light parts take the coat colour, dark parts the coat's dark; keep pink/horn tones
        const pink = c.r > c.g * 1.25 && c.r > 0.5;
        if (pink) c.setHex(0xe9a3a0); else c.setHex(l > 1.2 || (coat !== 'holstein' && l > 0.35) ? COATS[coat][0]! : l > 0.35 ? COATS[coat][1]! : coat === 'holstein' ? 0x1c1814 : COATS[coat][1]!);
        return new THREE.MeshPhysicalMaterial({ color: c, roughness: pink ? 0.45 : 0.85, sheen: pink ? 0 : 0.3, sheenRoughness: 0.45, sheenColor: new THREE.Color(1, 0.95, 0.85), skinning: true } as any);
      });
      m.material = Array.isArray(m.material) ? mats : mats[0]!;
    });
    body.traverse((o) => { if ((o as THREE.Bone).isBone) { if (o.name.endsWith('Neck')) this.neck = o as THREE.Bone; if (o.name.endsWith('Head')) this.head = o as THREE.Bone; } });
    this.root.add(body);
    this.mixer = new THREE.AnimationMixer(body);
    for (const c of a.clips) this.actions.set(c.name.toLowerCase(), this.mixer.clipAction(c));
  }
  get clipNames() { return [...this.actions.keys()]; }
  /** pose: the clip whose name contains `name`, at time t (seconds) scaled by speed */
  pose(name: string, t: number, speed = 1) {
    const key = [...this.actions.keys()].find((k) => k.includes(name.toLowerCase())) ?? [...this.actions.keys()][0]!;
    if (key !== this.current) { this.mixer.stopAllAction(); this.actions.get(key)!.play(); this.current = key; }
    this.mixer.setTime(Math.max(0, t * speed));
  }
  /** add a bend on top of the clip: neck and head rotated about a local axis (radians) */
  bend(axis: 'x' | 'y' | 'z', neck: number, head = 0) {
    if (this.neck) this.neck.rotation[axis] += neck;
    if (this.head) this.head.rotation[axis] += head;
  }
}
