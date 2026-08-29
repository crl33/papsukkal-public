/**
 * The single vegetation material family. One vertex shader deforms every
 * plant in the meadow:
 *
 *  - PRIMARY BEND: the CPU PlantSim's damped-oscillator deflection (meters at
 *    the stem tip) applied with a smooth root-fixed envelope and re-normalized
 *    per-vertex length so bent stems arc instead of stretch. The envelope +
 *    renormalization technique is re-implemented from GPU Gems 3 ch. 16
 *    (Crysis vegetation) — see docs/CREDITS.md.
 *  - HEAD RIGIDITY: flower heads rotate as rigid bodies. Their frame is
 *    derived by sampling the bent spine at two heights (adapted from
 *    siliconjungle/inkwell-webgpu-flowers, MIT), then the PlantSim's
 *    secondary nod (pitch/roll lag) is applied around the bent pivot.
 *  - MICRO FLUTTER: petal/leaf shimmer from summed smooth-triangle waves at
 *    incommensurate frequencies with per-vertex + per-plant phase (GPU Gems 3
 *    ch. 16 de-synchronization recipe), scaled by the local gust value.
 *
 * Custom attributes:
 *  aData  : vec4 (s along stem 0..1, isHead flag, flutter weight, phase)
 *  aColor : vec3 linear-ish albedo authored at build time
 * Instanced variants add:
 *  iBend  : vec4 (bendX m, bendZ m, headPitch rad, headRoll rad)
 *  iGust  : float local gust 0..1
 */
