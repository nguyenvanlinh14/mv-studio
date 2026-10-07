// Look-dev plates for "The Whole Company Hits Enter" (EN): four depth studies to approve the 3D look before the build.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { KeyBank, pressAt, glowAt } from '../../src/kit/keys';
import { makeStage } from '../../src/kit/stage';
import { Stickman, typing, stomp } from '../../src/kit/stickman';

const hash = (...xs: number[]) => { let h = 2166136261; for (const x of xs) { h ^= Math.floor(x * 1000) | 0; h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

function label(c: CanvasRenderingContext2D, title: string, sub: string) {
  c.font = '600 22px "Plex Mono"'; c.fillStyle = '#F2EEE6'; c.fillText(title, 96, 92);
  c.font = '500 16px "Plex Mono"'; c.fillStyle = '#8d8a84'; c.fillText(sub, 96, 120);
}

/** 1 · HERO — a macro ENTER key on a keyboard, focus on the hero, glowing keys behind turn to bokeh. */
export class Hero extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.05, keyLight: [5, 8, 4], shadowSize: 8 });
  keys = new KeyBank(120);
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
  man = new Stickman({ thickness: 0.06 });
  override init() { this.keys.addTo(this.stage.scene); this.man.root.scale.setScalar(0.42); this.stage.scene.add(this.man.root); }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t;
    const k = this.keys; k.begin();
    for (let r = 0; r < 6; r++) for (let c = -7; c <= 7; c++) {
      const x = c * 1.1, z = -r * 1.1 - 1.4;
      const h = audio.timeOfBeat(Math.floor(hash(r, c) * 16));
      const beat = Math.floor(audio.beatAt(t));
      const lit = hash(r, c, beat) > 0.8 ? glowAt(t, audio.timeOfBeat(beat), 0.4) : 0;
      k.add({ pos: { x, y: 0.25, z }, press: pressAt(t, h) * 0.3, glow: lit * 0.9, legend: hash(r, c) > 0.75 });
    }
        const hits = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => audio.timeOfBeat(i * 2));
    const last = hits.filter((h) => h <= t).pop() ?? -9;
    const pr = pressAt(t, last);
    k.add({ pos: { x: 0, y: 0.38, z: 1.2 }, scale: 1.5, press: pr, glow: 0.08 + 0.7 * glowAt(t, last, 0.6) });
    k.end();
    // the stickman jumps and lands on the key on every other beat
    this.man.set(stomp(t, hits), glowAt(t, last, 0.3) * 0.4);
    this.man.root.position.set(0.15, 0.38 + 0.75 * 0.5 - pr * 0.13, 1.25);
    this.man.root.position.y += (this.man.root.children.length ? 0 : 0);
    const a = -0.35 + f.local * 0.05;
    this.cam.position.set(Math.sin(a) * 4.2, 2.4, 1.2 + Math.cos(a) * 4.2);
    this.cam.lookAt(0, 0.35, 0.4);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: this.cam.position.distanceTo(new THREE.Vector3(0, 0.4, 1.2)), aperture: 26, bloom: 0.7, tint: [0.92, 0.98, 1.08] } };
  }
  override overlay(c: CanvasRenderingContext2D) { label(c, 'LOOK-DEV 1/4 · HERO KEY', 'macro · mirror desk · DOF f/1.4 · bokeh from lit keys'); }
}

/** 2 · WALL — a wall of ENTER keys receding at an angle, a press wave sweeping through, fog swallowing the far end. */
export class Wall extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.045, keyLight: [-6, 9, 10], shadowSize: 20 });
  keys = new KeyBank(900);
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 300);
  override init() { this.keys.addTo(this.stage.scene); }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t;
    const k = this.keys; k.begin();
    const wave = audio.timeOfBeat(Math.floor(audio.beatAt(t) / 2) * 2);
    for (let r = 0; r < 14; r++) for (let c = 0; c < 48; c++) {
      const x = c * 1.12, y = 0.6 + r * 1.12;
      const d = c * 1.12 * 0.035 + Math.abs(r - 7) * 0.02;
      k.add({ pos: { x, y, z: 0 }, rot: [Math.PI / 2, 0, 0], press: pressAt(t, wave + d), glow: glowAt(t, wave + d, 0.45) * (0.6 + 0.4 * hash(r, c)) });
    }
    k.end();
    this.cam.position.set(-3.5 + f.local * 0.4, 5.5, 9.5);
    this.cam.lookAt(14, 7, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 13, aperture: 18, bloom: 0.8 } };
  }
  override overlay(c: CanvasRenderingContext2D) { label(c, 'LOOK-DEV 2/4 · ENTER WALL', 'oblique wall · press wave · fog depth · DOF focus mid-wall'); }
}

