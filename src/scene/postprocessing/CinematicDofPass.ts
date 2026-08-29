/**
 * Custom cinematic depth of field for the meadow's extreme optics.
 *
 * The reference photograph needs foreground blur discs on the order of
 * 10–15% of frame width — far beyond what single-kernel gather DOF effects
 * deliver cleanly. This pass:
 *
 *   1. prefilters the frame to 1/2 res, writing near-field CoC into alpha
 *   2. builds a blur pyramid A(1/2) → B(1/2) → C(1/4) → D(1/8) with Kawase
 *      iterations (each level continues from the last: progressively creamy)
 *   3. composites by per-pixel circle of confusion computed from the real
 *      depth buffer, using a saturating physical CoC curve  c ∝ |d−f|/d
 *
 * Because the near CoC rides the pyramid's alpha channel, foreground blur
 * dilates and spills over the sharp midground the way a real lens renders
 * out-of-focus foreground — and anything moving through the focus plane
 * sharpens/softens purely from its depth.
 */
import { Pass } from "postprocessing";
import {
  HalfFloatType,
  LinearFilter,
  NoBlending,
  ShaderMaterial,
  Texture,
  Uniform,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { cameraConfig } from "../../config/cameraConfig";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

/** Shared CoC helpers (world-space distances from the perspective depth buffer). */
const COC_GLSL = /* glsl */ `
  uniform sampler2D depthBuffer;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform float focusDistance;
  uniform float deadZone;
  uniform float nearScale;
  uniform float farScale;

  float viewDistance(const in vec2 uv) {
    float depth = texture2D(depthBuffer, uv).r;
    float z = (cameraNear * cameraFar) / ((cameraFar - cameraNear) * depth - cameraFar);
    return -z;
  }

  // saturating physical-ish CoC: grows with |d - f| / d
  vec2 cocAt(const in vec2 uv) {
    float d = max(viewDistance(uv), 1e-3);
    float signedDist = d - focusDistance;
    float mag = max(abs(signedDist) - deadZone, 0.0) / d;
    float far = clamp(mag * farScale, 0.0, 1.0) * step(0.0, signedDist);
    float near = clamp(mag * nearScale, 0.0, 1.0) * step(signedDist, 0.0);
    return vec2(near, far);
  }
`;

const PREFILTER_FRAG = /* glsl */ `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;
  ${COC_GLSL}
  void main() {
    vec3 c = texture2D(inputBuffer, vUv).rgb;
    vec2 coc = cocAt(vUv);
    gl_FragColor = vec4(c, coc.x);
  }
`;

const KAWASE_FRAG = /* glsl */ `
  uniform sampler2D inputBuffer;
  uniform vec2 texelSize;
  uniform float offset;
  varying vec2 vUv;
  void main() {
    vec2 o = texelSize * (offset + 0.5);
    vec4 c =
      texture2D(inputBuffer, vUv + vec2( o.x,  o.y)) +
      texture2D(inputBuffer, vUv + vec2(-o.x,  o.y)) +
      texture2D(inputBuffer, vUv + vec2( o.x, -o.y)) +
      texture2D(inputBuffer, vUv + vec2(-o.x, -o.y));
    gl_FragColor = c * 0.25;
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D inputBuffer;
  uniform sampler2D blurA;
  uniform sampler2D blurB;
  uniform sampler2D blurC;
  uniform sampler2D blurD;
  varying vec2 vUv;
  ${COC_GLSL}

  void main() {
    vec4 a = texture2D(blurA, vUv);
    vec4 bb = texture2D(blurB, vUv);
    vec4 cc = texture2D(blurC, vUv);
    vec4 dd = texture2D(blurD, vUv);

    vec2 coc = cocAt(vUv);
    // near-field CoC dilated through the blur pyramid — foreground softness
    // spills over the focus plane like a real lens
    float nearSpread = max(max(bb.a, cc.a), dd.a);
    float w = max(coc.y, max(coc.x, nearSpread));

    vec3 c = texture2D(inputBuffer, vUv).rgb;
    c = mix(c, a.rgb, smoothstep(0.0, 0.22, w));
    c = mix(c, bb.rgb, smoothstep(0.18, 0.45, w));
    c = mix(c, cc.rgb, smoothstep(0.4, 0.7, w));
    c = mix(c, dd.rgb, smoothstep(0.65, 1.0, w));

    gl_FragColor = vec4(c, 1.0);
  }
`;

function makeMat(frag: string, uniforms: Record<string, Uniform>): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag,
    uniforms,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  });
}

function makeRT(w: number, h: number): WebGLRenderTarget {
  return new WebGLRenderTarget(w, h, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });
}

export class CinematicDofPass extends Pass {
  private prefilterMat: ShaderMaterial;
  private kawaseMat: ShaderMaterial;
  private compositeMat: ShaderMaterial;

  private rtPre!: WebGLRenderTarget;
  private rtPing!: WebGLRenderTarget;
  private rtA!: WebGLRenderTarget;
  private rtB!: WebGLRenderTarget;
  private rtCPing!: WebGLRenderTarget;
  private rtC!: WebGLRenderTarget;
  private rtDPing!: WebGLRenderTarget;
  private rtD!: WebGLRenderTarget;

  private w = 2;
  private h = 2;
  /** Quality-tier scale applied to every pyramid target (0..1]. */
  private resolutionScale: number;

