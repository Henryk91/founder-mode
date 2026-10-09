import { describe, expect, it } from 'vitest'
import { expNeg } from '../src/math'

describe('expNeg', () => {
  it('matches Math.exp(-x) closely', () => {
    for (const x of [0.001, 0.1, 0.5, 1, 2, 3.7, 8, 20]) {
      expect(expNeg(x)).toBeCloseTo(Math.exp(-x), 10)
    }
  })

  it('is 1 at and below zero, and 0 far out', () => {
    expect(expNeg(0)).toBe(1)
    expect(expNeg(-3)).toBe(1)
    expect(expNeg(100)).toBe(0)
  })

  it('falls as x grows', () => {
    expect(expNeg(1)).toBeGreaterThan(expNeg(2))
  })
})
