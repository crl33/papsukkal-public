/**
 * V2 application shell: the reference photograph as layered, breeze-driven
 * meshes. Orthographic camera in image space with cover-fit framing (the
 * photographic composition is locked — no orbit, no parallax, no drift).
 *
 * Wind controls motion only; appearance is the photograph. With
 * ?wind=0 the composite is the static baseline and must look essentially
 * identical to the reference (spec §5/§20 — enforced by the e2e fidelity
 * test).
 */
import {
  NoColorSpace,
  NoToneMapping,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from "three";
import { IMG_ASPECT, layers, WIND_SEED } from "../config/layers";
import { LayerMesh } from "../layers/LayerMesh";
import { MECHANICS, PlantSim } from "../wind/PlantSim";
import { WindField } from "../wind/WindField";

export class App {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  readonly wind: WindField;
  readonly sim: PlantSim;
  readonly layerMeshes: LayerMesh[] = [];

  private simIndices = new Map<string, number>();
  private fixedTime: number | null = null;
  private lastNow = 0;

  constructor(container: HTMLElement, onReady: () => void) {
    const params = new URLSearchParams(location.search);
    if (params.get("det") === "1") this.fixedTime = Number(params.get("t") ?? "6");

    const windParam = params.get("wind");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intensity = windParam !== null ? Number(windParam) : reduced ? 0.12 : 1;

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, 1, 0, -1, -10, 10);
    this.camera.position.z = 1;

    this.wind = new WindField({ seed: WIND_SEED, intensity });
    this.sim = new PlantSim(this.wind, 64);

    const loader = new TextureLoader();
    let pending = layers.length;
    for (const def of layers) {
      loader.load(`${import.meta.env.BASE_URL}${def.file}`, (tex: Texture) => {
        // deliberate passthrough: no color-space decode anywhere. The custom
        // fragment shader does no lighting math, so leaving the texture
        // undecoded means the photograph's sRGB bytes reach the canvas
        // bit-faithfully (an SRGB-decoding texture + raw ShaderMaterial
        // output would display double-dark).
        tex.colorSpace = NoColorSpace;
        const lm = new LayerMesh(def, tex);
        this.layerMeshes.push(lm);
        this.scene.add(lm.mesh);
        if (def.rig) {
          const mech = MECHANICS[def.rig.mechanics] ?? MECHANICS.cosmosHero;
          const [wx, wz, height] = def.rig.windPos;
          this.simIndices.set(def.id, this.sim.addPlant(wx, wz, height, mech, 7000 + def.order));
        }
        if (--pending === 0) this.start(onReady);
      });
    }

    this.handleResize();
    window.addEventListener("resize", () => {
      this.handleResize();
      if (this.fixedTime !== null) this.renderFrame();
    });

    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", (e) => {
        if (windParam === null) this.wind.intensity = e.matches ? 0.12 : 1;
      });
  }

  private start(onReady: () => void): void {
    // painter's order — sort meshes by manifest order
    this.layerMeshes.sort((a, b) => a.def.order - b.def.order);

    if (this.fixedTime !== null) {
      this.sim.advanceTo(this.fixedTime);
      this.syncBends();
      this.renderFrame();
      (window as unknown as Record<string, unknown>).__advanceTo = (t: number) => {
        this.sim.advanceTo(t);
        this.syncBends();
        this.renderFrame();
      };
    } else {
      this.lastNow = performance.now();
      this.renderer.setAnimationLoop(() => this.tick());
    }
    onReady();
  }

  /**
   * Cover-fit: show a centered sub-rect of the image that fills the
   * viewport at the image's native pixel aspect (CSS object-fit: cover
   * semantics, so the dev overlay <img> aligns exactly).
   */
  private handleResize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.renderer.setSize(vw, vh);
    const vpAspect = vw / vh;
    let w = 1;
    let h = 1;
    if (vpAspect > IMG_ASPECT) {
      h = IMG_ASPECT / vpAspect; // wider viewport: crop top/bottom
    } else {
      w = vpAspect / IMG_ASPECT; // taller viewport: crop left/right
    }
    this.camera.left = 0.5 - w / 2;
    this.camera.right = 0.5 + w / 2;
    this.camera.top = -(0.5 - h / 2);
    this.camera.bottom = -(0.5 + h / 2);
    this.camera.updateProjectionMatrix();
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastNow) / 1000, 0.25);
    this.lastNow = now;
    this.sim.update(dt);
    this.syncBends();
    this.renderFrame();
  }

  private syncBends(): void {
    for (const lm of this.layerMeshes) {
      const idx = this.simIndices.get(lm.def.id);
      if (idx === undefined) continue;
      const o = idx * 4;
      lm.setBend(this.sim.output[o], this.sim.output[o + 1]);
    }
  }

  renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
