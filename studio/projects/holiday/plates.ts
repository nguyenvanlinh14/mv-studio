// Shots of the graveyard hoedown for "Holiday the Dead Seek" (9:16). One shared world; each shot picks a layout and
// a camera. fov is the vertical field of view of the 1080x1920 frame. Timeline params: dawn = number | 'ramp'.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { drawLyric } from '../../src/kit/lyricstyles';
import { Boneyard, GRAVE, STAGE, type Skeleton } from './world';

let world: Boneyard | null = null;
export const sharedWorld = () => (world ??= new Boneyard());

type V3 = [number, number, number];
type Layout = 'band' | 'rise' | 'silas' | 'dance' | 'wedding' | 'dawn' | 'empty' | 'reach';
type ShotDef = {
  layout: Layout; cam: (L: number, p: number) => [V3, V3]; fov: number; focus?: number; ap?: number; dawn?: (L: number) => number; local?: boolean;
  /** look at a skeleton's head (the camera stays where cam puts it) */
  track?: (w: Boneyard) => Skeleton; noCrowd?: boolean;
};
const SY = STAGE.y, SZ = STAGE.z, sat = (x: number) => Math.max(0, Math.min(1, x));
const MOON: V3 = [0.28 * 60, 0.34 * 60, -60];
export const SHOTS: Record<string, ShotDef> = {
  rise: { layout: 'rise', local: true, fov: 52, cam: (L) => [[GRAVE.x + 0.1, 0.32, GRAVE.z + 2.2 - L * 0.08], [GRAVE.x, 0.7, GRAVE.z - 0.2]], focus: 2.3, ap: 6 },
  silas: { layout: 'silas', fov: 34, cam: (L) => [[GRAVE.x - 0.25 + L * 0.03, 1.55, GRAVE.z + 2.2 - L * 0.05], [GRAVE.x, 1.48, GRAVE.z + 0.2]], focus: 2.0, ap: 10 },
  band: { layout: 'band', fov: 62, cam: (L) => [[0.2, 1.7, 6.5 - L * 0.15], [0, 1.9, -9]], focus: 13, ap: 2 },
  banjo: { layout: 'band', fov: 40, cam: (L) => [[-1.3 + L * 0.02, SY + 1.45, SZ + 2.7], [-2.3, SY + 1.15, -8.2]], focus: 2.7, ap: 9 },
  fiddle: { layout: 'band', fov: 40, cam: (L) => [[1.4 - L * 0.02, SY + 1.5, SZ + 2.7], [2.3, SY + 1.2, -8.3]], focus: 2.7, ap: 9 },
  drums: { layout: 'band', fov: 40, cam: (L) => [[-0.3, SY + 1.1, SZ + 1.3 - L * 0.03], [-1.0, SY + 0.75, -9.4]], focus: 2.2, ap: 7 },
  stomp: { layout: 'dance', fov: 56, cam: (L) => [[1.2 - L * 0.1, 0.45, 3.6], [0, 1.3, -4]], focus: 5.5, ap: 4 },
  wedding: { layout: 'wedding', fov: 42, cam: (L) => [[0.9 + 0.8 * Math.sin(L * 0.3), 1.35, 1.9], [-0.4, 1.15, -1.2]], focus: 2.7, ap: 6 },
  dawn: { layout: 'dawn', local: true, fov: 50, dawn: () => 1, cam: (L) => [[GRAVE.x - 2.2 + L * 0.05, 1.3, GRAVE.z + 3.4], [GRAVE.x, 0.7, GRAVE.z]], focus: 3.8, ap: 3 },
  // the rest of the song
  graves: { layout: 'empty', fov: 50, cam: (L) => [[-0.5 + L * 0.04, 0.55 + L * 0.05, 5 - L * 0.45], [0, 1.1, -9]], focus: 5, ap: 3 },
  cedar: { layout: 'empty', fov: 46, cam: (L) => [[-2.6 - L * 0.05, 1.5 + L * 0.08, -6.3], [-4.8, 4.35, -8.2]], focus: 3.9, ap: 5 },
  moon: { layout: 'empty', fov: 50, cam: (L) => [[1.6, 0.9 + L * 0.06, 2.5 - L * 0.2], MOON], ap: 2 },
  crowd: { layout: 'dance', fov: 48, cam: (L) => [[0.4 + 2.8 * Math.sin(0.5 + L * 0.28), 1.25, -3.6 + 2.8 * Math.cos(0.5 + L * 0.28)], [0.2, 1.05, -4.3]], focus: 2.8, ap: 5 },
  aerial: { layout: 'dance', fov: 62, cam: (L) => [[0.4 + L * 0.1, 9 + L * 0.35, -0.8], [0, 0, -3.2]], ap: 2 },
  sing: { layout: 'band', fov: 36, cam: (L) => [[-0.35, SY + 1.6, -6.5 - L * 0.04], [0.55, SY + 1.5, -7.95]], focus: 1.75, ap: 9 },
  preacher: { layout: 'wedding', fov: 38, noCrowd: true, cam: (L) => [[-0.5 + L * 0.02, 1.65, -0.6], [-1.9, 1.5, -2.3]], focus: 2.3, ap: 9 },
  bride: { layout: 'wedding', fov: 34, cam: () => [[0.4, 1.5, 1.0], [0, 0, -1]], track: (w) => w.bride, focus: 1.6, ap: 9 },
  groom: { layout: 'wedding', fov: 34, cam: () => [[-0.6, 1.45, 1.0], [0, 0, -1]], track: (w) => w.groom, focus: 1.6, ap: 9 },
  reach: { layout: 'reach', fov: 62, cam: (L) => [[0.6, 0.35, 0.5 - L * 0.05], [0, 2.4, -5]], focus: 5, ap: 3 },
  final: { layout: 'empty', fov: 56, cam: (_L, p) => [[0, 1.5 + p * 9, 4.5 + p * 5], [0, 1.2 + p * 3, -9 - p * 10]], ap: 1.5 },
};

