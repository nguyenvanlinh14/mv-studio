// Post-processing written for mv-studio: depth of field from the depth buffer (gather bokeh), multi-level bloom,
// ACES-style tone curve, vignette, film grain, flash / fade / shake / zoom, and the 2D overlay on top.
import * as THREE from 'three';

export interface PostSettings {
  /** focus distance (world units from the camera) and aperture (max blur radius in px at 1080p) */
  focus: number;
  aperture: number;
  bloom: number;
  bloomThreshold: number;
  exposure: number;
  vignette: number;
  grain: number;
  /** additive white flash 0..1, fade to black 0..1 */
  flash: number;
  fade: number;
  shake: [number, number];
  zoom: number;
  /** warm/cool tint of the shadows (rgb multiplier) */
  tint: [number, number, number];
}

export const DEFAULT_POST: PostSettings = {
  focus: 10, aperture: 0, bloom: 0.6, bloomThreshold: 1.0, exposure: 1, vignette: 0.35, grain: 0.035,
  flash: 0, fade: 0, shake: [0, 0], zoom: 1, tint: [1, 1, 1],
};

const VERT = `precision highp float; in vec3 position; out vec2 uv; void main(){ uv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

class Pass {
  mat: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor(frag: string, uniforms: Record<string, THREE.IUniform>, blend: 'none' | 'add' = 'none') {
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, uniforms,
      fragmentShader: `precision highp float; in vec2 uv; out vec4 o;\n${frag}`,
      depthTest: false, depthWrite: false,
      blending: blend === 'add' ? THREE.AdditiveBlending : THREE.NoBlending, transparent: blend === 'add',
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  get u() { return this.mat.uniforms; }
  run(r: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    r.setRenderTarget(target);
    r.render(this.scene, this.cam);
  }
}

const hdr = (w: number, h: number) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });

export class PostFX {
  private coc: Pass;
  private dof: Pass;
  private bright: Pass;
  private down: Pass;
  private up: Pass;
  private grade: Pass;
  private cocRT: THREE.WebGLRenderTarget;
  private dofRT: THREE.WebGLRenderTarget;
  private mips: THREE.WebGLRenderTarget[] = [];

  constructor(public width: number, public height: number) {
    this.cocRT = hdr(width, height);
    this.dofRT = hdr(width, height);
    let w = width >> 1, h = height >> 1;
    for (let i = 0; i < 6; i++) { this.mips.push(hdr(Math.max(1, w), Math.max(1, h))); w >>= 1; h >>= 1; }

    // 1) circle of confusion (px) from linear depth, stored in alpha
    this.coc = new Pass(`
      uniform sampler2D color, depth; uniform float near, far, focus, aperture;
      void main(){
        float d = texture(depth, uv).x;
        float z = near * far / (far - d * (far - near));
        // signed blur radius in px: negative = in front of the focus plane, positive = behind it
        float c = aperture * clamp((z - focus) / max(z, 1e-3) * 2.2, -1.0, 1.0);
        o = vec4(texture(color, uv).rgb, c);
      }`, { color: { value: null }, depth: { value: null }, near: { value: 0.1 }, far: { value: 100 }, focus: { value: 10 }, aperture: { value: 0 } });

    // 2) bokeh gather: golden-angle disc, a sample counts where its own blur reaches this pixel
    this.dof = new Pass(`
      uniform sampler2D src; uniform vec2 texel; uniform float maxR;
      const int N = 72;
      void main(){
        vec4 c0 = texture(src, uv);
        if (maxR < 0.5) { o = vec4(c0.rgb, 1.0); return; }
        float cc = c0.a;
        vec3 acc = c0.rgb; float wsum = 1.0;
        for (int i = 1; i < N; i++) {
          float r = sqrt(float(i) / float(N)) * maxR;
          float a = float(i) * 2.39996323;
          vec4 s = texture(src, uv + vec2(cos(a), sin(a)) * r * texel);
          // foreground blur spills over anything; background blur may not cover what is sharper than itself
          float reachR = s.a < 0.0 ? -s.a : min(s.a, max(cc, 0.0) + 1.0);
          float w = smoothstep(r - 1.5, r + 0.5, reachR);
          w *= 1.0 + 1.5 * smoothstep(1.0, 3.0, max(max(s.r, s.g), s.b)) * step(3.0, abs(s.a)); // hot bokeh discs
          acc += s.rgb * w; wsum += w;
        }
        o = vec4(acc / wsum, 1.0);
      }`, { src: { value: null }, texel: { value: new THREE.Vector2(1 / width, 1 / height) }, maxR: { value: 0 } });

    // 3) bloom: soft-threshold bright pass, then a downsample/upsample chain
    this.bright = new Pass(`
      uniform sampler2D src; uniform float threshold;
      void main(){
        vec3 c = texture(src, uv).rgb;
        float l = max(max(c.r, c.g), c.b);
        float k = clamp((l - threshold * 0.6) / (threshold * 0.8), 0.0, 1.0);
        o = vec4(c * k * k, 1.0);
      }`, { src: { value: null }, threshold: { value: 1 } });
    this.down = new Pass(`
      uniform sampler2D src; uniform vec2 texel;
      void main(){
        vec3 c = texture(src, uv + texel * vec2(-1.0, -1.0)).rgb + texture(src, uv + texel * vec2(1.0, -1.0)).rgb
               + texture(src, uv + texel * vec2(-1.0, 1.0)).rgb + texture(src, uv + texel * vec2(1.0, 1.0)).rgb;
        o = vec4(c * 0.25, 1.0);
      }`, { src: { value: null }, texel: { value: new THREE.Vector2() } });
    this.up = new Pass(`
      uniform sampler2D src; uniform vec2 texel; uniform float weight;
      void main(){
        vec3 c = 4.0 * texture(src, uv).rgb;
        c += 2.0 * (texture(src, uv + vec2(texel.x, 0.0)).rgb + texture(src, uv - vec2(texel.x, 0.0)).rgb + texture(src, uv + vec2(0.0, texel.y)).rgb + texture(src, uv - vec2(0.0, texel.y)).rgb);
        c += texture(src, uv + texel).rgb + texture(src, uv - texel).rgb + texture(src, uv + vec2(texel.x, -texel.y)).rgb + texture(src, uv + vec2(-texel.x, texel.y)).rgb;
        o = vec4(c / 16.0 * weight, 1.0);
      }`, { src: { value: null }, texel: { value: new THREE.Vector2() }, weight: { value: 1 } }, 'add');

    // 4) grade + overlay → display (sRGB)
    this.grade = new Pass(`
      uniform sampler2D img, bloomTex, overlay; uniform float bloom, exposure, vignette, grain, flash, fade, zoom, seed;
      uniform vec2 shake; uniform vec3 tint; uniform bool hasOverlay;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec2 q = (uv - 0.5) / zoom + 0.5 + shake / vec2(1920.0, 1080.0);
        vec3 c = texture(img, q).rgb + texture(bloomTex, q).rgb * bloom;
        c *= exposure;
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(tint, vec3(1.0), smoothstep(0.0, 0.5, lum));
        c = aces(c);
        vec2 v = uv - 0.5; c *= 1.0 - vignette * smoothstep(0.25, 0.85, length(v * vec2(1.0, 0.82)) * 1.25);
        c = pow(c, vec3(1.0 / 2.2));
        c += (hash(uv * vec2(1920.0, 1080.0) + seed) - 0.5) * grain;
        if (hasOverlay) { vec4 ov = texture(overlay, uv); c = c * (1.0 - ov.a) + ov.rgb; }
        c += flash;
        c *= 1.0 - fade;
        o = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`, {
      img: { value: null }, bloomTex: { value: null }, overlay: { value: null }, hasOverlay: { value: false },
      bloom: { value: 0.6 }, exposure: { value: 1 }, vignette: { value: 0.35 }, grain: { value: 0.03 }, flash: { value: 0 }, fade: { value: 0 },
      zoom: { value: 1 }, seed: { value: 0 }, shake: { value: new THREE.Vector2() }, tint: { value: new THREE.Vector3(1, 1, 1) },
    });
  }

  /** color/depth: the accumulated HDR frame; cam: for the depth → distance conversion; out: null = canvas. */
  render(r: THREE.WebGLRenderer, color: THREE.Texture, depth: THREE.DepthTexture, cam: THREE.PerspectiveCamera, p: PostSettings, overlay: THREE.Texture | null, frame: number, out: THREE.WebGLRenderTarget | null) {
    const s = this.height / 1080;
    const c = this.coc.u;
    c.color!.value = color; c.depth!.value = depth; c.near!.value = cam.near; c.far!.value = cam.far; c.focus!.value = p.focus; c.aperture!.value = p.aperture * s;
    this.coc.run(r, this.cocRT);
    this.dof.u.src!.value = this.cocRT.texture; this.dof.u.maxR!.value = p.aperture * s;
    this.dof.run(r, this.dofRT);

    this.bright.u.src!.value = this.dofRT.texture; this.bright.u.threshold!.value = p.bloomThreshold;
    this.bright.run(r, this.mips[0]!);
    for (let i = 1; i < this.mips.length; i++) {
      const src = this.mips[i - 1]!;
      this.down.u.src!.value = src.texture; (this.down.u.texel!.value as THREE.Vector2).set(1 / src.width, 1 / src.height);
      this.down.run(r, this.mips[i]!);
    }
    for (let i = this.mips.length - 1; i > 0; i--) {
      const src = this.mips[i]!;
      this.up.u.src!.value = src.texture; (this.up.u.texel!.value as THREE.Vector2).set(1 / src.width, 1 / src.height); this.up.u.weight!.value = 1;
      this.up.run(r, this.mips[i - 1]!);
    }

    const g = this.grade.u;
    g.img!.value = this.dofRT.texture; g.bloomTex!.value = this.mips[0]!.texture;
    g.overlay!.value = overlay; g.hasOverlay!.value = !!overlay;
    g.bloom!.value = p.bloom; g.exposure!.value = p.exposure; g.vignette!.value = p.vignette; g.grain!.value = p.grain;
    g.flash!.value = p.flash; g.fade!.value = p.fade; g.zoom!.value = p.zoom; g.seed!.value = (frame % 997) * 1.37;
    (g.shake!.value as THREE.Vector2).set(p.shake[0], p.shake[1]); (g.tint!.value as THREE.Vector3).set(...p.tint);
    this.grade.run(r, out);
  }
}
