/**
 * A photograph layer as a deformable mesh: a subdivided plane covering the
 * layer's crop rect in image space, textured with its RGBA plate. Static
 * layers use a single quad; rigged layers get a dense grid for smooth
 * vertex-shader bending.
 */
import { Mesh, PlaneGeometry, ShaderMaterial, Texture } from "three";
import { createLayerMaterial } from "../shaders/layerMaterial";
import type { LayerDef } from "../config/layers";

export class LayerMesh {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  readonly def: LayerDef;

  constructor(def: LayerDef, tex: Texture) {
    this.def = def;
    const [x, y, w, h] = def.rect;
    const rigged = !!def.rig;
    const segX = rigged ? Math.max(24, Math.round(w * 260)) : 1;
    const segY = rigged ? Math.max(24, Math.round(h * 260)) : 1;

    const geo = new PlaneGeometry(w, h, segX, segY);
    // plane is centered at origin, y-up; place it in image space (y-down)
    geo.translate(x + w / 2, -(y + h / 2), 0);

    this.material = createLayerMaterial(tex, def.id === "plate");
    if (def.rig) {
      const u = this.material.uniforms;
      u.uRoot.value.set(def.rig.root[0], def.rig.root[1]);
      u.uHead.value.set(def.rig.head[0], def.rig.head[1]);
      u.uHeadR.value = def.rig.headRadius;
    }

    this.mesh = new Mesh(geo, this.material);
    this.mesh.renderOrder = def.order;
    this.mesh.frustumCulled = false;
  }

  /** Absolute displacement ceiling (image units). The plate reconstruction
   * margin (MOTION_MARGIN_PX in tools/prepare-assets.mjs) must exceed the
   * pixel equivalent of this — a sway may only ever reveal reconstructed
   * background, never leftover flower. 0.013 img ≈ 16px. */
  static readonly MAX_BEND_IMG = 0.01;
  static readonly MAX_ROT = 0.05;

  /** Push this frame's simulated deflection (meters) + head-lag rotation
   * (radians, from the V1 secondary oscillator) into the shader. */
  setBend(bendX: number, bendZ: number, headLagRot = 0): void {
    const rig = this.def.rig;
    if (!rig) return;
    const u = this.material.uniforms;
    // horizontal sway from bendX; a whisper of vertical from bendZ (depth
    // deflection reads as slight rise/dip at this camera angle)
    let bx = bendX * rig.bendScale;
    let by = -bendZ * rig.bendScale * 0.22;
    // soft displacement clamp (tanh-style): strong gusts saturate gracefully
    const cap = LayerMesh.MAX_BEND_IMG;
    const len = Math.hypot(bx, by);
    if (len > 1e-9) {
      const soft = cap * Math.tanh(len / cap);
      bx = (bx / len) * soft;
      by = (by / len) * soft;
    }
    u.uBend.value.set(bx, by);
    // head follow-through: the simulated lag oscillator drives rotation, so
    // the head visibly trails and settles rather than tilting statically
    const rot = headLagRot * rig.rotGain * 4;
    u.uRot.value = LayerMesh.MAX_ROT * Math.tanh(rot / LayerMesh.MAX_ROT);
  }

  /** Test/debug override: set displacement directly (image units). */
  forceBend(bx: number, by: number, rot = 0): void {
    this.material.uniforms.uBend.value.set(bx, by);
    this.material.uniforms.uRot.value = rot;
  }
}
