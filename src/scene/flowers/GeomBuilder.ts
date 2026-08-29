/**
 * Low-level indexed geometry accumulator for procedural plants.
 * Tracks the custom vegetation attributes alongside position/normal/uv:
 *   aData = (s along stem 0..1, isHead, flutterWeight, phase)
 *   aColor = albedo (linear)
 */
import { BufferAttribute, BufferGeometry, Color, Matrix3, Matrix4, Vector3 } from "three";

export interface VertexData {
  s: number;
  head: number;
  flutter: number;
  phase: number;
}

export class GeomBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private colors: number[] = [];
  private data: number[] = [];
  private indices: number[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  vertex(p: Vector3, n: Vector3, u: number, v: number, c: Color, d: VertexData): number {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.uvs.push(u, v);
    this.colors.push(c.r, c.g, c.b);
    this.data.push(d.s, d.head, d.flutter, d.phase);
    return this.vertexCount - 1;
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.indices.push(a, b, d, b, c, d);
  }

  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  /**
   * Add a parametric grid surface. fn(u, v) fills pos (and may fill normal;
   * if normal is left at 0 it is computed from the grid afterwards).
   */
  grid(
    nu: number,
    nv: number,
    fn: (u: number, v: number, pos: Vector3, normal: Vector3) => { color: Color; data: VertexData },
  ): void {
    const base = this.vertexCount;
    const p = new Vector3();
    const n = new Vector3();
    for (let iu = 0; iu <= nu; iu++) {
      for (let iv = 0; iv <= nv; iv++) {
        const u = iu / nu;
        const v = iv / nv;
        p.set(0, 0, 0);
        n.set(0, 0, 0);
        const { color, data } = fn(u, v, p, n);
        this.vertex(p, n, u, v, color, data);
      }
    }
    for (let iu = 0; iu < nu; iu++) {
      for (let iv = 0; iv < nv; iv++) {
        const a = base + iu * (nv + 1) + iv;
        const b = base + (iu + 1) * (nv + 1) + iv;
        this.quad(a, b, b + 1, a + 1);
      }
    }
    // grid normals via finite differences if fn left them zeroed
    this.computeGridNormals(base, nu, nv);
  }

  private computeGridNormals(base: number, nu: number, nv: number): void {
    const P = this.positions;
    const N = this.normals;
    const get = (iu: number, iv: number, out: Vector3) => {
      const i = (base + iu * (nv + 1) + iv) * 3;
      out.set(P[i], P[i + 1], P[i + 2]);
    };
    const du = new Vector3();
    const dv = new Vector3();
    const a = new Vector3();
    const b = new Vector3();
    const n = new Vector3();
    for (let iu = 0; iu <= nu; iu++) {
      for (let iv = 0; iv <= nv; iv++) {
        const idx = (base + iu * (nv + 1) + iv) * 3;
        if (N[idx] !== 0 || N[idx + 1] !== 0 || N[idx + 2] !== 0) continue;
        get(Math.min(iu + 1, nu), iv, a);
        get(Math.max(iu - 1, 0), iv, b);
        du.subVectors(a, b);
        get(iu, Math.min(iv + 1, nv), a);
        get(iu, Math.max(iv - 1, 0), b);
        dv.subVectors(a, b);
        n.crossVectors(du, dv);
        if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
        n.normalize();
        N[idx] = n.x;
        N[idx + 1] = n.y;
        N[idx + 2] = n.z;
      }
    }
  }

  /** Transform the vertices added by `fn` while it runs.
   * The matrix is copied up front so callers may reuse scratch matrices
   * inside `fn` (sections nest). */
  section(matrix: Matrix4, fn: () => void): void {
    const m = matrix.clone();
    const start = this.vertexCount;
    fn();
    const end = this.vertexCount;
    const nm = new Matrix3().getNormalMatrix(m);
    const p = new Vector3();
    const n = new Vector3();
    for (let i = start; i < end; i++) {
      p.fromArray(this.positions, i * 3).applyMatrix4(m).toArray(this.positions, i * 3);
      n.fromArray(this.normals, i * 3).applyMatrix3(nm).normalize().toArray(this.normals, i * 3);
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.positions), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(this.normals), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(this.uvs), 2));
    g.setAttribute("aColor", new BufferAttribute(new Float32Array(this.colors), 3));
    g.setAttribute("aData", new BufferAttribute(new Float32Array(this.data), 4));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}
