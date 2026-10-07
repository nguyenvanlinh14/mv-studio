// The engine: loads a project, keeps one plate per cue, renders a frame at song time t as the average of N sub-frames
// over the shutter (motion blur, with sub-pixel jitter as anti-aliasing), then runs the post chain.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AudioInfo, type AudioJSON } from './audio';
import { Lyrics } from './lyrics';
import { DEFAULT_POST, PostFX, type PostSettings } from './post';
import { Mixer } from './transition';
import type { Cue, FrameInfo, Plate, PlateContext, Project } from './plate';

export const W = 1920, H = 1080;

const projects = import.meta.glob<{ default: Project }>('/projects/*/timeline.ts');

export interface RenderOpts { samples?: number; shutter?: number; fps?: number; frame?: number; target?: THREE.WebGLRenderTarget | null }

export class Engine {
  renderer: THREE.WebGLRenderer;
  audio!: AudioInfo;
  lyrics!: Lyrics;
  project!: Project;
  name = '';
  cues: Cue[] = [];
  errors: string[] = [];
  private plates = new Map<string, Promise<Plate | null>>();
  private ready = new Map<string, Plate>();
  private env!: THREE.Texture;
  private sceneRT: THREE.WebGLRenderTarget;
  private accumRT: THREE.WebGLRenderTarget;
  private post: PostFX;
  private overlayCanvas = document.createElement('canvas');
  private overlay2d: CanvasRenderingContext2D;
  private overlayTex: THREE.CanvasTexture;
  private accum: { scene: THREE.Scene; cam: THREE.OrthographicCamera; mat: THREE.MeshBasicMaterial };
  private mixA = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  private mixB = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  private mixer = new Mixer();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.autoClear = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const depth = new THREE.DepthTexture(W, H);
    depth.type = THREE.FloatType;
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true, depthTexture: depth });
    this.accumRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    this.post = new PostFX(W, H);
    this.overlayCanvas.width = W; this.overlayCanvas.height = H;
    this.overlay2d = this.overlayCanvas.getContext('2d')!;
    this.overlayTex = new THREE.CanvasTexture(this.overlayCanvas);
    this.overlayTex.premultiplyAlpha = true;
    this.overlayTex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: this.sceneRT.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    this.accum = { scene: s, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
  }

  async load(name: string) {
    const key = `/projects/${name}/timeline.ts`;
    const mod = projects[key];
    if (!mod) throw new Error(`no project "${name}" (expected projects/${name}/timeline.ts)`);
    this.name = name;
    this.project = (await mod()).default;
    const get = async (f: string) => { const r = await fetch(`/projects/${name}/${f}`); return r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null; };
    const [aj, lj] = await Promise.all([get(this.project.data?.audio ?? 'audio.json'), get(this.project.data?.lyrics ?? 'lyrics.json')]);
    this.audio = aj ? new AudioInfo(aj as AudioJSON) : AudioInfo.synthetic(this.project.bpm ?? 120, this.project.duration ?? 30);
    this.lyrics = lj ? new Lyrics(lj) : Lyrics.empty();
    this.cues = this.project.timeline(this.audio, this.lyrics);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    await document.fonts.load('900 100px "Archivo"');
    await document.fonts.load('500 40px "Plex Mono"');
  }

  get duration() { return this.audio.duration; }
  songUrl() { return this.project.song ? `/projects/${this.name}/${this.project.song}` : null; }

  /** Instantiate + init the plate of a cue (once). */
  plateFor(cue: Cue): Promise<Plate | null> {
    let p = this.plates.get(cue.id);
    if (!p) {
      const ctx: PlateContext = { renderer: this.renderer, audio: this.audio, lyrics: this.lyrics, env: this.env, start: cue.start, end: cue.end, params: cue.params ?? {} };
      p = cue.plate().then(async (m) => { const pl = new m.default(ctx); await pl.init(); this.ready.set(cue.id, pl); return pl; })
        .catch((e) => { this.errors.push(`[${cue.id}] ${e?.stack ?? e}`); console.error(e); return null; });
      this.plates.set(cue.id, p);
    }
    return p;
  }
  async preload() { await Promise.all(this.cues.map((c) => this.plateFor(c))); }

  cueAt(t: number) { return this.cues.find((c) => t >= c.start && t < c.end) ?? null; }

  private info(cue: Cue, t: number): FrameInfo {
    return { t, local: t - cue.start, progress: Math.min(1, Math.max(0, (t - cue.start) / (cue.end - cue.start))), beat: this.audio.beatAt(t), bar: this.audio.barAt(t) };
  }

  /** Render the frame at t into the canvas (or o.target). Returns false while the plate is still loading. */
  render(t: number, o: RenderOpts = {}): boolean {
    // transition: within ±duration/2 of a cue start that asks for one, render both sides and mix
    const tr = this.transitionAt(t);
    if (tr) {
      const okA = this.renderCue(tr.prev, t, o, this.mixA);
      const okB = this.renderCue(tr.next, t, o, this.mixB);
      this.mixer.run(this.renderer, this.mixA.texture, this.mixB.texture, tr.type, tr.k, o.frame ?? Math.round(t * 60), o.target ?? null);
      return okA && okB;
    }
    const cue = this.cueAt(t);
    return this.renderCue(cue, t, o, o.target ?? null);
  }

  transitionAt(t: number) {
    for (let i = 1; i < this.cues.length; i++) {
      const c = this.cues[i]!, tr = c.transition;
      if (!tr) continue;
      const d = tr.duration ?? 0.5;
      if (t >= c.start - d / 2 && t < c.start + d / 2) return { prev: this.cues[i - 1]!, next: c, type: tr.type, k: (t - (c.start - d / 2)) / d };
    }
    return null;
  }

  private renderCue(cue: Cue | null, t: number, o: RenderOpts, target: THREE.WebGLRenderTarget | null): boolean {
    const r = this.renderer;
    const plate = cue ? this.ready.get(cue.id) : undefined;
    if (cue && !plate) void this.plateFor(cue);
    if (!cue || !plate) {
      r.setRenderTarget(target); r.setClearColor(0x000000, 1); r.clear();
      return !cue;
    }
    const n = Math.max(1, o.samples ?? 1), dt = (o.shutter ?? 0.5) / (o.fps ?? 60);
    // sub-frame times spread over the shutter; the centre sample is rendered last so its depth drives the DOF
    const offs = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : (i / (n - 1) - 0.5) * dt)).sort((a, b) => Math.abs(b) - Math.abs(a));
    r.setRenderTarget(this.accumRT); r.setClearColor(0x000000, 1); r.clear();
    let shot = plate.shot(this.info(cue, t));
    this.accum.mat.opacity = 1 / n;
    for (let i = 0; i < n; i++) {
      const ts = t + offs[i]!;
      shot = plate.shot(this.info(cue, ts));
      const cam = shot.camera;
      cam.aspect = W / H;
      if (n > 1) { const j = halton(i + 1); cam.setViewOffset(W, H, j[0] - 0.5, j[1] - 0.5, W, H); } else cam.clearViewOffset();
      cam.updateProjectionMatrix();
      r.setRenderTarget(this.sceneRT); r.setClearColor(0x000000, 1); r.clear();
      r.render(shot.scene, cam);
      r.setRenderTarget(this.accumRT);
      r.render(this.accum.scene, this.accum.cam);
    }
    shot = plate.shot(this.info(cue, t)); // post settings + camera at the frame's own time
    shot.camera.clearViewOffset(); shot.camera.updateProjectionMatrix();
    const post: PostSettings = { ...DEFAULT_POST, ...(shot.post ?? {}) };
    // overlay
    const c = this.overlay2d;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    let hasOverlay = false;
    if (plate.overlay) { plate.overlay(c, this.info(cue, t)); hasOverlay = true; this.overlayTex.needsUpdate = true; }
    this.post.render(r, this.accumRT.texture, this.sceneRT.depthTexture as THREE.DepthTexture, shot.camera, post, hasOverlay ? this.overlayTex : null, o.frame ?? Math.round(t * 60), target);
    return true;
  }
}

function halton(i: number): [number, number] {
  const h = (b: number) => { let f = 1, r = 0, k = i; while (k > 0) { f /= b; r += f * (k % b); k = Math.floor(k / b); } return r; };
  return [h(2), h(3)];
}
