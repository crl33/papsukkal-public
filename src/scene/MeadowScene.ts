/**
 * Assembles the meadow: art-directed hero plants (individual meshes with
 * their own oscillator state as uniforms), instanced filler vegetation,
 * background bokeh impostors, environment. All motion state flows from the
 * single shared PlantSim / WindField.
 */
import { Color, Mesh, Scene, ShaderMaterial, Vector3 } from "three";
import {
  allPlacements,
  SCATTER_SEED,
  type Placement,
} from "../config/composition";
import { frameWidthAt, placeFromScreen } from "../config/cameraConfig";
import { palette } from "../config/palette";
import { createRng } from "../utils/prng";
import {
  buildCosmos,
  buildDaisy,
  buildBud,
  buildMaroonBloom,
  buildMicroSprig,
  buildForegroundMass,
  buildMidFlowerHead,
  buildFoliageTuft,
  type PlantBuild,
} from "./flowers/species";
import { createVegetationMaterial, srgb } from "./shaders/vegetationMaterial";
import { BokehSprites, type SpriteSpec } from "./vegetation/BokehSprites";
import { InstancedPlants } from "./vegetation/InstancedPlants";
import { addEnvironment } from "./environment";
import { MECHANICS, type Mechanics, PlantSim } from "./wind/PlantSim";
import { addStem } from "./flowers/species";
import { GeomBuilder } from "./flowers/GeomBuilder";
import type { QualityTier } from "../config/quality";

interface HeroEntry {
  material: ShaderMaterial;
  simIdx: number;
}

function mechanicsFor(p: Placement): Mechanics {
  switch (p.species) {
    case "cosmos":
      return MECHANICS.cosmosHero;
    case "daisyWhite":
      return MECHANICS.daisySmall;
    case "daisyOrange":
      return MECHANICS.daisyOrange;
    case "redCluster":
    case "blueMicro":
    case "violetMicro":
      return MECHANICS.microSprig;
    case "budTeal":
      return MECHANICS.bud;
    case "bloomMaroon":
      return MECHANICS.heavyBloom;
    case "softBokeh":
      return p.focusRole === "foreground" ? MECHANICS.foregroundMass : MECHANICS.backgroundStalk;
    case "poppyBokeh":
      return MECHANICS.backgroundStalk;
  }
}

export class MeadowScene {
  private heroes: HeroEntry[] = [];
  private instanced: InstancedPlants[] = [];
  private sprites: BokehSprites | null = null;

  constructor(
    readonly scene: Scene,
    readonly sim: PlantSim,
    quality: QualityTier,
  ) {
    addEnvironment(scene);

    const spriteSpecs: SpriteSpec[] = [];
    const spriteSimIndices: number[] = [];

    for (const p of allPlacements) {
      const [x, headY, z] = placeFromScreen(p.screen[0], p.screen[1], p.depth);
      const size = p.sizeFrac * frameWidthAt(p.depth);

      // background impostors go to the sprite sheet, everything else is geometry
      if (p.focusRole === "background" && (p.species === "softBokeh" || p.species === "poppyBokeh")) {
        spriteSpecs.push({
          position: new Vector3(x, headY, z),
          size,
          tint: p.tint ?? palette.red,
          kind: p.species === "poppyBokeh" ? 1 : 0,
          seed: p.seed,
        });
        spriteSimIndices.push(this.sim.addPlant(x, z, Math.max(headY, 0.3), mechanicsFor(p), p.seed));
        continue;
      }

      const build = this.buildPlacement(p, headY, size, quality);
      if (!build) continue;

      const micro = p.species === "redCluster" || p.species === "blueMicro" || p.species === "violetMicro";
      const material = createVegetationMaterial({
        headPivotY: build.headPivotY,
        sss: micro ? 0.25 : 0.65,
      });
      const mesh = new Mesh(build.builder.build(), material);
      mesh.position.set(x, 0, z);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const simIdx = this.sim.addPlant(x, z, Math.max(headY, 0.2), mechanicsFor(p), p.seed);
      this.heroes.push({ material, simIdx });
    }

    this.sprites = new BokehSprites(spriteSpecs);
    this.sprites.simIndices = spriteSimIndices;
    scene.add(this.sprites.mesh);

    this.addFillerVegetation(quality);
  }

  private buildPlacement(p: Placement, headY: number, size: number, quality: QualityTier): PlantBuild | null {
    const facing = p.facing ?? [14, 0, 0];
    const detail = p.focusRole === "hero" ? quality.heroDetail : 0.6;
    switch (p.species) {
      case "cosmos":
        return buildCosmos(p.seed, headY, size, facing, detail);
      case "daisyWhite":
        return buildDaisy(p.seed, headY, size, facing, "white");
      case "daisyOrange":
        return buildDaisy(p.seed, headY, size, facing, p.tint === palette.yellow ? "yellow" : "orange");
      case "budTeal":
        return buildBud(p.seed, headY, size, p.tint);
      case "bloomMaroon":
        return buildMaroonBloom(p.seed, headY, size, facing);
      case "redCluster":
        return buildMicroSprig(p.seed, headY, size, "red");
      case "blueMicro":
        return buildMicroSprig(p.seed, headY, size, "blue");
      case "violetMicro":
        return buildMicroSprig(p.seed, headY, size, "violet");
      case "softBokeh":
        // foreground mass — real geometry, extreme defocus does the painting
        return buildForegroundMass(p.seed, headY, size, p.tint ?? palette.crimson);
      case "poppyBokeh":
        return null;
    }
  }

