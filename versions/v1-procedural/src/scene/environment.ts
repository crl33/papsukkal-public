/**
 * Atmosphere: a backdrop far behind the meadow plus a dark ground.
 * The backdrop paints its gradient + color blobs in WORLD coordinates
 * (shader), so any viewport framing — including tall portrait FOVs — sees a
 * consistent, correctly-anchored atmosphere. DOF consumes all fine detail;
 * this only needs to deliver the reference's color wash: deep navy-teal, a
 * cyan "sky gap" upper center-right, warm murmurs, dark corners.
 */
import {
  CanvasTexture,
  Color,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
} from "three";
import { halfHeightAt, cameraConfig } from "../config/cameraConfig";
import { createRng } from "../utils/prng";
import { srgb } from "./shaders/vegetationMaterial";

const BACKDROP_FRAG = /* glsl */ `
  varying vec3 vWorld;

  vec3 blob(vec3 base, vec2 center, float radius, vec3 col, float amt) {
    float d = distance(vWorld.xy, center);
    float w = smoothstep(radius, 0.0, d);
    return mix(base, col, w * amt);
  }

  void main() {
    // vertical wash — muted teal-navy sinking to near-black soil line
    float t = clamp((vWorld.y + 2.0) / 9.0, 0.0, 1.0);
    vec3 c = mix(vec3(0.003, 0.018, 0.032), vec3(0.011, 0.045, 0.065), smoothstep(0.1, 0.85, t));

    // cyan sky-gap bokeh patch, top center-right (world coords at z=-11)
    c = blob(c, vec2(0.55, 2.45), 1.0, vec3(0.10, 0.42, 0.58), 0.7);
    c = blob(c, vec2(1.25, 2.7), 0.8, vec3(0.07, 0.30, 0.44), 0.55);
    c = blob(c, vec2(-0.15, 2.25), 0.65, vec3(0.05, 0.22, 0.34), 0.4);
    // faint warm murmur upper-left in the deep field
    c = blob(c, vec2(-2.6, 2.3), 1.3, vec3(0.10, 0.02, 0.045), 0.7);
    c = blob(c, vec2(-3.2, 2.8), 1.0, vec3(0.115, 0.02, 0.04), 0.55);
    // soft red field glow, mid-left and right
    c = blob(c, vec2(-2.2, 0.9), 1.2, vec3(0.10, 0.012, 0.03), 0.4);
    c = blob(c, vec2(2.9, 1.2), 1.4, vec3(0.09, 0.02, 0.028), 0.35);

    gl_FragColor = vec4(c, 1.0);
  }
`;

const BACKDROP_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function paintGround(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#07161f";
  g.fillRect(0, 0, 256, 256);
  const rng = createRng(42);
  for (let i = 0; i < 700; i++) {
    const x = rng.next() * 256;
    const y = rng.next() * 256;
    const r = rng.range(2, 9);
    const shade = rng.next();
    g.fillStyle =
      shade > 0.8
        ? `rgba(24, 62, 66, ${rng.range(0.1, 0.3)})`
        : `rgba(${4 + shade * 10}, ${14 + shade * 16}, ${20 + shade * 14}, 0.5)`;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, rng.next() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function addEnvironment(scene: Scene): void {
  scene.background = new Color(srgb("#081d2a"));

  const backdropZ = 11;
  const hh = halfHeightAt(backdropZ) * 4;
  const backdrop = new Mesh(
    new PlaneGeometry(hh * 2 * cameraConfig.refAspect * 1.6, hh * 2),
    new ShaderMaterial({ vertexShader: BACKDROP_VERT, fragmentShader: BACKDROP_FRAG }),
  );
  backdrop.position.set(0, cameraConfig.height, -backdropZ);
  scene.add(backdrop);

  const ground = new Mesh(new PlaneGeometry(24, 24), new MeshBasicMaterial({ map: paintGround() }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -8);
  scene.add(ground);
}
