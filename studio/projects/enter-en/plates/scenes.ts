// The remaining plates of "Enter!Enter!Enter!" (EN), all on the AI → SI neon motif (no human figures).
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../../src/core/plate';
import type { Line } from '../../../src/core/lyrics';
import { KeyBank, pressAt, glowAt } from '../../../src/kit/keys';
import { makeStage } from '../../../src/kit/stage';
import { NeonBust } from '../../../src/kit/neonbust';
import { slamLine, font, hash } from '../../../src/kit/type';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);
const HOT = /^(enter|ai|si|agent|ceo|intern|key|super|sure)/i;

/** Shared: sung lines of this plate as slam type along the bottom. */
abstract class Base extends Plate {
  lines: Line[] = [];
  override init() { this.lines = this.ctx.lyrics.linesIn(this.ctx.start, this.ctx.end); }
  enters(): number[] { return this.lines.flatMap((l) => l.words).filter((w) => /^enter/i.test(w.w)).map((w) => w.start); }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const cur = this.lines.filter((l) => l.start - 0.05 <= f.t).pop();
    if (cur && f.t < cur.end + 0.6) slamLine(c, cur, f.t, { x: 960, y: 950, size: 96, maxW: 1600, hot: HOT });
  }
}

/** 1 · HERO — intro: a giant ENTER key on a glossy desk; a small AI traces itself above it to "type, type, click". */
export class Hero extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.05, keyLight: [5, 8, 4], shadowSize: 8 });
  keys = new KeyBank(120);
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
  bust = new NeonBust();
  override init() { super.init(); this.keys.addTo(this.stage.scene); this.stage.scene.add(this.bust.root); this.bust.root.scale.setScalar(0.42); }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t, k = this.keys;
    k.begin();
    const beat = Math.floor(audio.beatAt(t));
    for (let r = 0; r < 6; r++) for (let c = -7; c <= 7; c++) {
      const lit = hash(r, c, beat) > 0.82 ? glowAt(t, audio.timeOfBeat(beat), 0.4) : 0;
      k.add({ pos: { x: c * 1.1, y: 0.25, z: -r * 1.1 - 1.4 }, glow: lit * 0.9, legend: hash(r, c) > 0.75 });
    }
    const hits = this.lines.flatMap((l) => l.words).map((w) => w.start).filter((s) => s <= t);
    const last = hits.pop() ?? -9;
    k.add({ pos: { x: 0, y: 0.38, z: 1.2 }, scale: 1.5, press: pressAt(t, last), glow: 0.08 + 0.7 * glowAt(t, last, 0.5) });
    k.end();
    this.bust.set({ draw: ease(prog(t, 1.0, this.ctx.end - 1)), heat: 0, t, frame: Math.round(t * 60), intensity: 2.2 + 1.5 * glowAt(t, last, 0.3) });
    this.bust.root.position.set(0, 1.6 + 0.04 * Math.sin(t * 1.6), 1.0);
    const a = -0.35 + f.local * 0.04;
    this.cam.position.set(Math.sin(a) * 4.8, 2.3, 1.2 + Math.cos(a) * 4.8);
    this.cam.lookAt(0, 1.0, 0.6);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 4.9, aperture: 22, bloom: 0.75, tint: [0.92, 0.98, 1.08], fade: 1 - prog(t, 0, 1.2) } };
  }
}

/** 2/3 · OFFICE / ROLES — an aisle of desks, each with a monitor, an ENTER key and a small blue AI hologram.
 *  params.roles: name plates; the desk whose role is sung flashes and its AI turns orange for a beat. */
