// A plate is one shot of the video: a three.js scene + camera that is a pure function of song time, plus an
// optional 2D overlay (type, HUD) drawn on top after grading. The engine owns rendering, motion blur and post.
import type * as THREE from 'three';
import type { AudioInfo } from './audio';
import type { Lyrics } from './lyrics';
import type { PostSettings } from './post';

export interface PlateContext {
  renderer: THREE.WebGLRenderer;
  audio: AudioInfo;
  lyrics: Lyrics;
  /** Image-based lighting shared by all plates (studio environment). */
  env: THREE.Texture;
  /** This plate's window in song seconds and its free-form params from the timeline. */
  start: number;
  end: number;
  params: Record<string, any>;
}

export interface FrameInfo {
  t: number;
  /** seconds since the plate started, and 0..1 through it */
  local: number;
  progress: number;
  beat: number;
  bar: number;
}

export interface Shot {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  post?: Partial<PostSettings>;
}

export abstract class Plate {
  constructor(protected ctx: PlateContext) {}
  /** Build geometry, materials, textures. */
  init(): void | Promise<void> {}
  /** Pose everything for time t and return what to render. Must depend on t only (sub-frames come in any order). */
  abstract shot(f: FrameInfo): Shot;
  /** 2D layer over the graded image (1920×1080 logical px). */
  overlay?(c: CanvasRenderingContext2D, f: FrameInfo): void;
}

export type PlateClass = new (ctx: PlateContext) => Plate;

export interface Cue {
  id: string;
  plate: () => Promise<{ default: PlateClass }>;
  start: number;
  end: number;
  params?: Record<string, any>;
  /** sub-frames for motion blur in the final render (default 16) */
  samples?: number;
  /** transition from the previous cue, centred on this cue's start */
  transition?: { type: 'whip' | 'zoom' | 'glitch' | 'flash' | 'dissolve'; duration?: number };
}

export interface Project {
  title: string;
  /** song file next to the timeline (omit for silent look-dev projects) */
  song?: string;
  /** analysis files next to the timeline (default audio.json / lyrics.json) */
  data?: { audio?: string; lyrics?: string };
  /** used when the project has no audio.json */
  bpm?: number;
  duration?: number;
  timeline(audio: AudioInfo, lyrics: Lyrics): Cue[];
}
