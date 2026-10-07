// Cut transitions: mixes the outgoing (A) and incoming (B) graded frames. k runs 0 → 1 across the transition.
import * as THREE from 'three';

const TYPES = { dissolve: 0, flash: 1, whip: 2, zoom: 3, glitch: 4 } as const;

export class Mixer {
  private mat: THREE.RawShaderMaterial;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor() {
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
      uniforms: { A: { value: null }, B: { value: null }, k: { value: 0 }, type: { value: 0 }, seed: { value: 0 } },
      vertexShader: `precision highp float; in vec3 position; out vec2 uv; void main(){ uv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `precision highp float; in vec2 uv; out vec4 o;
        uniform sampler2D A, B; uniform float k, seed; uniform int type;
        float hash(float x){ return fract(sin(x * 91.3458 + seed) * 47453.5453); }
        vec3 tap(sampler2D s, vec2 p){ return (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) ? vec3(0.0) : texture(s, p).rgb; }
        void main(){
          float e = k * k * (3.0 - 2.0 * k);
          float speed = sin(3.14159 * k);
          vec3 c;
          if (type == 0) { c = mix(texture(A, uv).rgb, texture(B, uv).rgb, e); }
          else if (type == 1) { c = mix(texture(A, uv).rgb, texture(B, uv).rgb, step(0.5, k)) + vec3(pow(speed, 3.0)); }
          else if (type == 2) {
            // whip pan: both frames slide left with heavy horizontal motion blur
            vec3 a = vec3(0.0), b = vec3(0.0);
            for (int i = 0; i < 24; i++) {
              float f = (float(i) / 23.0 - 0.5) * 0.35 * speed;
              a += tap(A, uv + vec2(e + f, 0.0));
              b += tap(B, uv + vec2(e - 1.0 + f, 0.0));
            }
            c = (a + b) / 24.0;
          } else if (type == 3) {
            // zoom punch: A rushes into the centre, B arrives from close up, radial blur at the peak
            vec2 d = uv - 0.5; vec3 a = vec3(0.0), b = vec3(0.0);
            float za = 1.0 + 2.5 * e, zb = 3.5 - 2.5 * e;
            for (int i = 0; i < 20; i++) {
              float f = 1.0 - float(i) / 19.0 * 0.25 * speed;
              a += tap(A, 0.5 + d * f / za);
              b += tap(B, 0.5 + d * f / zb);
            }
            c = mix(a, b, smoothstep(0.4, 0.6, k)) / 20.0;
          } else {
            // glitch: horizontal slices jump, RGB splits, slices flip to B progressively
            float row = floor(uv.y * 28.0);
            float r = hash(row + floor(seed));
            float off = (r - 0.5) * 0.25 * speed;
            vec2 p = uv + vec2(off, 0.0);
            bool useB = r < k;
            float sp = 0.012 * speed;
            vec3 ca = vec3(tap(A, p + vec2(sp, 0.0)).r, tap(A, p).g, tap(A, p - vec2(sp, 0.0)).b);
            vec3 cb = vec3(tap(B, p + vec2(sp, 0.0)).r, tap(B, p).g, tap(B, p - vec2(sp, 0.0)).b);
            c = useB ? cb : ca;
          }
          o = vec4(c, 1.0);
        }`,
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false;
    this.scene.add(m);
  }
  run(r: THREE.WebGLRenderer, a: THREE.Texture, b: THREE.Texture, type: keyof typeof TYPES, k: number, frame: number, out: THREE.WebGLRenderTarget | null) {
    const u = this.mat.uniforms;
    u.A!.value = a; u.B!.value = b; u.k!.value = Math.min(1, Math.max(0, k)); u.type!.value = TYPES[type]; u.seed!.value = (frame % 997) * 3.1;
    r.setRenderTarget(out);
    r.render(this.scene, this.cam);
  }
}