export class Office extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'matte', fog: 0.04, keyLight: [4, 12, 6], shadowSize: 24 });
  keys = new KeyBank(40);
  cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 300);
  desks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.1, 1.4), new THREE.MeshPhysicalMaterial({ color: 0x2a2b31, roughness: 0.5, clearcoat: 0.5 }), 32);
  screens = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.3, emissive: new THREE.Color(0x5ac8ff), emissiveIntensity: 0.3 }), 32);
  busts: NeonBust[] = [];
  plates: { mesh: THREE.Mesh; at: number }[] = [];
  N = 6;
  override init() {
    super.init();
    const s = this.stage.scene, roles: string[] = this.ctx.params.roles ?? [];
    this.desks.castShadow = this.desks.receiveShadow = true;
    s.add(this.desks, this.screens); this.keys.addTo(s);
    const m = new THREE.Matrix4();
    let i = 0;
    const words = this.lines.flatMap((l) => l.words);
    for (let row = 0; row < this.N; row++) for (const side of [-1, 1]) {
      const x = side * 2.4, z = -row * 3.2;
      m.makeTranslation(x, 1.0, z); this.desks.setMatrixAt(i, m);
      m.makeRotationY(side * -0.25).setPosition(x, 1.75, z - 0.45); this.screens.setMatrixAt(i, m);
      const b = new NeonBust({ radius: 0.03 }); b.root.scale.setScalar(0.32); b.root.position.set(x + side * -0.15, 1.75, z - 0.2); s.add(b.root); this.busts.push(b);
      const role = roles[i];
      if (role) {
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
        const c = cv.getContext('2d')!; c.fillStyle = '#FF6A1A'; c.fillRect(0, 0, 512, 128); font(c, 72); c.fillStyle = '#07070A'; c.textAlign = 'center'; c.fillText(role.toUpperCase(), 256, 92);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
        pm.position.set(x, 2.55, z - 0.42); pm.rotation.y = side * -0.25; s.add(pm);
        const w = words.find((w) => w.w.toLowerCase().startsWith(role.toLowerCase().slice(0, 4)));
        this.plates.push({ mesh: pm, at: w?.start ?? 1e9 });
      }
      i++;
    }
    this.desks.count = this.screens.count = i;
  }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t, k = this.keys;
    k.begin();
    const beat = Math.floor(audio.beatAt(t));
    this.busts.forEach((b, i) => {
      const row = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      const pl = this.plates[i];
      const h = pl ? pl.at : audio.timeOfBeat(beat - ((row + i) % 4));
      const hot = pl ? (t >= pl.at ? Math.max(glowAt(t, pl.at, 1.2), 0.25) : 0) : 0;
      k.add({ pos: { x: side * 1.8, y: 1.12, z: -row * 3.2 + 0.3 }, scale: 0.42, rot: [0, side * -0.2, 0], press: pressAt(t, h), glow: 0.15 + 0.85 * glowAt(t, h, 0.35) });
      b.set({ draw: ease(prog(t, this.ctx.start + i * 0.12, this.ctx.start + 1.2 + i * 0.12)), heat: hot, halo: hot > 0.5 ? hot : 0, t, frame: Math.round(t * 60) + i, intensity: 2 + 1.5 * glowAt(t, h, 0.3) });
      if (pl) pl.mesh.visible = t >= pl.at - 0.05;
    });
    k.end();
    const roles = !!this.ctx.params.roles;
    if (roles) { this.cam.position.set(-0.4 + f.progress * 0.8, 2.6, 6 - f.progress * 14); this.cam.lookAt(0.2, 1.7, -20); }
    else { this.cam.position.set(0.6 * Math.sin(f.local * 0.3), 2.1, 6 - f.local * 0.7); this.cam.lookAt(0, 1.4, -20); }
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 7.5, aperture: 14, bloom: 0.75, tint: [0.9, 1.0, 1.15] } };
  }
}