  constructor(resolutionScale = 1) {
    super("CinematicDofPass");
    this.resolutionScale = resolutionScale;
    (this as unknown as { needsDepthTexture: boolean }).needsDepthTexture = true;

    const cocUniforms = () => ({
      depthBuffer: new Uniform(null),
      cameraNear: new Uniform(cameraConfig.near),
      cameraFar: new Uniform(cameraConfig.far),
      focusDistance: new Uniform(cameraConfig.focusDistance),
      deadZone: new Uniform(0.12),
      nearScale: new Uniform(1.7),
      farScale: new Uniform(1.8),
    });

    this.prefilterMat = makeMat(PREFILTER_FRAG, {
      inputBuffer: new Uniform(null),
      ...cocUniforms(),
    });
    this.kawaseMat = makeMat(KAWASE_FRAG, {
      inputBuffer: new Uniform(null),
      texelSize: new Uniform(new Vector2()),
      offset: new Uniform(0),
    });
    this.compositeMat = makeMat(COMPOSITE_FRAG, {
      inputBuffer: new Uniform(null),
      blurA: new Uniform(null),
      blurB: new Uniform(null),
      blurC: new Uniform(null),
      blurD: new Uniform(null),
      ...cocUniforms(),
    });

    this.allocate();
    this.fullscreenMaterial = this.compositeMat;
  }

  /** Runtime tuning access (dev panel / tests). */
  setFocus(distance: number, deadZone?: number): void {
    for (const m of [this.prefilterMat, this.compositeMat]) {
      m.uniforms.focusDistance.value = distance;
      if (deadZone !== undefined) m.uniforms.deadZone.value = deadZone;
    }
  }

  setStrength(nearScale: number, farScale: number): void {
    for (const m of [this.prefilterMat, this.compositeMat]) {
      m.uniforms.nearScale.value = nearScale;
      m.uniforms.farScale.value = farScale;
    }
  }

  private pyramidSizes(): [number, number][] {
    const sw = this.w * this.resolutionScale;
    const sh = this.h * this.resolutionScale;
    const dim = (v: number, div: number) => Math.max(1, Math.floor(v / div));
    return [
      [dim(sw, 2), dim(sh, 2)],
      [dim(sw, 4), dim(sh, 4)],
      [dim(sw, 8), dim(sh, 8)],
    ];
  }

  private allocate(): void {
    const [[w2, h2], [w4, h4], [w8, h8]] = this.pyramidSizes();
    this.rtPre = makeRT(w2, h2);
    this.rtPing = makeRT(w2, h2);
    this.rtA = makeRT(w2, h2);
    this.rtB = makeRT(w2, h2);
    this.rtCPing = makeRT(w4, h4);
    this.rtC = makeRT(w4, h4);
    this.rtDPing = makeRT(w8, h8);
    this.rtD = makeRT(w8, h8);
  }

  override setSize(width: number, height: number): void {
    if (width === this.w && height === this.h) return;
    this.w = width;
    this.h = height;
    // resize in place — no dispose/reallocate churn during window drags
    const [[w2, h2], [w4, h4], [w8, h8]] = this.pyramidSizes();
    for (const rt of [this.rtPre, this.rtPing, this.rtA, this.rtB]) rt.setSize(w2, h2);
    for (const rt of [this.rtCPing, this.rtC]) rt.setSize(w4, h4);
    for (const rt of [this.rtDPing, this.rtD]) rt.setSize(w8, h8);
  }

  override setDepthTexture(depthTexture: Texture): void {
    this.prefilterMat.uniforms.depthBuffer.value = depthTexture;
    this.compositeMat.uniforms.depthBuffer.value = depthTexture;
  }

  private blit(renderer: WebGLRenderer, mat: ShaderMaterial, target: WebGLRenderTarget | null): void {
    this.fullscreenMaterial = mat;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  private kawase(
    renderer: WebGLRenderer,
    src: WebGLRenderTarget,
    dst: WebGLRenderTarget,
    offset: number,
  ): void {
    const u = this.kawaseMat.uniforms;
    u.inputBuffer.value = src.texture;
    u.texelSize.value.set(1 / src.width, 1 / src.height);
    u.offset.value = offset;
    this.blit(renderer, this.kawaseMat, dst);
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    outputBuffer: WebGLRenderTarget,
  ): void {
    // 1. prefilter to 1/2 res, near-CoC in alpha
    this.prefilterMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.blit(renderer, this.prefilterMat, this.rtPre);

    // 2. pyramid: A (tight) → B (medium) → C (wide) → D (extreme)
    this.kawase(renderer, this.rtPre, this.rtPing, 0);
    this.kawase(renderer, this.rtPing, this.rtA, 1);
    this.kawase(renderer, this.rtA, this.rtPing, 2);
    this.kawase(renderer, this.rtPing, this.rtB, 3);
    this.kawase(renderer, this.rtB, this.rtCPing, 1.5);
    this.kawase(renderer, this.rtCPing, this.rtC, 2.5);
    this.kawase(renderer, this.rtC, this.rtDPing, 1.5);
    this.kawase(renderer, this.rtDPing, this.rtD, 2.5);

    // 3. composite by circle of confusion
    const u = this.compositeMat.uniforms;
    u.inputBuffer.value = inputBuffer.texture;
    u.blurA.value = this.rtA.texture;
    u.blurB.value = this.rtB.texture;
    u.blurC.value = this.rtC.texture;
    u.blurD.value = this.rtD.texture;
    this.blit(renderer, this.compositeMat, this.renderToScreen ? null : outputBuffer);
  }
}
