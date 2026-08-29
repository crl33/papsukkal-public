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

  /** Push this frame's simulated deflection (meters) into the shader. */
  setBend(bendX: number, bendZ: number): void {
    const rig = this.def.rig;
    if (!rig) return;
    const u = this.material.uniforms;
    // horizontal sway from bendX; a whisper of vertical from bendZ (depth
    // deflection reads as slight rise/dip at this camera angle)
    u.uBend.value.set(bendX * rig.bendScale, -bendZ * rig.bendScale * 0.22);
    u.uRot.value = bendX * rig.rotGain;
  }
}
