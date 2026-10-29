// Shots of the cute Halloween kittens on the porch (9:16). One shared world; each shot places the kittens and a camera.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { Kitty, Porch } from './world';

type V3 = [number, number, number];
let world: { p: Porch; ginger: Kitty; black: Kitty; white: Kitty; calico: Kitty } | null = null;
const shared = () => {
  if (world) return world;
  const p = new Porch();
  world = {
    p, ginger: p.add(new Kitty('ginger', 'pumpkin', 1), 0, 0, 0.15),
    black: p.add(new Kitty('black', 'witch', 2), -0.85, -0.5, 0.4),
    white: p.add(new Kitty('white', 'bat', 3), 0.95, -0.7, -0.35),
    calico: p.add(new Kitty('calico', 'none', 4), -0.2, -1.3, 0.1, 0.85),
  };
  return world;
};

type ShotDef = { cam: (L: number) => [V3, V3]; fov: number; focus?: number; ap?: number; solo?: 'ginger' | 'black' | 'white' | 'calico' };
export const SHOTS: Record<string, ShotDef> = {
  portrait: { solo: 'ginger', fov: 36, cam: (L) => [[0.15, 0.95, 2.6 - L * 0.05], [0, 0.66, 0]], ap: 8 },
  witch: { solo: 'black', fov: 36, cam: (L) => [[-0.3 + L * 0.02, 1.0, 1.9], [-0.85, 0.7, -0.5]], ap: 8 },
  bat: { solo: 'white', fov: 36, cam: (L) => [[1.4 - L * 0.02, 0.95, 1.75], [0.95, 0.66, -0.7]], ap: 8 },
  gang: { fov: 50, cam: (L) => [[0.1 + L * 0.03, 0.75, 3.4 - L * 0.05], [0, 0.6, -0.6]], focus: 3.6, ap: 5 },
};

export class KittyShot extends Plate {
  cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 500);
  def = SHOTS[this.ctx.params.shot ?? 'portrait']!;
  shot(f: FrameInfo): Shot {
    const w = shared(), d = this.def;
    for (const k of ['ginger', 'black', 'white', 'calico'] as const) { w[k].root.visible = !d.solo || d.solo === k || d.fov > 40; w[k].idle(f.t, f.beat); }
    w.p.pail.root.visible = d.solo === 'ginger' || !d.solo;
    w.p.update(f.t);
    const [pos, at] = d.cam(f.local);
    this.cam.position.set(...pos); this.cam.lookAt(...at); this.cam.fov = d.fov; this.cam.updateProjectionMatrix();
    return { scene: w.p.scene, camera: this.cam, post: { bloom: 0.5, vignette: 0.3, grain: 0.02, exposure: 1.15, focus: d.focus ?? this.cam.position.distanceTo(new THREE.Vector3(...at)) - 0.15, aperture: d.ap ?? 4, tint: [1.02, 0.98, 1.06] } };
  }
  override overlay(c: CanvasRenderingContext2D) {
    if (this.ctx.params.label) { c.font = '600 30px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 70); }
  }
}
