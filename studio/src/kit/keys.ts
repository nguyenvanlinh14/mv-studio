// Instanced PBR keycaps: clear-coated plastic bodies that cast/receive shadows, a glowing top (per-instance), and
// an ENTER ⏎ legend that lights up when pressed. One draw call for the bodies, one for the legends.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

let legendTex: THREE.CanvasTexture | null = null;
export function enterLegend(): THREE.CanvasTexture {
  if (legendTex) return legendTex;
  const N = 1024, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff';
  c.font = `900 ${N * 0.2}px "Archivo"`;
  (c as any).fontStretch = 'expanded';
  c.fillText('ENTER', N * 0.13, N * 0.36);
  c.strokeStyle = '#fff'; c.lineWidth = N * 0.045; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(N * 0.8, N * 0.5); c.lineTo(N * 0.8, N * 0.7); c.lineTo(N * 0.28, N * 0.7); c.stroke();
  c.beginPath(); c.moveTo(N * 0.4, N * 0.58); c.lineTo(N * 0.27, N * 0.7); c.lineTo(N * 0.4, N * 0.82); c.stroke();
  legendTex = new THREE.CanvasTexture(cv);
  legendTex.colorSpace = THREE.SRGBColorSpace;
  legendTex.anisotropy = 16;
  return legendTex;
}

export interface KeyOpts { pos: THREE.Vector3Like; rot?: [number, number, number]; scale?: number; press?: number; glow?: number; legend?: boolean; color?: THREE.ColorRepresentation }

const SIZE = { w: 1, h: 0.5, d: 1 };

export class KeyBank {
  body: THREE.InstancedMesh;
  legend: THREE.InstancedMesh;
  private glow: THREE.InstancedBufferAttribute;
  private n = 0;
  private cap: number;
  private nl = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private top = new THREE.Matrix4().compose(new THREE.Vector3(0, SIZE.h / 2 + 0.003, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(0.86, 0.86, 1));
  private col = new THREE.Color();

  constructor(capacity: number, o: { glowColor?: THREE.ColorRepresentation; env?: THREE.Texture } = {}) {
    this.cap = capacity;
    const geo = new RoundedBoxGeometry(SIZE.w, SIZE.h, SIZE.d, 5, 0.16);
    this.glow = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.glow.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iGlow', this.glow);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMap: o.env ?? null, envMapIntensity: 0.9 });
    const gc = new THREE.Color(o.glowColor ?? 0xff6a1a);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.glowColor = { value: new THREE.Vector3(gc.r, gc.g, gc.b) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float iGlow; varying float vGlow; varying float vTop;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = iGlow; vTop = smoothstep(0.55, 0.95, normal.y);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 glowColor; varying float vGlow; varying float vTop;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glowColor * vGlow * (0.06 + 1.1 * vTop);');
    };
    this.body = new THREE.InstancedMesh(geo, mat, capacity);
    this.body.castShadow = true; this.body.receiveShadow = true;
    this.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.body.frustumCulled = false;
    this.legend = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: enterLegend(), transparent: true, depthWrite: false, toneMapped: false }), capacity);
    this.legend.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.legend.frustumCulled = false;
  }

  addTo(scene: THREE.Object3D) { scene.add(this.body, this.legend); return this; }
  begin() { this.n = 0; this.nl = 0; }

  add(k: KeyOpts) {
    if (this.n >= this.cap) return;
    const s = k.scale ?? 1, press = k.press ?? 0, glow = k.glow ?? 0;
    this.e.set(...(k.rot ?? [0, 0, 0]), 'YXZ'); this.q.setFromEuler(this.e);
    // pressing moves the cap down along its own up axis
    this.v.set(0, -press * SIZE.h * 0.42 * s, 0).applyQuaternion(this.q).add(k.pos as THREE.Vector3);
    this.s.setScalar(s);
    this.m.compose(this.v, this.q, this.s);
    const i = this.n++;
    this.body.setMatrixAt(i, this.m);
    this.body.setColorAt(i, this.col.set(k.color ?? 0x2a2c33));
    this.glow.setX(i, glow);
    if (k.legend !== false) {
      const j = this.nl++;
      this.legend.setMatrixAt(j, this.m.clone().multiply(this.top));
      // dim grey ink when idle, white-hot orange (HDR > 1 → bloom) when lit
      const g = Math.min(1, glow);
      this.legend.setColorAt(j, this.col.setRGB(0.12 + (5.0 - 0.12) * g, 0.12 + (1.9 - 0.12) * g, 0.12 + (0.5 - 0.12) * g, THREE.LinearSRGBColorSpace));
    }
  }

  end() {
    this.body.count = this.n; this.legend.count = this.nl;
    this.body.instanceMatrix.needsUpdate = true; this.legend.instanceMatrix.needsUpdate = true;
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
    if (this.legend.instanceColor) this.legend.instanceColor.needsUpdate = true;
    this.glow.needsUpdate = true;
  }
}

/** Press envelope for a hit at h: fast down, springy release. */
export const pressAt = (t: number, h: number) => { const d = t - h; return d < -0.03 ? 0 : d < 0 ? 1 + d / 0.03 : Math.exp(-d / 0.16) * (1 + 0.12 * Math.sin(d * 38) * Math.exp(-d / 0.08)); };
/** Glow envelope for a hit at h. */
export const glowAt = (t: number, h: number, tail = 0.5) => { const d = t - h; return d < -0.02 ? 0 : d < 0 ? 1 + d / 0.02 : Math.exp(-d / tail); };
