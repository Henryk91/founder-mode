import type { RngState } from './types'

// sfc32 seeded by xmur3. Only integer ops, additions, and one division by 2^32, so results are
// bit identical in every JavaScript engine. No Math.log or Math.cos (their precision varies).

const TWO_POW_32 = 4294967296

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h | 0
  }
}

export function seedRng(seed: string): RngState {
  const hash = xmur3(seed)
  const rng = new Rng({ a: hash(), b: hash(), c: hash(), d: hash() })
  for (let i = 0; i < 12; i++) rng.next()
  return rng.state()
}

/**
 * A local, mutable cursor over an RngState. Create one from `state.rng` inside an engine
 * function, draw from it, and write `rng.state()` back into the new state.
 */
export class Rng {
  private a: number
  private b: number
  private c: number
  private d: number

  constructor(state: RngState) {
    this.a = state.a
    this.b = state.b
    this.c = state.c
    this.d = state.d
  }

  state(): RngState {
    return { a: this.a, b: this.b, c: this.c, d: this.d }
  }

  /** Uniform in [0, 1). */
  next(): number {
    let t = (this.a + this.b) | 0
    this.a = this.b ^ (this.b >>> 9)
    this.b = (this.c + (this.c << 3)) | 0
    this.c = (this.c << 21) | (this.c >>> 11)
    this.d = (this.d + 1) | 0
    t = (t + this.d) | 0
    this.c = (this.c + t) | 0
    return (t >>> 0) / TWO_POW_32
  }

  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  /** Approximately N(0, sd), using the sum of 12 uniforms (Irwin-Hall). */
  normal(sd: number): number {
    let sum = 0
    for (let i = 0; i < 12; i++) sum += this.next()
    return (sum - 6) * sd
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty list')
    return items[this.int(0, items.length - 1)] as T
  }

  /** Returns a shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j] as T, out[i] as T]
    }
    return out
  }
}
