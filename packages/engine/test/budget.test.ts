import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView } from '../src/index'
import { budgetHint } from '../src/systems/experiments'
import { plan } from './helpers'

const kantino = loadScenario('kantino')
const zollstock = loadScenario('zollstock')
const withChance = (s: Scenario, budgetChance: number): Scenario => ({
  ...s,
  experiments: { ...s.experiments, interview: { ...s.experiments.interview, budgetChance } },
})

describe('budget quotes in interviews', () => {
  it('never shift the main random sequence', () => {
    for (const scenario of [kantino, zollstock]) {
      const ids = scenario.segments.map((s) => s.id)
      const p = plan({ interviews: Object.fromEntries(ids.map((id) => [id, 6])) })
      const a = endWeek(createGame(scenario, 'budget-rng'), p).state
      const b = endWeek(createGame(withChance(scenario, 0), 'budget-rng'), p).state
      expect(a.rng).toEqual(b.rng)
      expect(a.eventLog).toEqual(b.eventLog)
    }
  })

  it('come in about one interview in four, and appear as a quote with a rough figure', () => {
    const s = createGame(kantino, 'budget-share')
    const p = plan({ interviews: { small_offices: 10, coworking: 10, medical: 10 } })
    let state = s
    for (let w = 0; w < 4; w++) state = endWeek(state, p).state
    const ivs = getView(state).segments.flatMap((seg) => seg.interviews)
    const withBudget = ivs.filter((iv) => iv.budget !== null)
    expect(ivs).toHaveLength(120)
    expect(withBudget.length).toBeGreaterThan(15)
    expect(withBudget.length).toBeLessThan(50)
    for (const iv of withBudget) {
      expect(iv.budget!.quote).toContain('{amount}')
      expect(iv.budget!.amountCents % 5_000).toBe(0)
    }
  })

  it('are honest on average and noisy one by one, whatever the market role', () => {
    for (const scenario of [kantino, zollstock]) {
      const byRole = new Map<string, number[]>()
      for (let i = 0; i < 400; i++) {
        const s = createGame(scenario, `budget-${i}`)
        for (const seg of scenario.segments) {
          const hidden = s.hidden.segments[seg.id]!
          for (let n = 0; n < 8; n++) {
            const hint = budgetHint(s, seg.id, n)
            if (!hint) continue
            const ratios = byRole.get(hidden.roleId) ?? []
            ratios.push(hint.amountCents / hidden.wtpCents)
            byRole.set(hidden.roleId, ratios)
          }
        }
      }
      for (const ratios of byRole.values()) {
        const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length
        expect(mean).toBeGreaterThan(0.95)
        expect(mean).toBeLessThan(1.05)
        // A single quote is often off by more than a tenth
        expect(ratios.filter((r) => Math.abs(r - 1) > 0.1).length / ratios.length).toBeGreaterThan(
          0.5,
        )
      }
    }
  })

  it('are the same for the same seed, market and interview', () => {
    const s = createGame(zollstock, 'budget-same')
    expect(budgetHint(s, 'contractors', 3)).toEqual(budgetHint(s, 'contractors', 3))
  })
})
