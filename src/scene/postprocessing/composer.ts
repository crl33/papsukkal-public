/**
 * Cinematic optics chain:
 *   RenderPass → DepthOfFieldEffect (CoC-based, world-space focus) →
 *   ToneMapping (filmic) + Grade (teal shadows, saturation shaping,
 *   vignette, fine grain).
 *
 * The DOF is structural (reads scene depth), not a screen-space fake:
 * anything entering the focus plane sharpens by itself.
 */
import {
  BlendFunction,
  EffectComposer,
  EffectPass,
  Effect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import { HalfFloatType, PerspectiveCamera, Scene, Uniform, Vector3, WebGLRenderer } from "three";
import { CinematicDofPass } from "./CinematicDofPass";

const GRADE_FRAG = /* glsl */ `
  uniform vec3 shadowTint;
  uniform float saturation;
  uniform float vignette;
  uniform float grain;
  uniform float contrast;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));

    // teal-navy shadow bias (the reference's shadows are never neutral),
    // with a slight luminous lift — deep shadows glow navy, never crush flat
    float sh = pow(1.0 - clamp(luma, 0.0, 1.0), 2.2);
    c = mix(c, c * shadowTint + shadowTint * 0.015, sh * 0.55);
    c += vec3(0.010, 0.022, 0.034) * sh;

    // gentle filmic contrast around mid gray
    c = mix(vec3(0.5), c, contrast);

    // saturation with highlight protection
    float l2 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float satAmt = mix(saturation, 1.0, smoothstep(0.75, 1.0, l2));
    c = mix(vec3(l2), c, satAmt);

    // vignette
    vec2 q = uv - 0.5;
    float vig = 1.0 - smoothstep(0.35, 0.95, length(q) * 1.25) * vignette;
    c *= vig;

    // fine static-free grain
    c += (hash12(uv * vec2(1920.0, 1080.0) + fract(time) * 43.7) - 0.5) * grain;

    outputColor = vec4(c, inputColor.a);
  }
`;

class GradeEffect extends Effect {
  constructor() {
    super("GradeEffect", GRADE_FRAG, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, Uniform>([
        ["shadowTint", new Uniform(new Vector3(0.62, 0.85, 1.0))],
        ["saturation", new Uniform(1.14)],
        ["vignette", new Uniform(0.42)],
        ["grain", new Uniform(0.012)],
        ["contrast", new Uniform(1.06)],
      ]),
    });
  }
}

export interface PostChain {
  composer: EffectComposer;
  dof: CinematicDofPass;
  grade: GradeEffect;
  setSize(w: number, h: number): void;
}

export function createPostChain(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  _quality: { dofResolutionScale: number },
): PostChain {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const dof = new CinematicDofPass();
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const grade = new GradeEffect();

  composer.addPass(dof);
  composer.addPass(new EffectPass(camera, tone, grade));

  return {
    composer,
    dof,
    grade,
    setSize: (w, h) => composer.setSize(w, h),
  };
}
