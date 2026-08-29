/**
 * COPIED FROM V1 (tag: v1-procedural, commit 15283c4) — source file:
 *   versions/v1-procedural/src/utils/prng.ts
 * V2 deliberately copies rather than imports V1 code so the archived V1
 * stays frozen and V2 can evolve freely (see docs/versions.md).
 * Behavior preserved: identical wind field + oscillator dynamics.
 * Changes for V2: import paths only (plus any noted inline).
 */
/**
 * Deterministic seeded PRNG utilities. Every random decision in the scene
 * flows through these so a given seed always reproduces the exact meadow.
 */

/** 32-bit string/number hash (xmur3-style) for deriving seeds. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export type Rng = {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Pick a random element. */
  pick<T>(arr: readonly T[]): T;
  /** Roughly normal (sum of 3 uniforms), mean 0, ~[-1.5, 1.5]. */
  gauss(): number;
};

/** mulberry32 — small, fast, good-enough distribution, fully deterministic. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    gauss: () => next() + next() + next() - 1.5,
  };
}
