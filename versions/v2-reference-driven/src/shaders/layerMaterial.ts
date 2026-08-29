/**
 * The V2 deformation material. One vertex shader moves photograph layers:
 *
 *  - STEM BEND: displacement grows along the root→head axis with the same
 *    smooth root-fixed envelope V1 used (t²·(0.4+0.6t)); the root anchor
 *    never moves.
 *  - RIGID HEAD: pixels within the head radius travel with the full bend
 *    plus a small rotation about the (displaced) head center, computed in
 *    aspect-corrected space so the rotation doesn't shear.
 *  - Uniform uBend comes from the copied V1 PlantSim — wind controls
 *    MOTION only; appearance is the photograph's own pixels.
 *
 * Explicitly NOT a whole-image UV wobble: deformation is anchored,
 * localized and per-layer (spec §10).
 */
import {
  NoBlending,
  NormalBlending,
  ShaderMaterial,
  Texture,
  Vector2,
} from "three";
import { IMG_ASPECT } from "../config/layers";

const VERT = /* glsl */ `
  uniform vec2 uRoot;
  uniform vec2 uHead;
  uniform float uHeadR;
  uniform vec2 uBend;
  uniform float uRot;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // world y-up → image y-down
    vec2 img = vec2(pos.x, -pos.y);

    vec2 axis = uHead - uRoot;
    float len2 = max(dot(axis, axis), 1e-6);
    float t = clamp(dot(img - uRoot, axis) / len2, 0.0, 1.0);
    float env = t * t * (0.4 + 0.6 * t); // V1's root-fixed bend envelope
    float headD = distance(vec2(img.x * ${IMG_ASPECT.toFixed(5)}, img.y),
                           vec2(uHead.x * ${IMG_ASPECT.toFixed(5)}, uHead.y)) /
                  (uHeadR * ${IMG_ASPECT.toFixed(5)});
    float headW = 1.0 - smoothstep(0.55, 1.35, headD);
    float W = max(env, headW);

    img += uBend * W;

    // rigid head rotation about the displaced head center (aspect-corrected)
    float rw = headW;
    if (rw > 0.001) {
      vec2 hc = uHead + uBend;
      vec2 relA = vec2((img.x - hc.x) * ${IMG_ASPECT.toFixed(5)}, img.y - hc.y);
      float ang = uRot * rw;
      float ca = cos(ang);
      float sa = sin(ang);
      vec2 rotA = vec2(relA.x * ca - relA.y * sa, relA.x * sa + relA.y * ca);
      img = hc + vec2(rotA.x / ${IMG_ASPECT.toFixed(5)}, rotA.y);
    }

    pos.x = img.x;
    pos.y = -img.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    if (c.a * uOpacity < 0.004) discard;
    gl_FragColor = vec4(c.rgb, c.a * uOpacity);
  }
`;

export function createLayerMaterial(tex: Texture, opaque: boolean): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: !opaque,
    depthTest: false,
    depthWrite: false,
    blending: opaque ? NoBlending : NormalBlending,
    uniforms: {
      uTex: { value: tex },
      uOpacity: { value: 1 },
      uRoot: { value: new Vector2(0.5, 1) },
      uHead: { value: new Vector2(0.5, 0.5) },
      uHeadR: { value: 0.001 },
      uBend: { value: new Vector2(0, 0) },
      uRot: { value: 0 },
    },
  });
}
