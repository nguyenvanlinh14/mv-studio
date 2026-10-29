// Shots of the Halloween night for "Apple Cider and Cold Bones". One shared world; each shot places the ghosts and
// the camera. Works in 16:9 and in true 9:16 (?size=1080x1920): vertical shots widen the vertical field of view.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { drawLyric } from '../../src/kit/lyricstyles';
import { HalloweenNight, POND } from './world';

let world: HalloweenNight | null = null;
export const sharedWorld = () => (world ??= new HalloweenNight());

type V3 = [number, number, number];
const FX = POND.x - 3, FZ = POND.z + 9; // the bonfire
const CLOCK: V3 = [8.57, 2.55, -6.91], CN: V3 = [-0.565, 0, 0.825]; // clock on the cabin wall, wall normal

type ShotDef = { layout: 'path' | 'porch' | 'dance' | 'pond' | 'fire' | 'shadows' | 'rise' | 'hold' | 'alone' | 'deck'; cam: (L: number, p: number) => [V3, V3]; fov: number; dance?: number; focus?: number; ap?: number; ignite?: (L: number) => number; water?: (L: number) => number; clock?: boolean; flash?: (L: number) => number };
export const SHOTS: Record<string, ShotDef> = {
  moon: { layout: 'path', fov: 46, cam: (L) => [[0.4, 0.9, 7.5 - L * 0.4], [0.4 + 14, 0.9 + 15, 7.5 - L * 0.4 - 60]], ap: 2 },
  walk: { layout: 'path', fov: 34, cam: (L, p) => [[2.6 - p, 1.4, 4.5 - L * 0.5], [0, 1.0, -3 - L * 0.5]], focus: 5 },
  pumpkins: { layout: 'path', fov: 32, cam: (L) => [[3.6, 0.5, 6.4 - L * 0.1], [2.4, 0.4, 3.2]], focus: 3.2, ap: 9 },
  porch: { layout: 'porch', fov: 26, cam: (L) => [[8.0 - L * 0.04, 1.45, -3.2], [9.05, 1.1, -5.15]], focus: 2.4, ap: 9 },
  owl: { layout: 'path', fov: 34, cam: (L) => [[-1.2, 1.4, -6 - L * 0.1], [-2.1, 5.2, -13.6]], focus: 8, ap: 5 },
  pond: { layout: 'pond', fov: 38, cam: (L) => [[POND.x + 12 - L * 0.2, 2.4, POND.z + 10], [POND.x + 5, 0.6, POND.z + 4.5]] },
  dance: { layout: 'dance', fov: 38, dance: 1, cam: (L) => [[POND.x - 3 + 6 * Math.sin(L * 0.25), 1.8, POND.z + 16 + 2 * Math.cos(L * 0.25)], [POND.x - 3, 0.8, POND.z + 9]] },
  singmoon: { layout: 'pond', fov: 40, cam: (L) => [[POND.x + 5.4, 0.95, POND.z + 8.4 + L * 0.1], [POND.x + 5.4 + 9, 8, POND.z + 8.4 - 50]], ap: 2 },
  firerise: { layout: 'fire', fov: 40, cam: (L) => [[FX - 0.6, 1.1, FZ + 10 - L * 1.4], [FX, 1.3, FZ]], ignite: (L) => Math.min(1, Math.max(0, (L - 1.9) / 0.7)), flash: (L) => Math.max(0, 1 - Math.abs(L - 2.5) / 0.35) * 0.6, ap: 3 },
  shadows: { layout: 'shadows', fov: 36, cam: (L) => [[-1 - L * 0.1, 1.6, -0.5], [-7, 1.4, -12]], focus: 9, ap: 3 },
  leaves: { layout: 'path', fov: 34, cam: (L) => [[1.2, 0.28, 3.5 - L * 0.3], [0.2, 0.7, -6]], focus: 3, ap: 8 },
  cider2: { layout: 'porch', fov: 22, cam: (L) => [[8.15 + L * 0.03, 1.22, -3.65], [9.34, 1.05, -4.85]], focus: 1.7, ap: 12 },
  forestedge: { layout: 'path', fov: 34, cam: (L) => [[5 - L * 0.3, 1.5, -16], [0, 1, -21]] },
  deck: { layout: 'deck', fov: 32, cam: (L) => [[6.6 + L * 0.05, 0.5, -3.8], [8.6, 0.7, -6.0]], focus: 2.8, ap: 6 },
  embers: { layout: 'fire', fov: 30, cam: (L) => [[FX - 0.7 + L * 0.02, 1.3, FZ + 0.9], [FX - 1.4, 1.2, FZ + 3.0]], focus: 2.2, ap: 10 },
  rise: { layout: 'rise', fov: 46, cam: (L) => [[FX - 6, 1.2, FZ + 10], [FX, 5 + L * 1.6, FZ]] },
  clock: { layout: 'porch', fov: 30, clock: true, cam: (L) => [[CLOCK[0] + CN[0] * (2.4 - L * 0.15), 2.45, CLOCK[2] + CN[2] * (2.4 - L * 0.15)], CLOCK], focus: 2.2, ap: 6 },
  alone: { layout: 'alone', fov: 40, cam: (L) => [[-10 + L * 0.2, 9, 14], [0, 0, -8]] },
  hold: { layout: 'hold', fov: 30, cam: (L) => [[1.3, 1.15, -8.4 - L * 0.1], [1.3, 1.1, -14]], focus: 3.8, ap: 6 },
  water: { layout: 'pond', fov: 36, water: (L) => Math.min(1, L / 1.5), cam: (L) => [[POND.x, 4.6 - L * 0.2, POND.z + 7], [POND.x + 0.5, 0, POND.z + 1.5]] },
  firedance: { layout: 'fire', fov: 40, dance: 1, cam: (L) => [[FX + 7 * Math.sin(L * 0.3), 2.2, FZ + 7 * Math.cos(L * 0.3)], [FX, 1, FZ]] },
  aerial: { layout: 'fire', fov: 44, dance: 1, cam: (L) => [[FX + 0.01, 13 + L * 0.4, FZ + 0.4], [FX, 0, FZ]] },
  final: { layout: 'fire', fov: 42, dance: 1, cam: (_L, p) => [[FX - 4, 1.5 + p * 10, FZ + 10 + p * 4], [FX + p * 30, 1.2 + p * 40, FZ - p * 60]] },
  shades: { layout: 'dance', fov: 26, dance: 1, cam: () => [[POND.x - 2.8, 1.3, POND.z + 6.6], [POND.x - 2.8, 1.15, POND.z + 4]], focus: 2.6, ap: 10 },
};

