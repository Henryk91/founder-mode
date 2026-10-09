import { describe, expect, it } from 'vitest'
import { Rng, seedRng } from '../src/rng'

const draws = (seed: string, n: number) => {
  const r = new Rng(seedRng(seed))
  return Array.from({ length: n }, () => r.next())
}

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(draws('abc', 50)).toEqual(draws('abc', 50))
  })

  it('gives different sequences for different seeds', () => {
    expect(draws('abc', 5)).not.toEqual(draws('abd', 5))
  })

  it('is pinned to known values, so a changed generator breaks saves loudly', () => {
    expect(seedRng('founder')).toMatchInlineSnapshot(`
      {
        "a": -767296623,
        "b": -1673180410,
        "c": -753191533,
        "d": 1309334316,
      }
    `)
  })

  it('resumes exactly from a saved state', () => {
    const r = new Rng(seedRng('resume'))
    r.next()
    const copy = new Rng(r.state())
    expect([r.next(), r.next()]).toEqual([copy.next(), copy.next()])
  })

  it('stays within bounds', () => {
    const r = new Rng(seedRng('bounds'))
    for (let i = 0; i < 5000; i++) {
      const u = r.next()
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
      const n = r.int(3, 7)
      expect(Number.isInteger(n) && n >= 3 && n <= 7).toBe(true)
    }
  })

  it('hits every integer in a range', () => {
    const r = new Rng(seedRng('ints'))
    const seen = new Set(Array.from({ length: 500 }, () => r.int(1, 6)))
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('draws normal noise with roughly the requested spread', () => {
    const r = new Rng(seedRng('normal'))
    const xs = Array.from({ length: 20000 }, () => r.normal(0.2))
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean)).toBeLessThan(0.01)
    expect(sd).toBeGreaterThan(0.19)
    expect(sd).toBeLessThan(0.21)
  })

  it('shuffles into a permutation without touching the input', () => {
    const input = Object.freeze([1, 2, 3, 4, 5])
    const out = new Rng(seedRng('shuffle')).shuffle(input)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})
