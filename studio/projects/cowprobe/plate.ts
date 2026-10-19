import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { makeStage } from '../../src/kit/stage';
import { loadCow, CowModel } from '../../src/kit/cowmodel';
export class Probe extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'matte', fog: 0.01 });
  cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  cows: CowModel[] = []; info = '';
  override async init() {
    const a = await loadCow();
    const mats: string[] = []; a.scene.traverse((o: any) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => mats.push(m.name + ':' + m.color.getHexString())); });
    this.info = mats.join(' ') + ' · ' + a.clips.map((c) => `${c.name} ${c.duration.toFixed(2)}s`).join(' | ') + ` · h=${a.height.toFixed(1)}`;
    (['holstein', 'yellow', 'brown'] as const).forEach((coat, i) => { const c = new CowModel(a, coat); c.root.position.set((i - 1) * 2.6, 0, 0); c.root.rotation.y = 0.6; this.stage.scene.add(c.root); this.cows.push(c); });
  }
  shot(f: FrameInfo): Shot {
    const names = this.cows[0]?.clipNames ?? [];
    this.cows.forEach((c, i) => { c.pose('idle', 0.4); c.bend((['x', 'y', 'z'] as const)[i]!, 0.9, 0.4); });
    this.cam.position.set(0, 2.2, 9); this.cam.lookAt(0, 0.8, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { bloom: 0.2 } };
  }
  override overlay(c: CanvasRenderingContext2D) { c.font = '500 26px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.info, 60, 70); c.fillText((this.cows[0]?.clipNames ?? []).slice(0, 3).join(' · '), 60, 110); }
}
