import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { newGame, plan, quietKantino } from './helpers'
import { openLead, withPain } from './helpers2'

const quiet = (seed: string) => newGame(seed, quietKantino())

describe('landing page tests', () => {
  it('costs 8 h and the ad budget, and reports after 2 weeks', () => {
    let s = quiet('landing')
    const week1 = endWeek(s, plan({ landing: { coworking: 20_000 }, bookkeepingHours: 2 }))
    expect(week1.report.plannedHours).toBe(8 + 2)
    expect(week1.report.ledger.adSpendCents).toBe(20_000)
    expect(week1.report.entries).toContainEqual({ kind: 'ad_spend', amountCents: 20_000 })
    expect(week1.state.company.cashCents).toBe(1_000_000 - 20_000)
    expect(getView(week1.state).pendingExperiments).toEqual([
      { kind: 'landing', segmentId: 'coworking', resolveWeek: 3 },
    ])
    expect(getView(week1.state).segments.find((x) => x.id === 'coworking')!.landingTests).toEqual(
      [],
    )

    s = endWeek(week1.state, plan({ bookkeepingHours: 2 })).state
    expect(getView(s).segments.find((x) => x.id === 'coworking')!.landingTests).toEqual([])
    const week3 = endWeek(s, plan({ bookkeepingHours: 2 }))
    const test = getView(week3.state).segments.find((x) => x.id === 'coworking')!.landingTests
    expect(test).toHaveLength(1)
    expect(test[0]).toMatchObject({ week: 3, budgetCents: 20_000, visitors: 133 })
    expect(week3.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'landing_result', segmentId: 'coworking', visitors: 133 }),
    )
    expect(getView(week3.state).pendingExperiments).toEqual([])
  })

  it('buys 333 visitors with the larger budget', () => {
    let s = quiet('landing-big')
    s = endWeek(s, plan({ landing: { medical: 50_000 } })).state
    s = endWeek(s, plan()).state
    s = endWeek(s, plan()).state
    expect(getView(s).segments.find((x) => x.id === 'medical')!.landingTests[0]!.visitors).toBe(333)
  })

  it('signs up visitors in proportion to 0.02 + 0.15 x pain', () => {
    const rate = (pain: number) => {
      let signups = 0
      let visitors = 0
      for (let i = 0; i < 60; i++) {
        let s = withPain(quiet(`rate${i}`), 'coworking', pain)
        s = endWeek(s, plan({ landing: { coworking: 50_000 } })).state
        s = endWeek(s, plan()).state
        s = endWeek(s, plan()).state
        const t = getView(s).segments.find((x) => x.id === 'coworking')!.landingTests[0]!
        signups += t.signups
        visitors += t.visitors
      }
      return signups / visitors
    }
    expect(rate(0.8)).toBeCloseTo(0.02 + 0.15 * 0.8, 1)
    expect(rate(0.1)).toBeCloseTo(0.02 + 0.15 * 0.1, 1)
    expect(rate(0.8)).toBeGreaterThan(rate(0.1) * 2.5)
  })

  it('logs each result with its expected value for the post-mortem', () => {
    let s = withPain(quiet('landing-log'), 'coworking', 0.5)
    for (const p of [plan({ landing: { coworking: 20_000 } }), plan(), plan()]) {
      s = endWeek(s, p).state
    }
    const logged = s.eventLog.filter((e) => e.kind === 'landing')
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatchObject({ segmentId: 'coworking' })
    expect((logged[0] as { expected: number }).expected).toBeCloseTo(133 * (0.02 + 0.15 * 0.5), 6)
  })

  it('rejects a budget that is not one of the scenario budgets', () => {
    const s = quiet('landing-budget')
    expect(validatePlan(s, plan({ landing: { coworking: 30_000 } }))).toEqual([
      { code: 'invalid_budget', segmentId: 'coworking' },
    ])
    expect(validatePlan(s, plan({ landing: { nowhere: 20_000 } }))).toContainEqual({
      code: 'unknown_segment',
      segmentId: 'nowhere',
    })
    expect(validatePlan(s, plan({ landing: { coworking: 0 } }))).toEqual([])
  })
})

