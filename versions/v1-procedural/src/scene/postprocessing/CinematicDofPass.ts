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

/**
 * NEAR-FIELD prefilter: the foreground layer alone, PREMULTIPLIED by its
 * circle of confusion. Blurring premultiplied colour + coverage together and
 * compositing the result OVER the far-field image is what stops a defocused
 * foreground from tinting the sharp midground behind it: where no near
 * geometry exists the coverage is zero, so those pixels are left untouched.
 */
const PREFILTER_NEAR_FRAG = /* glsl */ `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;
  ${COC_GLSL}
  void main() {
    vec3 c = texture2D(inputBuffer, vUv).rgb;
    float near = cocAt(vUv).x;
    // sharpen the coverage ramp so partially-defocused midground plants do
    // not register as "foreground" and smear over their neighbours
    near = smoothstep(0.16, 0.62, near);
    gl_FragColor = vec4(c * near, near);
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
  uniform sampler2D blurNear;
  varying vec2 vUv;
  ${COC_GLSL}

  void main() {
    vec4 a = texture2D(blurA, vUv);
    vec4 bb = texture2D(blurB, vUv);
    vec4 cc = texture2D(blurC, vUv);
    vec4 dd = texture2D(blurD, vUv);

    vec2 coc = cocAt(vUv);

    // ---- FAR FIELD: this pixel's own defocus, by its own CoC only ----
    float w = coc.y;
    vec3 c = texture2D(inputBuffer, vUv).rgb;
    c = mix(c, a.rgb, smoothstep(0.0, 0.22, w));
    c = mix(c, bb.rgb, smoothstep(0.18, 0.45, w));
    c = mix(c, cc.rgb, smoothstep(0.4, 0.75, w));
    // the far field caps at C (distant flowers stay structured bokeh, not
    // fog); only the very deepest layer drifts toward the creamiest level
    c = mix(c, dd.rgb, smoothstep(0.75, 1.0, coc.y) * 0.55);

    // A near-field pixel must never keep its own sharpness: gather DOF still
    // holds the foreground object in the base layer, so blur the base by the
    // pixel's OWN near CoC before the scatter layer goes over it. Without
    // this, a small near flower shows crisp petals through a faint smear.
    c = mix(c, dd.rgb, smoothstep(0.12, 0.62, coc.x));

    // ---- NEAR FIELD: foreground scatter composited OVER ----
    // The blurred layer is premultiplied, so dividing by its own coverage
    // recovers the true average colour of the contributing foreground
    // pixels — creamy, and with no dark fringe at the silhouette.
    // The coverage ramp is then SATURATED: interiors go fully to the blurred
    // foreground (so a near mass reads as a soft smear, never a sharp
    // flower), while the faint wide tail is cut to zero, so the defocused
    // foreground can occlude the midground but never tint it.
    vec4 nearLayer = texture2D(blurNear, vUv);
    float nearRaw = clamp(nearLayer.a, 0.0, 1.0);
    vec3 nearCol = nearLayer.rgb / max(nearRaw, 1e-3);
    float nearA = smoothstep(0.10, 0.46, nearRaw);
    c = mix(c, nearCol, nearA);

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
  private prefilterNearMat: ShaderMaterial;
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
  /** near-field premultiplied layer (half → … → sixteenth). The foreground
   * masses span hundreds of pixels, so the near kernel has to be enormous
   * before they read as creamy smears rather than blurred petals. */
  private rtNPre!: WebGLRenderTarget;
  private rtNPing!: WebGLRenderTarget;
  private rtNear!: WebGLRenderTarget;

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
      deadZone: new Uniform(0.085),
      nearScale: new Uniform(1.7),
      farScale: new Uniform(2.3),
    });

    this.prefilterMat = makeMat(PREFILTER_FRAG, {
      inputBuffer: new Uniform(null),
      ...cocUniforms(),
    });
    this.prefilterNearMat = makeMat(PREFILTER_NEAR_FRAG, {
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
      blurNear: new Uniform(null),
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
      [dim(sw, 16), dim(sh, 16)],
    ];
  }

  private allocate(): void {
    const [[w2, h2], [w4, h4], [w8, h8], [sw16, sh16]] = this.pyramidSizes();
    this.rtPre = makeRT(w2, h2);
    this.rtPing = makeRT(w2, h2);
    this.rtA = makeRT(w2, h2);
    this.rtB = makeRT(w2, h2);
    this.rtCPing = makeRT(w4, h4);
    this.rtC = makeRT(w4, h4);
    this.rtDPing = makeRT(w8, h8);
    this.rtD = makeRT(w8, h8);
    void sw16;
    void sh16;
    this.rtNPre = makeRT(w2, h2);
    this.rtNPing = makeRT(w8, h8);
    this.rtNear = makeRT(w8, h8);
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
    this.rtNPre.setSize(w2, h2);
    for (const rt of [this.rtNPing, this.rtNear]) rt.setSize(w8, h8);
  }

  override setDepthTexture(depthTexture: Texture): void {
    this.prefilterMat.uniforms.depthBuffer.value = depthTexture;
    this.prefilterNearMat.uniforms.depthBuffer.value = depthTexture;
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

    // 3. near-field layer: premultiplied foreground, blurred widest. The
    //    far pyramid is finished by now, so its ping targets are free scratch.
    this.prefilterNearMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.blit(renderer, this.prefilterNearMat, this.rtNPre);
    // the far pyramid is finished, so its ping targets are free scratch
    this.kawase(renderer, this.rtNPre, this.rtPing, 1);
    this.kawase(renderer, this.rtPing, this.rtNPre, 2);
    this.kawase(renderer, this.rtNPre, this.rtCPing, 1.5);
    this.kawase(renderer, this.rtCPing, this.rtNPing, 1.5);
    this.kawase(renderer, this.rtNPing, this.rtNear, 2.5);
    this.kawase(renderer, this.rtNear, this.rtNPing, 3.0);
    this.kawase(renderer, this.rtNPing, this.rtNear, 2.0);

    // 4. composite by circle of confusion
    const u = this.compositeMat.uniforms;
    u.inputBuffer.value = inputBuffer.texture;
    u.blurA.value = this.rtA.texture;
    u.blurB.value = this.rtB.texture;
    u.blurC.value = this.rtC.texture;
    u.blurD.value = this.rtD.texture;
    u.blurNear.value = this.rtNear.texture;
    this.blit(renderer, this.compositeMat, this.renderToScreen ? null : outputBuffer);
  }
}