export class CiderShot extends Plate {
  cam = new THREE.PerspectiveCamera(36, W / H, 0.1, 2000);
  w!: HalloweenNight; def = SHOTS[this.ctx.params.shot ?? 'moon']!;
  override init() { this.w = sharedWorld(); }
  shot(f: FrameInfo): Shot {
    const d = this.def;
    this.w.layout(d.layout, d.layout === 'path' || d.layout === 'rise' || d.layout === 'deck' ? f.local : f.t);
    this.w.ignite = d.ignite ? d.ignite(f.local) : 1; this.w.water = d.water ? d.water(f.local) : 0; this.w.clockT = d.clock ? f.local : -1;
    this.w.update(f.t, f.beat, d.dance ?? 0);
    const [pos, at] = d.cam(f.local, f.progress);
    if (d === SHOTS.shades) { const g = this.w.ghosts[1]!; g.root.position.set(POND.x - 2.8, 0, POND.z + 4); g.root.rotation.y = 0; }
    this.cam.position.set(...pos); this.cam.lookAt(...at);
    this.cam.fov = W >= H ? d.fov : d.fov * 1.55; this.cam.updateProjectionMatrix();
    return { scene: this.w.scene, camera: this.cam, post: { flash: d.flash ? d.flash(f.local) : 0, fade: Math.max(0, (f.t - (this.ctx.audio.duration - 1.2)) / 1.2), bloom: 0.8, vignette: 0.35, grain: 0.025, exposure: 1.15, focus: d.focus ?? this.cam.position.distanceTo(new THREE.Vector3(...at)), aperture: d.ap ?? 4, tint: [0.92, 0.95, 1.12] } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
    if (L) drawLyric(this.ctx.params.lyric ?? 'pumpkin', c, L[2], f, [L[0], L[1]], H - (W >= H ? 120 : 420), L[3]);
    // the end card over the last shot
    if (this.ctx.params.shot === 'final') {
      const a = Math.min(1, Math.max(0, (f.local - 4) / 1)) * Math.min(1, Math.max(0, (this.ctx.audio.duration - 1 - f.t) / 1));
      if (a > 0) { c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.shadowColor = 'rgba(255,140,40,0.8)'; c.shadowBlur = 30; c.font = `700 ${W >= H ? 130 : 120}px "Marker Felt", "Archivo"`; c.fillStyle = '#ffd27a'; c.fillText('Happy Halloween', W / 2, H * 0.36); c.font = '500 40px "Plex Mono"'; c.fillStyle = '#fff1d6'; c.shadowBlur = 10; c.fillText('Linh.NV', W / 2, H * 0.36 + 80); c.restore(); }
    }
    if (this.ctx.params.label) { c.font = '600 26px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 60); }
  }
}
