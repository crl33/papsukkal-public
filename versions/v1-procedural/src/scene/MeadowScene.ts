/**
 * Assembles the meadow: art-directed hero plants (individual meshes with
 * their own oscillator state as uniforms), instanced filler vegetation,
 * background bokeh impostors, environment. All motion state flows from the
 * single shared PlantSim / WindField.
 */
import { Color, Mesh, Scene, ShaderMaterial, Vector3 } from "three";
import {
  allPlacements,
  bgField,
  featherZones,
  SCATTER_SEED,
  tangleZones,
  type Placement,
  type ScatterZone,
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
  buildWiryStem,
  buildFeatherClump,
  type PlantBuild,
} from "./flowers/species";
import type { Rng } from "../utils/prng";
import { createVegetationMaterial, srgb } from "./shaders/vegetationMaterial";
import { BokehSprites, type SpriteSpec } from "./vegetation/BokehSprites";
import { InstancedPlants } from "./vegetation/InstancedPlants";
import { addEnvironment } from "./environment";
import { MECHANICS, type Mechanics, PlantSim } from "./wind/PlantSim";
import { getPetalAtlas, type AtlasSpecies } from "./flowers/petalTextures";
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

/** Which painted petal atlas a placement's species uses (none = untextured). */
function atlasFor(p: Placement): AtlasSpecies | null {
  switch (p.species) {
    case "cosmos":
      return p.tint === palette.violet ? "cosmosViolet" : "cosmosMagenta";
    case "daisyWhite":
      return "daisyWhite";
    case "daisyOrange":
      return p.tint === palette.yellow ? "daisyYellow" : "daisyOrange";
    case "bloomMaroon":
      return "maroonRuffle";
    case "softBokeh":
      return p.focusRole === "foreground" ? "softNeutral" : null;
    default:
      return null;
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
      const atlas = atlasFor(p);
      const material = createVegetationMaterial({
        headPivotY: build.headPivotY,
        sss: micro ? 0.25 : 0.65,
        map: atlas ? getPetalAtlas(atlas).texture : undefined,
      });
      const mesh = new Mesh(build.builder.build(), material);
      mesh.position.set(x, 0, z);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const simIdx = this.sim.addPlant(x, z, Math.max(headY, 0.2), mechanicsFor(p), p.seed);
      this.heroes.push({ material, simIdx });
    }

    // background flower field — clusters of defocused blooms generated from
    // the reference's density map (composition.bgField)
    this.addBgField(spriteSpecs, spriteSimIndices, quality);

    this.sprites = new BokehSprites(spriteSpecs);
    this.sprites.simIndices = spriteSimIndices;
    scene.add(this.sprites.mesh);

    this.addFillerVegetation(quality);
  }

  /** Weighted zone pick + gaussian point inside — the density-map sampler. */
  private sampleZone(rng: Rng, zones: ScatterZone[]): [number, number] {
    let total = 0;
    for (const z of zones) total += z.w * z.rx * z.ry;
    let r = rng.next() * total;
    let zone = zones[zones.length - 1];
    for (const z of zones) {
      r -= z.w * z.rx * z.ry;
      if (r <= 0) {
        zone = z;
        break;
      }
    }
    const nx = Math.min(1, Math.max(0, zone.cx + rng.gauss() * zone.rx * 0.75));
    const ny = Math.min(1, Math.max(0, zone.cy + rng.gauss() * zone.ry * 0.75));
    return [nx, ny];
  }

  private addBgField(specs: SpriteSpec[], simIndices: number[], quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED ^ 0x77ee);
    for (const cluster of bgField) {
      const count = Math.max(2, Math.round(cluster.count * (0.5 + 0.5 * quality.vegetationDensity)));
      for (let i = 0; i < count; i++) {
        const [nx, ny] = this.sampleZone(rng, [cluster.zone]);
        const depth = rng.range(cluster.depth[0], cluster.depth[1]);
        const [x, y, z] = placeFromScreen(nx, ny, depth);
        const size = rng.range(cluster.sizeFrac[0], cluster.sizeFrac[1]) * frameWidthAt(depth);
        specs.push({
          position: new Vector3(x, Math.max(y, 0.15), z),
          size,
          tint: rng.pick(cluster.colors),
          kind: rng.pick(cluster.kinds),
          seed: rng.int(0, 9999),
        });
        simIndices.push(
          this.sim.addPlant(x, z, Math.max(y, 0.3), MECHANICS.backgroundStalk, 800000 + specs.length),
        );
      }
    }
  }

  private buildPlacement(p: Placement, headY: number, size: number, quality: QualityTier): PlantBuild | null {
    const facing = p.facing ?? [14, 0, 0];
    const detail = p.focusRole === "hero" ? quality.heroDetail : 0.6;
    switch (p.species) {
      case "cosmos":
        return buildCosmos(p.seed, headY, size, facing, detail, p.tint === palette.violet ? "violet" : "magenta");
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

  /**
   * The tangle: wiry curved/branching stems and feathery foliage clumps,
   * scattered by the reference's density map rather than uniformly. Heads
   * are placed in screen space (where the reference has them) and projected
   * to continuous depths through the locked camera.
   */
  private addFillerVegetation(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED);

    // wiry stems: several geometry variants, zone-driven
    const stemVariants = [
      buildWiryStem(9001), buildWiryStem(9002), buildWiryStem(9003), buildWiryStem(9004),
      buildWiryStem(9005), buildWiryStem(9006), buildWiryStem(9007),
    ];
    const perVariant = Math.floor(23 * quality.vegetationDensity);
    stemVariants.forEach((variant, vi) => {
      const instances = [];
      let guard = 0;
      while (instances.length < perVariant && guard++ < perVariant * 10) {
        const [nx, ny] = this.sampleZone(rng, tangleZones);
        if (ny > 0.88) continue; // the frame's bottom edge is sealed by defocused masses
        const depth = 0.95 + 1.85 * rng.next() ** 1.15; // continuous, biased near focus
        const [x, yTop, z] = placeFromScreen(nx, ny, depth);
        if (yTop < 0.14 || yTop > 1.05) continue;
        instances.push({
          position: new Vector3(x, 0, z),
          // partial stems: shorter than the sampled head height so they read
          // as fragments in a tangle, not full-height rods
          scale: yTop * (0.4 + 0.35 * rng.next()),
          yaw: rng.range(0, Math.PI * 2),
          tilt: rng.range(-0.16, 0.3),
          tiltZ: rng.gauss() * 0.16,
          tint: new Color(1, 1, 1).multiplyScalar(rng.range(0.45, 1.0)),
        });
      }
      const sys = new InstancedPlants(variant, instances, this.sim, MECHANICS.microSprig, 1.0, 900000 + vi * 1000);
      this.scene.add(sys.mesh);
      this.instanced.push(sys);
    });

    // feathery filigree clumps near the focus band
    const featherVariants = [buildFeatherClump(9101), buildFeatherClump(9102)];
    const perFeather = Math.floor(40 * quality.vegetationDensity);
    featherVariants.forEach((variant, vi) => {
      const instances = [];
      let guard = 0;
      while (instances.length < perFeather && guard++ < perFeather * 10) {
        const [nx, ny] = this.sampleZone(rng, featherZones);
        const depth = rng.range(1.05, 1.9);
        const [x, yTop, z] = placeFromScreen(nx, ny, depth);
        if (yTop < 0.1 || yTop > 0.6) continue;
        instances.push({
          position: new Vector3(x, 0, z),
          scale: yTop / 0.5,
          yaw: rng.range(0, Math.PI * 2),
          tilt: rng.range(-0.14, 0.26),
          tiltZ: rng.gauss() * 0.14,
          tint: new Color(1, 1, 1).multiplyScalar(rng.range(0.42, 0.8)),
        });
      }
      const sys = new InstancedPlants(variant, instances, this.sim, MECHANICS.microSprig, 0.5, 905000 + vi * 1000);
      this.scene.add(sys.mesh);
      this.instanced.push(sys);
    });

    this.addMidFlowers(quality);
    this.addFoliageTufts(quality);
    this.addBackFoliage(quality);
  }

  /**
   * Defocused foliage mass filling 2.4–6 m. The reference has no visible
   * "ground": the space between sharp plants is more vegetation, softened by
   * distance. This replaces a flat lit plane with real botanical texture —
   * redistribution, not a denser meadow.
   */
  private addBackFoliage(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED ^ 0x3c3c);
    const count = Math.floor(150 * quality.vegetationDensity);
    const instances = [];
    for (let i = 0; i < count; i++) {
      const z = -rng.range(1.55, 3.1);
      const x = rng.range(-1.2, 1.2) * (0.3 + (-z) * 0.38);
      const [, yTop] = [0, rng.range(0.15, 1.15)];
      instances.push({
        // lifted into the lit band: this is mid-height foliage seen through
        // other plants, not litter on the soil
        position: new Vector3(x, rng.range(0.06, 0.34), z),
        scale: rng.range(2.0, 4.6),
        yaw: rng.range(0, Math.PI * 2),
        tilt: rng.range(-0.2, 0.35),
        tiltZ: rng.gauss() * 0.2,
        // sunlit, defocused: this mass IS the midground's luminosity in the
        // reference — and it is NOT uniformly teal. Warm olives and dusty
        // rose keep the band from reading as one green wash.
        // reference samples of the defocused midground are muted olive-sage
        // (~rgb 64,83,66), not saturated green
        tint: new Color(
          srgb(rng.pick(["#5f6d58", "#4e6154", "#6a7160", "#556b5c", "#7a7358", "#6b5a50"])),
        ).multiplyScalar(rng.range(10.0, 17.0) * (0.7 + 0.3 * yTop)),
      });
    }
    const sys = new InstancedPlants(buildFoliageTuft(6161), instances, this.sim, MECHANICS.backgroundStalk, 0.35, 930000);
    this.scene.add(sys.mesh);
    this.instanced.push(sys);
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
      const scale = rng.range(0.2, 0.5);
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
        tint: new Color(srgb(rng.pick(tintPool))).multiplyScalar(rng.range(0.42, 0.82)),
      });
    }
    const sys = new InstancedPlants(
      buildMidFlowerHead(4242),
      instances,
      this.sim,
      MECHANICS.backgroundStalk,
      1.0,
      910000,
      getPetalAtlas("softNeutral").texture,
    );
    this.scene.add(sys.mesh);
    this.instanced.push(sys);
  }

  /** Dark leafy tufts along the meadow floor, close to the focus band. */
  private addFoliageTufts(quality: QualityTier): void {
    const rng = createRng(SCATTER_SEED ^ 0x1234);
    const count = Math.floor(100 * quality.vegetationDensity);
    const instances = [];
    for (let i = 0; i < count; i++) {
      const z = -rng.range(0.9, 2.0);
      const x = rng.range(-1.2, 1.2) * (0.3 + (-z) * 0.4);
      instances.push({
        position: new Vector3(x, 0, z),
        scale: rng.range(0.3, 0.7),
        yaw: rng.range(0, Math.PI * 2),
        tint: new Color(1, 1, 1).multiplyScalar(rng.range(0.55, 1.0)),
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
