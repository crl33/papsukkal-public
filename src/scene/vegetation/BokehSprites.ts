/**
 * Deep-background impostors: cheap camera-facing discs with real depth.
 * The DOF post-process does the actual optical work — a flat disc at z=-5
 * becomes an authentic bokeh blob, a "poppy" disc (red ring, dark heart)
 * becomes exactly the defocused-poppy shape in the reference.
 * Only used beyond ~2 m where the blur destroys all interior detail.
 */
import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { srgb } from "../shaders/vegetationMaterial";

export interface SpriteSpec {
  position: Vector3;
  size: number;
  tint: string;
  /** 0 = soft irregular blob, 1 = poppy ring w/ dark heart. */
  kind: number;
  seed: number;
}

const VERT = /* glsl */ `
  attribute vec3 iTint;
  attribute vec4 iBend;
  attribute vec2 iKindSeed;
  varying vec2 vUv;
  varying vec3 vTint;
  varying vec2 vKindSeed;
  void main() {
    vUv = uv;
    vTint = iTint;
    vKindSeed = iKindSeed;
    vec4 wp = instanceMatrix * vec4(position, 1.0);
    wp.xz += iBend.xy;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vTint;
  varying vec2 vKindSeed;
  uniform vec3 uAtmCol;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float kind = vKindSeed.x;
    float seed = vKindSeed.y;
    float ang = atan(p.y, p.x);
    float wobble = 0.14 * sin(ang * 3.0 + seed * 7.1) + 0.09 * sin(ang * 5.0 + seed * 3.3);
    float r = length(p) * (1.0 + wobble);

    vec3 col;
    if (kind > 2.5) {
      // bright azure disc — a sky gap glowing between distant flowers
      if (r > 1.0) discard;
      col = vTint * 1.25 * (1.0 - 0.3 * r * r);
    } else if (kind > 1.5) {
      // flower-shaped silhouette: the viewer should read "flower", not "dot"
      float petals = 5.0 + floor(mod(seed * 2.7, 3.0));
      float mask = 0.52 + 0.48 * pow(abs(cos(ang * petals * 0.5 + seed * 1.9)), 1.4);
      if (r > mask) discard;
      // luminous mid-petal zone, slightly darker heart and rim
      col = vTint * (0.55 + 0.65 * smoothstep(0.05, 0.42, r)) * (1.0 - 0.25 * smoothstep(0.75, 1.0, r / mask));
      col = mix(col, vTint * 0.25, smoothstep(0.16, 0.0, r));
    } else if (kind > 0.5) {
      // defocused poppy: dark heart, hot ring, darker rim
      if (r > 1.0) discard;
      vec3 heart = vTint * 0.12;
      vec3 ring = vTint * 1.6;
      col = mix(heart, ring, smoothstep(0.18, 0.5, r));
      col *= 1.0 - 0.3 * smoothstep(0.78, 1.0, r);
    } else {
      // soft blob, brighter core
      if (r > 1.0) discard;
      col = vTint * (1.05 - 0.35 * r * r);
    }
    // slight atmospheric mix keyed to nothing fancy — DOF does the rest
    col = mix(col, uAtmCol, 0.07);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class BokehSprites {
  readonly mesh: InstancedMesh;
  readonly bendAttr: InstancedBufferAttribute;
  /** PlantSim indices per instance (filled by the scene). */
  simIndices: number[] = [];

  constructor(specs: SpriteSpec[]) {
    const geo = new PlaneGeometry(1, 1);
    const mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uAtmCol: { value: srgb("#123c4a") } },
    });
    const mesh = new InstancedMesh(geo, mat, specs.length);
    const tints = new Float32Array(specs.length * 3);
    const kindSeed = new Float32Array(specs.length * 2);
    const bends = new Float32Array(specs.length * 4);
    const m = new Matrix4();
    const c = new Color();
    specs.forEach((s, i) => {
      m.makeScale(s.size, s.size, 1).setPosition(s.position);
      mesh.setMatrixAt(i, m);
      c.copy(srgb(s.tint));
      tints[i * 3] = c.r;
      tints[i * 3 + 1] = c.g;
      tints[i * 3 + 2] = c.b;
      kindSeed[i * 2] = s.kind;
      kindSeed[i * 2 + 1] = (s.seed % 100) / 7.3;
    });
    geo.setAttribute("iTint", new InstancedBufferAttribute(tints, 3));
    geo.setAttribute("iKindSeed", new InstancedBufferAttribute(kindSeed, 2));
    this.bendAttr = new InstancedBufferAttribute(bends, 4);
    this.bendAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("iBend", this.bendAttr);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    this.mesh = mesh;
  }

  /** Copy this frame's bend state from the sim output. */
  syncBends(simOutput: Float32Array): void {
    const arr = this.bendAttr.array as Float32Array;
    for (let i = 0; i < this.simIndices.length; i++) {
      const src = this.simIndices[i] * 4;
      arr[i * 4] = simOutput[src];
      arr[i * 4 + 1] = simOutput[src + 1];
      arr[i * 4 + 2] = simOutput[src + 2];
      arr[i * 4 + 3] = simOutput[src + 3];
    }
    this.bendAttr.needsUpdate = true;
  }
}
