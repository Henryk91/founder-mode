import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { coverage, fit, priceFactor } from '../src/systems/market'
import { newGame, plan } from './helpers'

const feature = (s: ReturnType<typeof newGame>, id: string) =>
  s.product.features.find((f) => f.id === id)!

describe('product', () => {
  it('starts empty with the scenario quality', () => {
    const s = newGame()
    expect(s.product.quality).toBe(70)
    expect(s.product.bugs).toBe(0)
    expect(s.product.features).toHaveLength(8)
    expect(s.product.features.every((f) => f.shippedWeek === null)).toBe(true)
  })

  it('adds build hours to a feature without shipping it early', () => {
    const { state, report } = endWeek(newGame(), plan({ build: { basic_ordering: 30 } }))
    expect(feature(state, 'basic_ordering').progressHours).toBe(30)
    expect(feature(state, 'basic_ordering').shippedWeek).toBeNull()
    expect(report.entries.some((e) => e.kind === 'feature_shipped')).toBe(false)
  })

  it('ships a finished feature, adds bugs, and lowers quality', () => {
    let s = newGame()
    s = endWeek(s, plan({ build: { basic_ordering: 30 } })).state
    const r = endWeek(s, plan({ build: { basic_ordering: 10 } }))
    const f = feature(r.state, 'basic_ordering')
    expect(f.shippedWeek).toBe(2)
    expect(r.state.product.bugs).toBeGreaterThanOrEqual(2)
    expect(r.state.product.bugs).toBeLessThanOrEqual(3)
    expect(r.state.product.quality).toBe(70 - 3 * r.state.product.bugs)
    expect(r.report.entries).toContainEqual({
      kind: 'feature_shipped',
      featureId: 'basic_ordering',
      name: 'Daily group order',
      bugsAdded: r.state.product.bugs,
    })
  })

  it('fixes one bug per fixHoursPerBug hours and carries the remainder', () => {
    let s = newGame()
    s = { ...s, product: { ...s.product, bugs: 3, quality: 61 } }
    const a = endWeek(s, plan({ bugFixHours: 6 }))
    expect(a.state.product.bugs).toBe(2)
    expect(a.state.product.fixProgressHours).toBe(2)
    expect(a.state.product.quality).toBe(64)
    expect(a.report.entries).toContainEqual({ kind: 'bugs_fixed', count: 1 })
    const b = endWeek(a.state, plan({ bugFixHours: 2 }))
    expect(b.state.product.bugs).toBe(1)
    expect(b.state.product.fixProgressHours).toBe(0)
  })

  it('rejects building a shipped feature, too many hours, or too many fix hours', () => {
    const s = newGame()
    expect(validatePlan(s, plan({ build: { basic_ordering: 41 } }))).toContainEqual({
      code: 'build_exceeds_remaining',
      featureId: 'basic_ordering',
      remainingHours: 40,
    })
    expect(validatePlan(s, plan({ build: { nope: 1 } }))).toContainEqual({
      code: 'unknown_feature',
      featureId: 'nope',
    })
    expect(validatePlan(s, plan({ bugFixHours: 1 }))).toContainEqual({
      code: 'bug_fix_exceeds_bugs',
      maxHours: 0,
    })
    const shipped = endWeek(endWeek(s, plan({ build: { basic_ordering: 40 } })).state, plan()).state
    expect(validatePlan(shipped, plan({ build: { basic_ordering: 1 } }))).toContainEqual({
      code: 'feature_shipped',
      featureId: 'basic_ordering',
    })
  })

  it('counts build, fix, outreach and demo hours against the weekly maximum', () => {
    const s = newGame()
    const issues = validatePlan(
      s,
      plan({
        build: { basic_ordering: 30 },
        outreach: { coworking: { channel: 'phone', hours: 30 } },
        restHours: 6,
      }),
    )
    expect(issues).toContainEqual({ code: 'too_many_hours', plannedHours: 66, maxHours: 65 })
  })

  it('computes coverage, fit and price factor from hidden demand', () => {
    let s = newGame('fit')
    const [segId, hidden] = Object.entries(s.hidden.segments)[0]!
    expect(coverage(s, segId)).toBe(0)
    expect(fit(s, segId)).toBe(0)
    s = {
      ...s,
      product: {
        ...s.product,
        features: s.product.features.map((f) =>
          hidden.mustHave.includes(f.id) ? { ...f, shippedWeek: 1 } : f,
        ),
      },
    }
    expect(coverage(s, segId)).toBe(1)
    const { fitBase, fitPerQuality } = s.scenario.product
    expect(fit(s, segId)).toBeCloseTo(hidden.pain * (fitBase + fitPerQuality * 0.7), 10)
    expect(
      fit(
        { ...s, scenario: { ...s.scenario, product: { ...s.scenario.product, fitBase: 0.2 } } },
        segId,
      ),
    ).toBeCloseTo(hidden.pain * (0.2 + 0.5 * 0.7), 10)
    const at = (ratio: number) =>
      priceFactor(
        {
          ...s,
          company: { ...s.company, priceCentsPerMonth: Math.round(hidden.wtpCents * ratio) },
        },
        segId,
      )
    // (1 + e^(-k m)) / (1 + e^(k (r - m))), m 1.35, k 10
    const curve = (r: number) => (1 + Math.exp(-13.5)) / (1 + Math.exp(10 * (r - 1.35)))
    for (const r of [0.3, 0.9, 1, 1.2, 1.35, 1.5, 2]) expect(at(r)).toBeCloseTo(curve(r), 3)
    expect(at(0)).toBeCloseTo(1, 8)
    expect(at(1.35)).toBeCloseTo(0.5, 3)
    // Smooth: every step up in price costs some yeses
    for (const [a, b] of [
      [0.5, 0.7],
      [0.9, 1],
      [1, 1.1],
      [1.4, 1.6],
    ])
      expect(at(b!)).toBeLessThan(at(a!))
    expect(at(10)).toBe(0)
  })

  it('shows the product in the view without the must have mapping', () => {
    const v = getView(endWeek(newGame(), plan({ build: { basic_ordering: 12 } })).state)
    const f = v.product.features.find((x) => x.id === 'basic_ordering')!
    expect(f).toEqual({
      id: 'basic_ordering',
      name: 'Daily group order',
      buildHours: 40,
      progressHours: 12,
      remainingHours: 28,
      shipped: false,
    })
  })
})