/** 3 · OFFICE — an aisle of desks with blue monitors and an ENTER key each, deep into fog. */
export class Office extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'matte', fog: 0.04, keyLight: [4, 12, 6], shadowSize: 24 });
  keys = new KeyBank(80);
  cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 300);
  desks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.1, 1.4), new THREE.MeshPhysicalMaterial({ color: 0x2a2b31, roughness: 0.5, clearcoat: 0.5 }), 64);
  screens = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.3, emissive: new THREE.Color(0x5ac8ff), emissiveIntensity: 0.35 }), 64);
  men: Stickman[] = [];
  override init() {
    const s = this.stage.scene;
    for (let i = 0; i < 32; i++) { const m = new Stickman({ thickness: 0.07 }); m.root.scale.setScalar(0.62); s.add(m.root); this.men.push(m); }
    this.desks.castShadow = this.desks.receiveShadow = true; this.screens.castShadow = true;
    s.add(this.desks, this.screens); this.keys.addTo(s);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let row = 0; row < 16; row++) for (const side of [-1, 1]) {
      const x = side * 2.4, z = -row * 3.2;
      m.makeTranslation(x, 1.0, z); this.desks.setMatrixAt(i, m);
      m.makeRotationY(side * -0.25).setPosition(x, 1.75, z - 0.45); this.screens.setMatrixAt(i, m);
      i++;
    }
    this.desks.count = this.screens.count = i;
  }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t;
    const k = this.keys; k.begin();
    for (let row = 0; row < 16; row++) for (const side of [-1, 1]) {
      const h = audio.timeOfBeat(Math.floor(audio.beatAt(t)) - ((row + (side > 0 ? 0 : 2)) % 4));
      k.add({ pos: { x: side * 2.4 + side * -0.6, y: 1.12, z: -row * 3.2 + 0.25 }, scale: 0.42, rot: [0, side * -0.2, 0], press: pressAt(t, h), glow: 0.15 + 0.85 * glowAt(t, h, 0.35) });
      const m = this.men[row * 2 + (side > 0 ? 1 : 0)]!;
      m.set(typing(t, row * 2 + side, h), glowAt(t, h, 0.3) * 0.3);
      m.root.position.set(side * 2.4 + side * -0.3, 0.45, -row * 3.2 + 1.15);
      m.root.rotation.y = Math.PI + side * 0.15;
    }
    k.end();
    this.cam.position.set(0.6 * Math.sin(f.local * 0.3), 2.1, 6 - f.local * 0.9);
    this.cam.lookAt(0, 1.3, -20);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 7.5, aperture: 16, bloom: 0.75, tint: [0.9, 1.0, 1.15] } };
  }
  override overlay(c: CanvasRenderingContext2D) { label(c, 'LOOK-DEV 3/4 · OFFICE AISLE', 'eye-level dolly · emissive monitors · soft shadows · fog'); }
}

/** 4 · CITY — towers built from stacked keycaps at dusk, aerial camera, haze and bokeh. */
export class City extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.018, keyLight: [-30, 18, -40], shadowSize: 60, envIntensity: 0.25 });
  keys = new KeyBank(5000);
  cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 600);
  towers: { x: number; z: number; h: number }[] = [];
  override init() {
    this.keys.addTo(this.stage.scene);
    this.stage.key.color.set(0xff9a5a); this.stage.key.intensity = 3.2;
    for (let bx = -9; bx <= 9; bx++) for (let bz = -9; bz <= 9; bz++) {
      const d = Math.hypot(bx, bz);
      this.towers.push({ x: bx * 4.4, z: bz * 4.4, h: Math.max(2, Math.round(3 + 18 * Math.exp(-d * d / 34) * (0.45 + hash(bx, bz)))) });
    }
  }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t;
    const k = this.keys; k.begin();
    const w = audio.timeOfBeat(Math.floor(audio.beatAt(t) / 4) * 4);
    for (const tw of this.towers) for (let y = 0; y < tw.h; y++) {
      const d = Math.hypot(tw.x, tw.z) / 60 + y * 0.03;
      k.add({ pos: { x: tw.x, y: 0.62 + y * 1.25, z: tw.z }, scale: 2.5, rot: [0, hash(tw.x, tw.z) * 0.4, 0], glow: glowAt(t, w + d, 0.6) * 0.8 + 0.05 * hash(tw.x, y, tw.z), legend: y === tw.h - 1 });
    }
    k.end();
    const a = 0.7 + f.local * 0.05;
    this.cam.position.set(Math.cos(a) * 70, 26, Math.sin(a) * 70);
    this.cam.lookAt(0, 8, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 66, aperture: 12, bloom: 0.85, tint: [1.08, 0.95, 0.9] } };
  }
  override overlay(c: CanvasRenderingContext2D) { label(c, 'LOOK-DEV 4/4 · ENTER CITY', 'aerial dusk · keycap towers · mirror ground · haze'); }
}