export class HolidayShot extends Plate {
  cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
  w!: Boneyard; def = SHOTS[this.ctx.params.shot ?? 'band']!;
  private hp = new THREE.Vector3();
  override init() { this.w = sharedWorld(); }
  shot(f: FrameInfo): Shot {
    const d = this.def, vocal = this.ctx.audio.env('vocal', f.t), dp = this.ctx.params.dawn;
    this.w.dawn = dp === 'ramp' ? sat(f.local / 4) : typeof dp === 'number' ? dp : d.dawn ? d.dawn(f.local) : 0;
    this.w.layout(d.layout, d.local ? f.local : f.t, f.beat, vocal);
    if (d.noCrowd) this.w.crowd.forEach((k) => (k.root.visible = false));
    this.w.update(f.t);
    const [pos] = d.cam(f.local, f.progress); let [, at] = d.cam(f.local, f.progress);
    if (d.track) {
      const k = d.track(this.w); k.root.updateMatrixWorld(true); k.head.getWorldPosition(this.hp);
      at = [this.hp.x, this.hp.y - 0.15, this.hp.z];
    }
    this.cam.position.set(...pos); this.cam.lookAt(...at);
    this.cam.fov = W >= H ? d.fov / 1.55 : d.fov; this.cam.updateProjectionMatrix();
    return { scene: this.w.scene, camera: this.cam, post: { fade: Math.max(0, (f.t - (this.ctx.audio.duration - 1.2)) / 1.2), bloom: 0.85, vignette: 0.4, grain: 0.03, exposure: 1.2, focus: d.focus ?? this.cam.position.distanceTo(new THREE.Vector3(...at)), aperture: d.ap ?? 4, tint: [0.9, 1.0, 1.1] } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
    if (L) drawLyric(this.ctx.params.lyric ?? 'pumpkin', c, L[2], f, [L[0], L[1]], H - (W >= H ? 120 : 420), L[3]);
    // the end card over the last shot
    if (this.ctx.params.shot === 'final') {
      const a = sat((f.local - 2) / 1) * sat((this.ctx.audio.duration - 0.8 - f.t) / 1);
      if (a > 0) {
        c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.shadowColor = 'rgba(255,140,40,0.8)'; c.shadowBlur = 30;
        c.font = '700 120px "Marker Felt", "Archivo"'; c.fillStyle = '#ffd27a'; c.fillText('Happy Halloween', W / 2, H * 0.34);
        c.font = '500 40px "Plex Mono"'; c.fillStyle = '#fff1d6'; c.shadowBlur = 10; c.fillText('Linh.NV', W / 2, H * 0.34 + 80); c.restore();
      }
    }
    if (this.ctx.params.label) { c.font = '600 30px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 70); }
  }
}