describe('pre-sales', () => {
  const withLeads = (seed: string, segmentId: string, n: number, pain = 0.8) => {
    const s = withPain(quiet(seed), segmentId, pain)
    return { ...s, leads: Array.from({ length: n }, (_, i) => openLead(i + 1, segmentId)) }
  }

  it('needs 3 open leads in the market for each batch', () => {
    const s = withLeads('presale-leads', 'coworking', 7)
    expect(validatePlan(s, plan({ presales: { coworking: 2 } }))).toEqual([])
    expect(validatePlan(s, plan({ presales: { coworking: 3 } }))).toEqual([
      { code: 'presale_needs_leads', segmentId: 'coworking', leads: 9 },
    ])
    expect(
      validatePlan(withLeads('few', 'coworking', 2), plan({ presales: { coworking: 1 } })),
    ).toHaveLength(1)
    const lost = { ...s, leads: s.leads.map((l) => ({ ...l, stage: 'lost' as const })) }
    expect(validatePlan(lost, plan({ presales: { coworking: 1 } }))).toHaveLength(1)
  })

  it('scales the prospects to the leads when a batch is short of 5', () => {
    const run = (leads: number, batches: number) => {
      let s = withLeads('presale-scale', 'coworking', leads)
      s = endWeek(s, plan({ presales: { coworking: batches } })).state
      s = endWeek(s, plan()).state
      return getView(s).segments.find((x) => x.id === 'coworking')!.presales[0]!
    }
    expect(run(3, 1).prospects).toBe(3)
    expect(run(4, 1).prospects).toBe(4)
    expect(run(12, 1).prospects).toBe(5)
    expect(run(7, 2).prospects).toBe(7)
    expect(run(12, 2).prospects).toBe(10)
  })

  it('costs 6 h per batch and reports after a week', () => {
    const s = withLeads('presale-cost', 'coworking', 12)
    const r = endWeek(s, plan({ presales: { coworking: 2 } }))
    expect(r.report.plannedHours).toBe(12)
    expect(getView(r.state).pendingExperiments).toEqual([
      { kind: 'presale', segmentId: 'coworking', resolveWeek: 2 },
    ])
    const next = endWeek(r.state, plan())
    const sale = getView(next.state).segments.find((x) => x.id === 'coworking')!.presales
    expect(sale).toHaveLength(1)
    expect(sale[0]).toMatchObject({ week: 2, prospects: 10, priceCents: 30_000 })
    expect(sale[0]!.commits).toBeLessThanOrEqual(10)
  })

  it('commits about half of the prospects at full pain, fewer when the price is too high', () => {
    const commits = (priceFor: (wtp: number) => number) => {
      let total = 0
      for (let i = 0; i < 80; i++) {
        let s = withLeads(`pre${i}`, 'coworking', 5, 1)
        const wtp = s.hidden.segments.coworking!.wtpCents
        s = endWeek(
          s,
          plan({ presales: { coworking: 1 }, priceCentsPerMonth: priceFor(wtp) }),
        ).state
        s = endWeek(s, plan()).state
        total += getView(s).segments.find((x) => x.id === 'coworking')!.presales[0]!.commits
      }
      return total / (80 * 5)
    }
    expect(commits((wtp) => wtp)).toBeCloseTo(0.5, 1)
    expect(commits((wtp) => wtp * 2)).toBeLessThan(0.15)
  })

  it('measures what prospects do: a trap market rarely commits', () => {
    let low = 0
    let high = 0
    for (let i = 0; i < 60; i++) {
      for (const [pain, add] of [
        [0.15, (n: number) => (low += n)],
        [0.75, (n: number) => (high += n)],
      ] as const) {
        let s = withLeads(`trap${i}`, 'small_offices', 5, pain)
        s = endWeek(s, plan({ presales: { small_offices: 1 } })).state
        s = endWeek(s, plan()).state
        add(getView(s).segments.find((x) => x.id === 'small_offices')!.presales[0]!.commits)
      }
    }
    expect(high).toBeGreaterThan(low * 3)
  })
})
