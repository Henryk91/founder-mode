import { loadScenario } from '@founder-mode/content'
import { createGame, getView, type PlayerView } from '@founder-mode/engine'
import { describe, expect, it } from 'vitest'
import { landingBehind, landingStanding } from '../src/strategies/validateThenBuild'

/** A fresh view with these landing results (visitors, sign ups) per market, in market order. */
function withLanding(results: ([number, number] | null)[]): PlayerView {
  const view = getView(createGame(loadScenario('kantino'), 'landing'))
  return {
    ...view,
    segments: view.segments.map((s, i) => {
      const r = results[i]
      return {
        ...s,
        landingTests: r ? [{ week: 2, budgetCents: 30000, visitors: r[0], signups: r[1] }] : [],
      }
    }),
  }
}

describe('landing tests compared between markets', () => {
  it('drops only a market clearly behind another tested market', () => {
    const view = withLanding([[133, 4], [133, 16], null])
    const [a, b, c] = view.segments.map((s) => s.id) as [string, string, string]
    expect(landingBehind(view, a)).toBe(true)
    expect(landingBehind(view, b)).toBe(false)
    expect(landingBehind(view, c)).toBe(false)
  })

  it('keeps both markets when the gap is within the noise, at any sign up level', () => {
    for (const [x, y] of [
      [8, 12],
      [3, 5],
    ]) {
      const view = withLanding([[133, x!], [133, y!], null])
      expect(view.segments.some((s) => landingBehind(view, s.id))).toBe(false)
    }
  })

  it('judges a weak signal by the same rule, without a fixed bar', () => {
    // Fewer sign ups need a larger ratio before a market counts as behind
    const weak = withLanding([[133, 2], [133, 8], null])
    expect(weak.segments.some((s) => landingBehind(weak, s.id))).toBe(true)
    const weaker = withLanding([[133, 2], [133, 5], null])
    expect(weaker.segments.some((s) => landingBehind(weaker, s.id))).toBe(false)
  })

  it('stands markets above or below all tested markets together', () => {
    const view = withLanding([[133, 4], [133, 16], null])
    const [a, b, c] = view.segments.map((s) => s.id) as [string, string, string]
    expect(landingStanding(view, a)!).toBeLessThan(0)
    expect(landingStanding(view, b)!).toBeGreaterThan(0)
    expect(landingStanding(view, c)).toBeNull()
    const one = withLanding([[133, 9], null, null])
    expect(landingStanding(one, a)).toBe(0)
  })
})
