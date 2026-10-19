import * as THREE from 'three';
import { Plate, type Shot } from '../../src/core/plate';
export class Fonts extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera();
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
  override overlay(c: CanvasRenderingContext2D) {
    c.fillStyle = '#f4ead2'; c.fillRect(0, 0, 1920, 1080);
    const fonts = ['Archivo', 'Noteworthy', 'Chalkboard SE', 'Marker Felt', 'Bradley Hand', 'Snell Roundhand', 'Savoye LET', 'Sign Painter', 'Trattatello', 'Papyrus', 'Baskerville', 'Georgia'];
    fonts.forEach((f, i) => { c.font = `700 52px "${f}"`; c.fillStyle = '#2a1c10'; c.fillText(`${f}: Chăn bò ơi · Về quê mình thôi · Mảnh đất bình yên xanh rì`, 40, 80 + i * 84); });
  }
}