/** 5 · WALL — chorus: a wall of ENTER keys, a press wave per sung "enter", a giant SI hovering above it. */
export class Wall extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.04, keyLight: [-6, 9, 10], shadowSize: 20 });
  keys = new KeyBank(700);
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 300);
  si = new NeonBust({ radius: 0.05 });
  override init() { super.init(); this.keys.addTo(this.stage.scene); this.stage.scene.add(this.si.root); this.si.root.scale.setScalar(2.6); this.si.root.position.set(20, 11.2, 4); }
  shot(f: FrameInfo): Shot {
    const t = f.t, k = this.keys, hits = this.enters();
    k.begin();
    for (let r = 0; r < 12; r++) for (let c = 0; c < 44; c++) {
      let p = 0, g = 0;
      for (const [i, h] of hits.entries()) {
        if (t < h - 0.05 || t > h + 3) continue;
        const ox = (i % 3) * 18, d = Math.hypot(c * 1.12 - ox, r * 1.12 - 6) * 0.03;
        p = Math.max(p, pressAt(t, h + d)); g = Math.max(g, glowAt(t, h + d, 0.45));
      }
      k.add({ pos: { x: c * 1.12, y: 0.6 + r * 1.12, z: 0 }, rot: [Math.PI / 2, 0, 0], press: p, glow: g * (0.6 + 0.4 * hash(r, c)) });
    }
    k.end();
    const lastHit = hits.filter((h) => h <= t).pop() ?? -9;
    this.si.set({ draw: 1, heat: 1, halo: 1, t, frame: Math.round(t * 60), glitch: 0.4 * Math.pow(Math.max(0, 1 - (t - lastHit) / 0.15), 2), intensity: 2.2 + 2 * glowAt(t, lastHit, 0.3) });
    this.cam.position.set(-4 + f.local * 0.3, 6.5 + f.progress * 1.5, 13);
    this.cam.lookAt(15, 8.5, 0);
    const flash = Math.pow(clamp(1 - (t - this.ctx.start) / 0.25), 2);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 14, aperture: 14, bloom: 0.85, flash } };
  }
}

/** 6/8 · CITY — drop / last chorus: towers of keycaps, SIs crowning the tallest towers.
 *  params.crowd: last chorus (more SIs, camera climbs, every tower lit on the "enter"s). */
export class City extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.016, keyLight: [-30, 18, -40], shadowSize: 60, envIntensity: 0.25 });
  keys = new KeyBank(4500);
  cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 600);
  towers: { x: number; z: number; h: number }[] = [];
  sis: { b: NeonBust; tw: { x: number; z: number; h: number } }[] = [];
  override init() {
    super.init();
    this.keys.addTo(this.stage.scene);
    this.stage.key.color.set(0xff9a5a); this.stage.key.intensity = 3.2;
    for (let bx = -9; bx <= 9; bx++) for (let bz = -9; bz <= 9; bz++) {
      const d = Math.hypot(bx, bz);
      this.towers.push({ x: bx * 4.4, z: bz * 4.4, h: Math.max(2, Math.round(3 + 16 * Math.exp(-d * d / 34) * (0.45 + hash(bx, bz)))) });
    }
    const tall = [...this.towers].sort((a, b) => b.h - a.h).slice(0, this.ctx.params.crowd ? 9 : 4);
    for (const tw of tall) { const b = new NeonBust({ radius: 0.05 }); b.root.scale.setScalar(3.2); b.root.position.set(tw.x, tw.h * 1.25 + 2.4, tw.z); this.stage.scene.add(b.root); this.sis.push({ b, tw }); }
  }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t, k = this.keys, crowd = !!this.ctx.params.crowd;
    const pulses = crowd ? this.enters() : audio.hits('kick', this.ctx.start, this.ctx.end).map(([h]) => h).filter((_, i) => i % 2 === 0);
    const last = pulses.filter((h) => h <= t).pop() ?? -9;
    k.begin();
    for (const tw of this.towers) for (let y = 0; y < tw.h; y++) {
      const d = Math.hypot(tw.x, tw.z) / 60 + y * 0.03;
      k.add({ pos: { x: tw.x, y: 0.62 + y * 1.25, z: tw.z }, scale: 2.5, rot: [0, hash(tw.x, tw.z) * 0.4, 0], glow: glowAt(t, last + d, 0.5) * 0.85 + 0.05 * hash(tw.x, y, tw.z), legend: y === tw.h - 1 });
    }
    k.end();
    this.sis.forEach(({ b }, i) => b.set({ draw: crowd ? 1 : ease(prog(t, this.ctx.start + i * 0.6, this.ctx.start + 1.5 + i * 0.6)), heat: crowd ? 1 : ease(prog(t, this.ctx.start + 4 + i * 0.5, this.ctx.start + 4.6 + i * 0.5)), halo: crowd ? 1 : prog(t, this.ctx.start + 5, this.ctx.start + 6), t: t + i, frame: Math.round(t * 60) + i, intensity: 2.2 + 1.5 * glowAt(t, last, 0.3) }));
    const a = 0.7 + f.local * 0.06;
    const r = crowd ? 80 - 20 * f.progress : 70;
    this.cam.position.set(Math.cos(a) * r, crowd ? 20 + 30 * ease(f.progress) : 26, Math.sin(a) * r);
    this.cam.lookAt(0, crowd ? 14 + 6 * ease(f.progress) : 14, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: r - 4, aperture: 10, bloom: 0.85, tint: [1.08, 0.95, 0.9] } };
  }
}

