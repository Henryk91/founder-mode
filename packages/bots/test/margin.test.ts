import { describe, expect, it } from 'vitest'
import { medianMargin, pairedMargin, rateMargin, ratioMargin } from '../src/margin'

describe('margins of error', () => {
  it('gives the textbook margin for a share', () => {
    // 30% of 3000: 1.96 x sqrt(0.3 x 0.7 / 3000) = 1.64 points
    expect(rateMargin(900, 3000)).toBeCloseTo(1.64, 2)
    expect(rateMargin(0, 0)).toBe(0)
  })

  it('counts only seeds that flip in a paired difference', () => {
    const a = Array.from({ length: 1000 }, (_, i) => i < 300)
    expect(pairedMargin(a, a)).toBe(0)
    // 20 seeds flip each way: the difference is 0, its margin about 1.96 x sqrt(40) / 1000
    const b = a.map((w, i) => (i < 20 ? false : i >= 300 && i < 320 ? true : w))
    expect(pairedMargin(a, b)).toBeCloseTo((100 * 1.96 * Math.sqrt(40)) / 1000, 1)
  })

  it('reads a median margin from the middle of the sorted values', () => {
    expect(medianMargin(Array.from({ length: 1000 }, () => 7))).toBe(0)
    const spread = Array.from({ length: 1000 }, (_, i) => i)
    // About 31 ranks either side of the middle
    expect(medianMargin(spread)).toBeGreaterThan(29)
    expect(medianMargin(spread)).toBeLessThan(33)
  })

  it('treats runs, not their parts, as the samples of a share', () => {
    expect(ratioMargin([5, 5, 5], [10, 10, 10])).toBe(0)
    expect(ratioMargin([10, 0], [10, 10])).toBeGreaterThan(0)
  })
})