/** 5 · FIGURES — the three figure looks side by side, each slamming a big ENTER key. */
import { Figure, slam, type FigureStyle } from '../../src/kit/figure';
export class Figures extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.03, keyLight: [3, 7, 6], shadowSize: 8 });
  keys = new KeyBank(12);
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
  figs: Figure[] = [];
  override init() {
    this.keys.addTo(this.stage.scene);
    this.stage.rim.intensity = 2.2; this.stage.rim.position.set(-2, 5, -8); this.stage.rim.color.set(0xffa060);
    const back = new THREE.DirectionalLight(0x5ac8ff, 2.4); back.position.set(3, 4, -7); this.stage.scene.add(back);
    const test = this.ctx.params.mode === 'silhouette';
    if (test) {
      // a lit wall of keys behind the third figure: backlight is the other way to make a silhouette pop
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6a1a).multiplyScalar(1.6) }));
      wall.position.set(1.9, 1.5, -1.6); this.stage.scene.add(wall);
    }
    const styles: FigureStyle[] = test ? ['silhouette', 'silhouette', 'silhouette'] : ['mannequin', 'neon', 'silhouette'];
    styles.forEach((s, i) => {
      const f = new Figure(s, { rim: test && i === 0 ? 0 : 1 }); f.root.position.set((i - 1) * 1.7, 0, 0); f.root.rotation.y = -0.35; this.stage.scene.add(f.root); this.figs.push(f);
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.5), new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.4, clearcoat: 0.6 }));
      ped.position.set((i - 1) * 1.7 + 0.22, 0.41, 0.42); ped.rotation.y = -0.35; ped.castShadow = ped.receiveShadow = true; this.stage.scene.add(ped);
    });
  }
  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t;
    const hit = audio.timeOfBeat(Math.ceil(audio.beatAt(t - 0.3)));
    const k = this.keys; k.begin();
    this.figs.forEach((fg, i) => {
      const h = hit + i * 0.0;
      fg.set(slam(t, h, i), glowAt(t, h, 0.3) * 0.5);
      k.add({ pos: { x: (i - 1) * 1.7 + 0.22, y: 0.82 + 0.1, z: 0.42 }, scale: 0.4, rot: [0, -0.35, 0], press: pressAt(t, h), glow: 0.1 + 0.8 * glowAt(t, h, 0.5) });
    });
    k.end();
    this.cam.position.set(0.3, 1.35, 6.6);
    this.cam.lookAt(0, 0.9, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 6.6, aperture: 6, bloom: 0.6 } };
  }
  override overlay(c: CanvasRenderingContext2D) {
    label(c, 'FIGURE OPTIONS', 'cùng tư thế đập phím Enter · cùng ánh sáng');
    c.font = '900 38px "Archivo"'; c.textAlign = 'center'; c.fillStyle = '#F2EEE6';
    (this.ctx.params.mode === 'silhouette' ? ['C1 · ĐEN TRƠN', 'C2 · + VIỀN SÁNG', 'C3 · + NỀN SÁNG PHÍA SAU'] : ['A · MA-NƠ-CANH GỖ', 'B · NÉT NEON', 'C · BÓNG ĐEN ĐIỆN ẢNH']).forEach((s, i) => c.fillText(s, 960 + (i - 1) * 560, 1000));
    c.textAlign = 'left';
  }
}
