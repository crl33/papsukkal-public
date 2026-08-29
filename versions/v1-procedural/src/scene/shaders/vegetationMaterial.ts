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
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from "three";

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
  attribute float aTexFlag;
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
  varying float vFlutter;
  varying float vPhase;
  varying float vTexFlag;
  varying vec2 vUv;

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
    vFlutter = aData.z;
    vPhase = aData.w;
    vTexFlag = aTexFlag;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const FRAG = /* glsl */ `
  #ifdef USE_PETAL_MAP
    uniform sampler2D uMap;
    uniform vec3 uUnderside;
    uniform float uTransmit;
    uniform float uSpec;
  #endif
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
  varying float vFlutter;
  varying float vPhase;
  varying float vTexFlag;
  varying vec2 vUv;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    // painted petal artwork: albedo + organic alpha silhouette from the
    // species atlas; vColor carries per-petal luminance/tint variation
    vec3 albedo = vColor;
    float texFlag = 0.0;
    #ifdef USE_PETAL_MAP
      vec4 texel = texture2D(uMap, vUv);
      texFlag = vTexFlag;
      albedo = mix(vColor, texel.rgb * vColor, texFlag);
      if (texFlag > 0.5 && texel.a < 0.45) discard;
    #endif

    vec3 N = normalize(vNormalW);
    bool back = !gl_FrontFacing;
    if (back) N = -N;
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    #ifdef USE_PETAL_MAP
      // PETAL UNDERSIDE: the outer face of a petal is thicker, unlit and
      // pigment-dense — the reference's cup rim and near petals read almost
      // burgundy-navy. Structure, not noise: it follows the facing.
      if (back && texFlag > 0.5) albedo *= uUnderside;
    #endif

    float wrap = 0.65;
    float diff = clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
    vec3 hemi = mix(uGroundCol, uSkyCol, N.y * 0.5 + 0.5) * 1.05;
    // thin-petal translucency: light leaking through from behind
    float sss = pow(clamp(dot(-N, L) * 0.5 + 0.5, 0.0, 1.0), 2.0) * uSss * vHeadFlag;

    // tiny sprig blossoms (non-head, high flutter weight) scatter light like
    // the reference's red poms — flatten their shading toward even brightness
    float bloomF = smoothstep(0.32, 0.5, vFlutter) * 0.85 * (1.0 - vHeadFlag);
    vec3 lit = hemi * 0.5 + uLightCol * (diff * 0.95 + sss * 0.55);
    vec3 flatLit = uLightCol * 0.58 + uSkyCol * 0.12;
    vec3 col = albedo * mix(lit, flatLit, bloomF);

    #ifdef USE_PETAL_MAP
      if (texFlag > 0.5) {
        // THICKNESS-DRIVEN TRANSMISSION: light passing through a thin petal.
        // Grazing view + light behind = the hot pink glow of a backlit petal;
        // the atlas's own base→tip ramp supplies the thickness gradient.
        float wrapT = clamp(dot(-N, L) * 0.5 + 0.5, 0.0, 1.0);
        float graze = 1.0 - abs(dot(N, V));
        float trans = pow(wrapT, 2.2) * (0.35 + 0.65 * graze) * uTransmit;
        col += albedo * uLightCol * trans;
        // soft, wide specular — petals are waxy, never glossy
        vec3 H = normalize(L + V);
        float spec = pow(clamp(dot(N, H), 0.0, 1.0), 14.0) * uSpec * (back ? 0.25 : 1.0);
        col += uLightCol * spec;
      }
    #endif

    // organic petal surface: fine static grain + soft cell mottling breaks
    // the airbrushed flatness of procedural color under close inspection
    if (vHeadFlag > 0.5 && texFlag < 0.5) {
      float grain = hash12(floor(vUv * 96.0) + vPhase * 100.0);
      float mottle = hash12(floor(vUv * vec2(7.0, 16.0)) + vPhase * 37.0);
      col *= 0.94 + 0.06 * grain + 0.06 * mottle;
    }

    // THIN-VEGETATION TRANSMISSION: stems and leaflets are translucent —
    // they carry light through, so they read as cyan botanical filaments
    // rather than black graphic lines.
    float thin = (1.0 - vHeadFlag) * (1.0 - clamp(vFlutter * 2.0, 0.0, 1.0));
    col += vColor * uSkyCol * thin * 0.2 * (0.45 + 0.55 * clamp(dot(-N, L) * 0.5 + 0.5, 0.0, 1.0));

    // soil occlusion: the meadow floor swallows light — but blossoms
    // (high flutter weight) glow through, like the reference's low red poms
    float occ = mix(0.2, 1.18, smoothstep(0.14, 0.6, vWorldPos.y));
    occ = mix(occ, 1.0, smoothstep(0.32, 0.5, vFlutter) * 0.85);
    // ground shadow is a NEAR-FIELD effect: distant vegetation belongs to the
    // luminous mass of the meadow, not to the shaded soil at our feet
    float distOcc = length(vWorldPos - cameraPosition);
    occ = mix(occ, 1.12, smoothstep(1.9, 4.2, distOcc));
    col *= occ;

    // atmospheric depth: sink toward deep teal with distance
    float dist = length(vWorldPos - cameraPosition);
    // stems/foliage dissolve into the teal atmosphere with distance; flower
    // heads keep their contrast so the focal hierarchy survives
    float atmStart = mix(1.0, 2.6, vHeadFlag);
    float atmEnd = mix(3.8, 8.0, vHeadFlag);
    float atm = smoothstep(atmStart, atmEnd, dist);
    col = mix(col, uAtmCol, atm * mix(0.5, 0.34, vHeadFlag));

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
  /** Species petal atlas (see petalTextures.ts) — vertices with aTexFlag=1
   * sample it for albedo + alpha silhouette. */
  map?: Texture;
  /** Multiplier applied to a petal's UNDERSIDE albedo (dense, unlit face). */
  underside?: Vector3;
  /** Backlit transmission strength through thin petals. */
  transmit?: number;
  /** Soft specular strength (waxy, never glossy). */
  spec?: number;
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
      uLightCol: { value: srgb("#d8e8e0").multiplyScalar(1.85) },
      uSkyCol: { value: srgb("#93bfbc").multiplyScalar(1.15) },
      uGroundCol: { value: srgb("#22443a") },
      uAtmCol: { value: srgb("#3d6455") },
      uAtmRange: { value: new Vector2(2.2, 8.0) },
      uSss: { value: opts.sss ?? 0.85 },
    },
  });
  const defines: Record<string, number> = {};
  if (opts.instanced) defines.INSTANCED_BEND = 1;
  if (opts.map) {
    defines.USE_PETAL_MAP = 1;
    mat.uniforms.uMap = { value: opts.map };
    mat.uniforms.uUnderside = {
      value: opts.underside ?? new Vector3(0.58, 0.4, 0.66),
    };
    mat.uniforms.uTransmit = { value: opts.transmit ?? 0.72 };
    mat.uniforms.uSpec = { value: opts.spec ?? 0.05 };
  }
  mat.defines = defines;
  return mat;
}
