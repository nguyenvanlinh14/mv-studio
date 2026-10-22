// Shots for "The Banyan Weeps Blood" (9:16). One shared world; each shot sets the story knobs and a camera.
// fov is the vertical field of view of the 1080x1920 frame.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { drawLyric } from '../../src/kit/lyricstyles';
import { BanyanNight, RIVER_X } from './world';

let world: BanyanNight | null = null;
export const sharedWorld = () => (world ??= new BanyanNight());
let pbrDone: Promise<void> | null = null;

type V3 = [number, number, number];
type Knobs = Partial<Record<'wake' | 'bleed' | 'blight' | 'ash' | 'bloodMoon' | 'reach', number>>;
type ShotDef = { cam: (L: number, p: number) => [V3, V3]; fov: number; focus?: number; ap?: number; k?: Knobs };
export const SHOTS: Record<string, ShotDef> = {
  leaves: { fov: 58, cam: (L) => [[3, 1.2, 12.5 - L * 0.1], [-3, 9, -2]], focus: 9, ap: 2 },
  moonwide: { fov: 62, cam: (L) => [[4 - L * 0.05, 1.3, 30 - L * 0.35], [-3.5, 8.5, 0]], ap: 1.5 },
  tree: { fov: 60, cam: (L) => [[3 - L * 0.05, 1.2, 16 - L * 0.3], [0, 6, 0]], ap: 2 },
  roots: { fov: 46, k: { wake: 0.3 }, cam: (L) => [[3.4 - L * 0.05, 0.95, 6.4], [1.3, 0.7, 2.6]], focus: 3.4, ap: 6 },
  hollow: { fov: 34, k: { wake: 1 }, cam: (L) => [[0.5, 1.7, 4.8 - L * 0.2], [0.2, 1.65, 2.0]], focus: 2.6, ap: 7 },
  reach: { fov: 60, k: { reach: 1, wake: 0.6 }, cam: (L) => [[-8.5 + L * 0.1, 1.3, 3.5], [-4.5, 4.2, -1.5]], focus: 6, ap: 3 },
  ghost: { fov: 34, k: { wake: 0.4 }, cam: (L) => [[-0.6, 1.5, 7.0 - L * 0.1], [-1.2, 1.4, 4.2]], focus: 2.8, ap: 8 },
  blood: { fov: 40, k: { bleed: 1, wake: 1 }, cam: (L) => [[0.9, 2.3, 5.0 - L * 0.05], [0.2, 2.1, 1.9]], focus: 3.2, ap: 7 },
  river: { fov: 46, cam: (L) => [[RIVER_X + 5.2, 1.5, 8.2 - L * 0.1], [RIVER_X + 1.8, 0.6, 3.5]], focus: 5.8, ap: 3 },
  ash: { fov: 58, k: { ash: 1, bloodMoon: 1, reach: 1, wake: 1, bleed: 1 }, cam: (L) => [[2.5, 1.0, 9.5 - L * 0.2], [0, 3, 2]], focus: 6, ap: 3 },
  gate: { fov: 52, k: { blight: 1 }, cam: (L) => [[-5.5, 1.7, 20.5 - L * 0.2], [-2, 3, 2]], focus: 5, ap: 2 },
};

export class BanyanShot extends Plate {
  cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
  w!: BanyanNight; def = SHOTS[this.ctx.params.shot ?? 'tree']!;
  override async init() { this.w = sharedWorld(); await Promise.all([this.w.ghost.ready, this.w.moonReady]); if (this.ctx.params.pbr) await (pbrDone ??= this.w.applyPBR()); }
  shot(f: FrameInfo): Shot {
    const d = this.def, k = { ...d.k, ...(this.ctx.params.k as Knobs | undefined) };
    this.w.wake = k.wake ?? 0; this.w.bleed = k.bleed ?? 0; this.w.blight = k.blight ?? 0; this.w.ash = k.ash ?? 0; this.w.bloodMoon = k.bloodMoon ?? 0; this.w.reach = (k.reach ?? 0) * (u => u * u * (3 - 2 * u))(Math.min(1, Math.max(0, (f.local - 0.3) / 2.5))); // reach builds slowly through the shot
    this.w.update(f.t);
    const [pos, at] = d.cam(f.local, f.progress);
    this.cam.position.set(...pos); this.cam.lookAt(...at);
    this.cam.fov = W >= H ? d.fov / 1.55 : d.fov; this.cam.updateProjectionMatrix();
    return { scene: this.w.scene, camera: this.cam, post: { fade: Math.max(0, (f.t - (this.ctx.audio.duration - 1.5)) / 1.5), bloom: 0.9, vignette: 0.4, grain: 0.04, exposure: 1.5, focus: d.focus ?? this.cam.position.distanceTo(new THREE.Vector3(...at)), aperture: d.ap ?? 4, tint: [0.88, 1.0, 1.05] } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
    if (L) drawLyric(this.ctx.params.lyric ?? 'ghost', c, L[2], f, [L[0], L[1]], H - (W >= H ? 120 : 420), L[3]);
    // end card over the last shot
    if (this.ctx.params.endcard) {
      const a = Math.min(1, Math.max(0, (f.local - 1) / 1)) * Math.min(1, Math.max(0, (this.ctx.audio.duration - 0.6 - f.t) / 1));
      if (a > 0) {
        c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.shadowColor = 'rgba(255,30,20,0.9)'; c.shadowBlur = 30;
        c.font = 'italic 700 110px Georgia, serif'; c.fillStyle = '#f2e8e4'; c.fillText('Happy Halloween', W / 2, H * 0.14);
        c.font = '500 40px "Plex Mono"'; c.shadowBlur = 10; c.fillStyle = '#e8ece8'; c.fillText('Linh.NV', W / 2, H * 0.14 + 80); c.restore();
      }
    }
    if (this.ctx.params.label) { c.font = '600 30px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 70); }
  }
}