  /** Wiry teal stems + occasional leaves filling the midground band. */
  private addFillerVegetation(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED);
    const count = Math.floor(120 * quality.vegetationDensity);
    const instances = [];
    const stemCols = [palette.stemCyan, palette.foliageTeal, palette.foliageTealMid, palette.foliageTealDark];
    for (let i = 0; i < count; i++) {
      const z = -rng.range(1.0, 2.8);
      const x = rng.range(-1.15, 1.15) * (0.35 + (-z) * 0.42);
      const scale = rng.range(0.25, 0.72);
      instances.push({
        position: new Vector3(x, 0, z),
        scale,
        yaw: rng.range(0, Math.PI * 2),
        tilt: rng.range(0, 0.22),
        tint: new Color(srgb(rng.pick(stemCols))).multiplyScalar(rng.range(0.32, 0.68)),
      });
    }
    const build = buildFillerStem();
    const sys = new InstancedPlants(build, instances, this.sim, MECHANICS.microSprig, 1.0, 900000);
    this.scene.add(sys.mesh);
    this.instanced.push(sys);

    this.addMidFlowers(quality);
    this.addFoliageTufts(quality);
  }

  /** Soft colored blooms at 1.8–3.8m — the reference's deep botanical density. */
  private addMidFlowers(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED ^ 0x55aa);
    const count = Math.floor(75 * quality.vegetationDensity);
    const tintPool = [
      palette.red, palette.red, palette.crimson, palette.crimson,
      palette.magenta, palette.magenta, palette.magentaHi,
      palette.orange, palette.orange, palette.yellow,
      palette.violet, palette.cobalt, palette.white,
    ];
    // keep-clear discs around the hero focal subjects (screen x, y, radius)
    const keepClear: [number, number, number][] = [
      [0.25, 0.30, 0.14],
      [0.47, 0.375, 0.10],
      [0.54, 0.335, 0.07],
      [0.83, 0.27, 0.09],
      [0.42, 0.20, 0.09],
    ];
    const instances = [];
    let attempts = 0;
    while (instances.length < count && attempts++ < count * 8) {
      const z = -rng.range(2.35, 4.0);
      const x = rng.range(-1.15, 1.15) * (0.32 + (-z) * 0.36);
      const scale = rng.range(0.3, 0.74);
      // project the head to reference-screen space and respect exclusions
      const hh = (-z) * Math.tan((11 * Math.PI) / 180);
      const sx = (x / (hh * 1.51)) * 0.5 + 0.5;
      const sy = 0.5 - (scale - 0.52) / (2 * hh);
      if (keepClear.some(([cx, cy, r]) => (sx - cx) ** 2 + (sy - cy) ** 2 < r * r)) continue;
      instances.push({
        position: new Vector3(x, 0, z),
        scale,
        yaw: rng.range(0, Math.PI * 2),
        tilt: rng.range(0, 0.25),
        tint: new Color(srgb(rng.pick(tintPool))).multiplyScalar(rng.range(0.55, 1.0)),
      });
    }
    const sys = new InstancedPlants(buildMidFlowerHead(4242), instances, this.sim, MECHANICS.backgroundStalk, 1.0, 910000);
    this.scene.add(sys.mesh);
    this.instanced.push(sys);
  }

  /** Dark leafy tufts along the meadow floor, close to the focus band. */
  private addFoliageTufts(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED ^ 0x1234);
    const count = Math.floor(70 * quality.vegetationDensity);
    const instances = [];
    for (let i = 0; i < count; i++) {
      const z = -rng.range(0.9, 2.0);
      const x = rng.range(-1.2, 1.2) * (0.3 + (-z) * 0.4);
      instances.push({
        position: new Vector3(x, 0, z),
        scale: rng.range(0.5, 1.4),
        yaw: rng.range(0, Math.PI * 2),
        tint: new Color(1, 1, 1).multiplyScalar(rng.range(0.5, 1.0)),
      });
    }
    const sys = new InstancedPlants(buildFoliageTuft(5151), instances, this.sim, MECHANICS.microSprig, 0.35, 920000);
    this.scene.add(sys.mesh);
    this.instanced.push(sys);
  }

  /** Push this frame's simulation state into GPU uniforms/attributes. */
  syncToGpu(time: number): void {
    const out = this.sim.output;
    for (const h of this.heroes) {
      const o = h.simIdx * 4;
      const u = h.material.uniforms;
      u.uBend.value.set(out[o], out[o + 1], out[o + 2], out[o + 3]);
      u.uGust.value = this.sim.gustOut[h.simIdx];
      u.uTime.value = time;
    }
    for (const sys of this.instanced) sys.sync(this.sim, time);
    this.sprites?.syncBends(out);
  }
}

/** A 1m wiry stem with a couple of leaf filaments — the unit filler plant. */
function buildFillerStem(): PlantBuild {
  const rng = createRng(777);
  const b = new GeomBuilder();
  addStem(b, 1.0, 0.002, rng, { bow: 0.06, flutterTop: 0.2, radial: 4, segs: 6 });
  return { builder: b, headPivotY: 1.0 };
}
