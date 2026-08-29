/**
 * Application shell: renderer bootstrap, the locked photographic camera,
 * responsive framing, simulation loop, deterministic capture mode,
 * reduced-motion support.
 */
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { cameraConfig } from "../config/cameraConfig";
import { pickInitialTier, type QualityTier } from "../config/quality";
import { MeadowScene } from "../scene/MeadowScene";
import { createPostChain, type PostChain } from "../scene/postprocessing/composer";
import { PlantSim } from "../scene/wind/PlantSim";
import { WindField } from "../scene/wind/WindField";

const DEG = Math.PI / 180;

export interface AppOptions {
  container: HTMLElement;
}

export class App {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly wind: WindField;
  readonly sim: PlantSim;
  readonly meadow: MeadowScene;
  readonly post: PostChain;
  readonly quality: QualityTier;

  /** Deterministic mode: freeze at a fixed sim time for screenshots/tests. */
  private fixedTime: number | null = null;
  private reducedMotion = false;
  private lastNow = 0;

  constructor(opts: AppOptions) {
    const params = new URLSearchParams(location.search);
    this.quality = pickInitialTier();

    if (params.get("det") === "1") {
      this.fixedTime = Number(params.get("t") ?? "6");
    }

    this.renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    opts.container.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(cameraConfig.fovY, 1, cameraConfig.near, cameraConfig.far);
    this.camera.position.set(0, cameraConfig.height, 0);
    // THE CAMERA IS LOCKED. It does not orbit, drift, sway or follow the
    // pointer. The photograph's point of view is authoritative.

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const windSeed = Number(params.get("seed") ?? "1337");
    this.wind = new WindField({
      seed: windSeed,
      intensity: this.reducedMotion ? 0.12 : 1,
    });
    this.sim = new PlantSim(this.wind, 2048);
    this.meadow = new MeadowScene(this.scene, this.sim, this.quality);
    this.post = createPostChain(this.renderer, this.scene, this.camera, {
      dofResolutionScale: this.quality.dofResolutionScale,
    });

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());

    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", (e) => {
        this.reducedMotion = e.matches;
        this.wind.intensity = e.matches ? 0.12 : 1;
      });

    if (this.fixedTime !== null) {
      this.sim.advanceTo(this.fixedTime);
      this.meadow.syncToGpu(this.fixedTime);
      this.renderFrame();
      // static frame; re-render only on resize
      window.addEventListener("resize", () => {
        this.meadow.syncToGpu(this.fixedTime!);
        this.renderFrame();
      });
      // expose a hook so tests can advance time deterministically
      (window as unknown as Record<string, unknown>).__advanceTo = (t: number) => {
        this.sim.advanceTo(t);
        this.meadow.syncToGpu(t);
        this.renderFrame();
      };
    } else {
      this.lastNow = performance.now();
      this.renderer.setAnimationLoop(() => this.tick());
    }

    (window as unknown as Record<string, unknown>).__papsukkalReady = true;
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__app = this;
    }
  }

  /**
   * Responsive framing: composition is authored at the reference aspect.
   * On narrower viewports we widen the vertical FOV just enough to keep the
   * hero cluster's horizontal extent in frame, and bias the view slightly
   * left of center so the principal cosmos remains the anchor.
   */
  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.camera.aspect = aspect;

    // horizontal half-extent (m) that must stay visible at the focus plane
    const mustSee = 0.30;
    const focus = cameraConfig.focusDistance;
    const baseHalfH = focus * Math.tan((cameraConfig.fovY / 2) * DEG);
    const halfW = baseHalfH * aspect;
    if (halfW < mustSee) {
      const neededHalfH = mustSee / aspect;
      this.camera.fov = (2 * Math.atan(neededHalfH / focus)) / DEG;
    } else {
      this.camera.fov = cameraConfig.fovY;
    }
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastNow) / 1000, 0.25);
    this.lastNow = now;
    this.sim.update(dt);
    this.meadow.syncToGpu(this.sim.time);
    this.renderFrame();
  }

  private renderFrame(): void {
    this.post.composer.render();
  }
}