/** 7 · BRIDGE — "But wait, who read it through?": dark, one blue AI on a mirror floor, keys orbiting slowly;
 *  on "Don't let your brain become the Enter key" it glitches harder and harder and un-draws on "key". */
export class Bridge extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.06, keyLight: [3, 8, 5], shadowSize: 8, envIntensity: 0.15 });
  keys = new KeyBank(60);
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 200);
  bust = new NeonBust();
  brainAt = 0; keyAt = 0;
  override init() {
    super.init(); this.keys.addTo(this.stage.scene); this.stage.scene.add(this.bust.root);
    this.bust.root.scale.setScalar(0.9); this.stage.key.intensity = 1.2;
    const last = this.lines[this.lines.length - 1]!;
    this.brainAt = last.start; this.keyAt = last.words[last.words.length - 1]!.start;
  }
  shot(f: FrameInfo): Shot {
    const t = f.t, k = this.keys;
    k.begin();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 + t * 0.15 * (i % 2 ? 1 : -1), r = 2.2 + (i % 5) * 0.5;
      k.add({ pos: { x: Math.cos(a) * r, y: 0.6 + (i % 7) * 0.45, z: Math.sin(a) * r - 0.5 }, rot: [t * 0.3 + i, t * 0.2, 0], scale: 0.35, glow: 0.05 + 0.6 * glowAt(t, this.keyAt, 0.6), legend: i % 3 === 0 });
    }
    k.end();
    const g = prog(t, this.brainAt, this.keyAt) * 0.6 + (t > this.keyAt ? 1 : 0) * 0.6;
    const draw = 1 - ease(prog(t, this.keyAt, this.keyAt + 0.9));
    this.bust.set({ draw: Math.min(ease(prog(t, this.ctx.start, this.ctx.start + 3)), draw), heat: 0, glitch: g, t, frame: Math.round(t * 60) });
    this.bust.root.position.set(0, 1.9, -0.5);
    this.cam.position.set(Math.sin(f.local * 0.1) * 1.2, 1.9, 6.4 - f.progress * 1.5);
    this.cam.lookAt(0, 1.8, -0.5);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 6.4 - f.progress * 1.5, aperture: 16, bloom: 0.7, vignette: 0.6, tint: [0.85, 0.95, 1.15] } };
  }
}

/** 9 · OUTRO — "Are you sure? Enter.": one key, one SI; it presses, the SI collapses into a point, black. */
export class Outro extends Base {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.06, keyLight: [4, 8, 4], shadowSize: 6 });
  keys = new KeyBank(2);
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  bust = new NeonBust();
  pressT = 0;
  override init() { super.init(); this.keys.addTo(this.stage.scene); this.stage.scene.add(this.bust.root); this.bust.root.scale.setScalar(0.5); this.pressT = this.enters().pop() ?? this.ctx.end - 3; }
  shot(f: FrameInfo): Shot {
    const t = f.t, k = this.keys, p = this.pressT;
    k.begin(); k.add({ pos: { x: 0, y: 0.38, z: 0.8 }, scale: 1.5, press: pressAt(t, p), glow: 0.1 + 0.9 * glowAt(t, p, 0.8) }); k.end();
    const gone = ease(prog(t, p + 0.1, p + 1.0));
    this.bust.set({ draw: 1 - gone, heat: 1, halo: 1 - gone, t, frame: Math.round(t * 60), glitch: 0.5 * Math.pow(Math.max(0, 1 - Math.abs(t - p) / 0.2), 2) });
    this.bust.root.position.set(0, 1.7, 0.4); this.bust.root.scale.setScalar(0.5 * (1 - 0.8 * gone) + 0.001);
    this.cam.position.set(0.8, 1.8, 5.4 - f.progress * 0.8); this.cam.lookAt(0, 1.1, 0.5);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 5, aperture: 18, bloom: 0.8, fade: prog(t, p + 1.6, this.ctx.end - 0.2) } };
  }
}
