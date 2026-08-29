/**
 * Instanced secondary vegetation: one procedural plant geometry, many
 * transforms, each instance registered as its own plant in the PlantSim so
 * it has individual mechanics (frequency, damping, phase) while sharing the
 * spatial wind field with everything else.
 */
import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
  Texture,
  Vector3,
} from "three";
import type { PlantBuild } from "../flowers/species";
import { createVegetationMaterial } from "../shaders/vegetationMaterial";
import type { PlantSim, Mechanics } from "../wind/PlantSim";

export interface PlantInstance {
  position: Vector3;
  scale: number;
  yaw: number;
  /** Whole-plant lean (radians) — rest posture, rotated about the root. */
  tilt?: number;
  /** Lean about the Z axis — breaks parallel alignment. */
  tiltZ?: number;
  tint: Color;
}

const _m = new Matrix4();
const _mTilt = new Matrix4();

export class InstancedPlants {
  readonly mesh: InstancedMesh;
  readonly material: ShaderMaterial;
  private bendAttr: InstancedBufferAttribute;
  private gustAttr: InstancedBufferAttribute;
  private simIndices: number[] = [];

  constructor(
    build: PlantBuild,
    instances: PlantInstance[],
    sim: PlantSim,
    mech: Mechanics,
    heightScaleBase: number,
    seedBase: number,
    map?: Texture,
  ) {
    const geo = build.builder.build();
    this.material = createVegetationMaterial({ instanced: true, headPivotY: build.headPivotY, map });
    const mesh = new InstancedMesh(geo, this.material, instances.length);

    const tints = new Float32Array(instances.length * 3);
    const bends = new Float32Array(instances.length * 4);
    const gusts = new Float32Array(instances.length);

    instances.forEach((inst, i) => {
      _m.makeRotationY(inst.yaw).scale(new Vector3(inst.scale, inst.scale, inst.scale));
      if (inst.tilt) {
        // lean about BOTH horizontal axes (yaw-rotated) so instanced stems
        // never line up into a picket fence
        _mTilt.makeRotationX(inst.tilt);
        _m.premultiply(_mTilt);
        _mTilt.makeRotationZ((inst.tiltZ ?? 0));
        _m.premultiply(_mTilt);
      }
      _m.setPosition(inst.position);
      mesh.setMatrixAt(i, _m);
      tints[i * 3] = inst.tint.r;
      tints[i * 3 + 1] = inst.tint.g;
      tints[i * 3 + 2] = inst.tint.b;
      this.simIndices.push(
        sim.addPlant(inst.position.x, inst.position.z, heightScaleBase * inst.scale, mech, seedBase + i * 7919),
      );
    });

    geo.setAttribute("iTint", new InstancedBufferAttribute(tints, 3));
    this.bendAttr = new InstancedBufferAttribute(bends, 4);
    this.bendAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("iBend", this.bendAttr);
    this.gustAttr = new InstancedBufferAttribute(gusts, 1);
    this.gustAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("iGust", this.gustAttr);

    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    this.mesh = mesh;
  }

  sync(sim: PlantSim, time: number): void {
    const bends = this.bendAttr.array as Float32Array;
    const gusts = this.gustAttr.array as Float32Array;
    for (let i = 0; i < this.simIndices.length; i++) {
      const src = this.simIndices[i] * 4;
      bends[i * 4] = sim.output[src];
      bends[i * 4 + 1] = sim.output[src + 1];
      bends[i * 4 + 2] = sim.output[src + 2];
      bends[i * 4 + 3] = sim.output[src + 3];
      gusts[i] = sim.gustOut[this.simIndices[i]];
    }
    this.bendAttr.needsUpdate = true;
    this.gustAttr.needsUpdate = true;
    this.material.uniforms.uTime.value = time;
  }
}