import {
  Color,
  DoubleSide,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import { palette } from "../../config/palette";

export function srgb(hex: string): Color {
  return new Color().setStyle(hex, SRGBColorSpace);
}

const GLSL_HELPERS = /* glsl */ `
  float stw(float x) {
    x = abs(fract(x + 0.5) * 2.0 - 1.0);
    return x * x * (3.0 - 2.0 * x);
  }

  // rotate p by the rotation carrying unit vector a onto unit vector b
  vec3 rotFromTo(vec3 a, vec3 b, vec3 p) {
    vec3 v = cross(a, b);
    float c = dot(a, b);
    float k = 1.0 / (1.0 + max(c, -0.98));
    return p * c + cross(v, p) + v * dot(v, p) * k;
  }

  vec3 rotAxis(vec3 p, vec3 ax, float ang) {
    float s = sin(ang), c = cos(ang);
    return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1.0 - c);
  }

  // Crysis-style smooth bend envelope, normalized to 1 at s=1
  float bendEnvelope(float s) {
    float q = (s + 1.0) * (s + 1.0) * 0.5; // 0.5..2
    float f = q * q - q;                   // -0.25..2 ; 0 at s≈0.41...
    // use simple smooth power instead for guaranteed monotonic root-fixed rise
    return s * s * (0.4 + 0.6 * s);
  }
`;

const VERT = /* glsl */ `
  attribute vec4 aData;
  attribute vec3 aColor;
  #ifdef INSTANCED_BEND
    attribute vec4 iBend;
    attribute float iGust;
    attribute vec3 iTint;
  #endif

  uniform float uTime;
  uniform float uMicroAmp;
  uniform float uHeadPivotY;
  #ifndef INSTANCED_BEND
    uniform vec4 uBend;
    uniform float uGust;
  #endif

  varying vec3 vColor;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vHeadFlag;

  ${GLSL_HELPERS}

  void main() {
    vec4 bend;
    float gust;
    vec3 tint;
    #ifdef INSTANCED_BEND
      bend = iBend;
      gust = iGust;
      tint = iTint;
    #else
      bend = uBend;
      gust = uGust;
      tint = vec3(1.0);
    #endif

    mat4 model = modelMatrix;
    #ifdef USE_INSTANCING
      model = model * instanceMatrix;
    #endif

    vec3 wp = (model * vec4(position, 1.0)).xyz;
    vec3 rootW = model[3].xyz;
    vec3 nrm = normalize(mat3(model) * normal);

    float s = aData.x;
    float isHead = aData.y;
    vec3 rel = wp - rootW;

    if (isHead > 0.5) {
      // rigid head: follow the bent spine tip
      vec3 pivotW = (model * vec4(0.0, uHeadPivotY, 0.0, 1.0)).xyz;
      vec3 pivRel = pivotW - rootW;
      float Lp = max(length(pivRel), 1e-4);
      vec3 bentPiv = pivRel;
      bentPiv.xz += bend.xy;
      bentPiv = normalize(bentPiv) * Lp;
      // orientation from two spine samples (inkwell trick)
      float w2 = bendEnvelope(0.9);
      vec3 low = pivRel * 0.9;
      low.xz += bend.xy * w2;
      low = normalize(low) * Lp * 0.9;
      vec3 oldUp = normalize(pivRel);
      vec3 newUp = normalize(bentPiv - low);
      vec3 headLocal = wp - (rootW + pivRel);
      headLocal = rotFromTo(oldUp, newUp, headLocal);
      nrm = rotFromTo(oldUp, newUp, nrm);
      // secondary nod (lag) around the bent pivot
      headLocal = rotAxis(headLocal, vec3(1.0, 0.0, 0.0), bend.z);
      headLocal = rotAxis(headLocal, vec3(0.0, 0.0, 1.0), bend.w);
      nrm = rotAxis(nrm, vec3(1.0, 0.0, 0.0), bend.z);
      nrm = rotAxis(nrm, vec3(0.0, 0.0, 1.0), bend.w);
      rel = bentPiv + headLocal;
    } else if (s > 0.001) {
      float w = bendEnvelope(s);
      float L = max(length(rel), 1e-4);
      rel.xz += bend.xy * w;
      rel = normalize(rel) * L; // arc, don't stretch
    }

    // micro flutter: petal/leaf shimmer, de-synchronized by plant + vertex phase
    float fw = aData.z;
    if (fw > 0.001) {
      float instPhase = dot(rootW, vec3(1.0)) * 3.7 + aData.w;
      float wsum =
        stw(uTime * 1.975 + instPhase) +
        stw(uTime * 0.793 + instPhase * 1.31) +
        0.6 * stw(uTime * 2.633 + aData.w * 7.0);
      rel += nrm * (wsum - 1.3) * fw * uMicroAmp * (0.35 + 0.65 * gust);
    }

    wp = rootW + rel;

    vColor = aColor * tint;
    vNormalW = nrm;
    vWorldPos = wp;
    vHeadFlag = isHead;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uLightDir;
  uniform vec3 uLightCol;
  uniform vec3 uSkyCol;
  uniform vec3 uGroundCol;
  uniform vec3 uAtmCol;
  uniform float uSss;
  uniform vec2 uAtmRange;

  varying vec3 vColor;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vHeadFlag;

  void main() {
    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    vec3 L = normalize(uLightDir);

    float wrap = 0.65;
    float diff = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
    vec3 hemi = mix(uGroundCol, uSkyCol, N.y * 0.5 + 0.5);
    // thin-petal translucency: light leaking through from behind
    float sss = pow(clamp(dot(-N, L) * 0.5 + 0.5, 0.0, 1.0), 2.0) * uSss * vHeadFlag;

    vec3 col = vColor * (hemi * 0.5 + uLightCol * (diff * 0.95 + sss * 0.55));

    // soil occlusion: the meadow floor swallows light
    col *= mix(0.3, 1.0, smoothstep(0.02, 0.4, vWorldPos.y));

    // atmospheric depth: sink toward deep teal with distance
    float dist = length(vWorldPos - cameraPosition);
    float atm = smoothstep(uAtmRange.x, uAtmRange.y, dist);
    col = mix(col, uAtmCol, atm * 0.6);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface VegetationMaterialOptions {
  instanced?: boolean;
  /** Object-space height of the head pivot (stem top). */
  headPivotY?: number;
  /** Translucency strength for petals. */
  sss?: number;
  microAmp?: number;
}

export function createVegetationMaterial(opts: VegetationMaterialOptions = {}): ShaderMaterial {
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uMicroAmp: { value: opts.microAmp ?? 0.0045 },
      uHeadPivotY: { value: opts.headPivotY ?? 0.5 },
      uBend: { value: new Vector4(0, 0, 0, 0) },
      uGust: { value: 0 },
      uLightDir: { value: new Vector3(-0.35, 0.85, 0.4).normalize() },
      uLightCol: { value: srgb("#cfe4e4").multiplyScalar(1.18) },
      uSkyCol: { value: srgb("#7fb4c4").multiplyScalar(1.1) },
      uGroundCol: { value: srgb("#0d2b33") },
      uAtmCol: { value: srgb(palette.bgTeal) },
      uAtmRange: { value: new Vector2(1.8, 7.5) },
      uSss: { value: opts.sss ?? 0.65 },
    },
  });
  if (opts.instanced) {
    mat.defines = { INSTANCED_BEND: 1 };
  }
  return mat;
}
