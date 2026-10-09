import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { newGame, plan, quietKantino } from './helpers'
import type { GameState } from '../src/types'
import { withPain } from './helpers2'

const quiet = (seed: string) => newGame(seed, quietKantino())

describe('landing page tests', () => {
  it('costs 8 h and the ad budget, and reports after 1 week', () => {
    let s = quiet('landing')
    const week1 = endWeek(s, plan({ landing: { coworking: 20_000 } }))
    expect(week1.report.plannedHours).toBe(8)
    expect(week1.report.ledger.adSpendCents).toBe(20_000)
    expect(week1.report.entries).toContainEqual({ kind: 'ad_spend', amountCents: 20_000 })
    expect(week1.state.company.cashCents).toBe(600_000 - 20_000)
    expect(getView(week1.state).pendingExperiments).toEqual([
      { kind: 'landing', segmentId: 'coworking', resolveWeek: 2 },
    ])
    expect(getView(week1.state).segments.find((x) => x.id === 'coworking')!.landingTests).toEqual(
      [],
    )

    s = week1.state
    const week2 = endWeek(s, plan())
    const test = getView(week2.state).segments.find((x) => x.id === 'coworking')!.landingTests
    expect(test).toHaveLength(1)
    expect(test[0]).toMatchObject({ week: 2, budgetCents: 20_000, visitors: 133 })
    expect(week2.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'landing_result', segmentId: 'coworking', visitors: 133 }),
    )
    expect(getView(week2.state).pendingExperiments).toEqual([])
  })

  it('turns every 5 sign ups into one open lead in that market', () => {
    for (let i = 0; i < 10; i++) {
      let s = withPain(quiet(`lead${i}`), 'coworking', 0.8)
      s = endWeek(s, plan({ landing: { coworking: 50_000 } })).state
      const r = endWeek(s, plan())
      const result = r.report.entries.find((e) => e.kind === 'landing_result')!
      if (result.kind !== 'landing_result') throw new Error('no result')
      expect(result.leads).toBe(Math.floor(result.signups / 5))
      const leads = r.state.leads.filter((l) => l.segmentId === 'coworking')
      expect(leads).toHaveLength(result.leads)
      for (const l of leads) expect(l.source).toBe('landing')
    }
  })

  it('signs up fewer visitors when the price on the page is above what the market pays', () => {
    const rate = (factor: number) => {
      let signups = 0
      for (let i = 0; i < 60; i++) {
        let s = withPain(quiet(`price${i}`), 'medical', 0.8)
        const wtp = s.hidden.segments.medical!.wtpCents
        s = endWeek(
          s,
          plan({ landing: { medical: 50_000 }, priceCentsPerMonth: Math.round(wtp * factor) }),
        ).state
        s = endWeek(s, plan()).state
        signups += getView(s).segments.find((x) => x.id === 'medical')!.landingTests[0]!.signups
      }
      return signups
    }
    expect(rate(2)).toBeLessThan(rate(1) * 0.3)
  })

  it('buys 333 visitors with the larger budget', () => {
    let s = quiet('landing-big')
    s = endWeek(s, plan({ landing: { medical: 50_000 } })).state
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
    for (const p of [plan({ landing: { coworking: 20_000 } }), plan()]) {
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
  const pained = (seed: string, segmentId: string, pain = 0.8) =>
    withPain(quiet(seed), segmentId, pain)
  const commitsOf = (s: GameState, segmentId: string) =>
    getView(s).segments.find((x) => x.id === segmentId)!.presales

  it('pitches cold prospects, needs no leads, and allows 3 batches per market', () => {
    const s = pained('presale-cap', 'coworking')
    expect(validatePlan(s, plan({ presales: { coworking: 3 } }))).toEqual([])
    expect(validatePlan(s, plan({ presales: { coworking: 4 } }))).toEqual([
      { code: 'presale_cap', segmentId: 'coworking', left: 3 },
    ])
    const after = endWeek(s, plan({ presales: { coworking: 2 } })).state
    expect(getView(after).segments.find((x) => x.id === 'coworking')!.presaleBatchesLeft).toBe(1)
    expect(validatePlan(after, plan({ presales: { coworking: 2 } }))).toEqual([
      { code: 'presale_cap', segmentId: 'coworking', left: 1 },
    ])
    expect(validatePlan(after, plan({ presales: { medical: 3 } }))).toEqual([])
  })

  it('costs 6 h per batch of 5 prospects and reports after a week', () => {
    const s = pained('presale-cost', 'coworking')
    const r = endWeek(s, plan({ presales: { coworking: 2 } }))
    expect(r.report.plannedHours).toBe(12)
    expect(getView(r.state).pendingExperiments).toEqual([
      { kind: 'presale', segmentId: 'coworking', resolveWeek: 2 },
    ])
    const next = endWeek(r.state, plan())
    const sale = commitsOf(next.state, 'coworking')
    expect(sale).toHaveLength(1)
    expect(sale[0]).toMatchObject({ week: 2, prospects: 10, priceCents: 30_000 })
  })

  it('commits about a quarter of the prospects at full pain, fewer when the price is too high', () => {
    const rate = (priceFor: (wtp: number) => number) => {
      let total = 0
      for (let i = 0; i < 100; i++) {
        let s = pained(`pre${i}`, 'coworking', 1)
        const wtp = s.hidden.segments.coworking!.wtpCents
        s = endWeek(
          s,
          plan({ presales: { coworking: 2 }, priceCentsPerMonth: priceFor(wtp) }),
        ).state
        s = endWeek(s, plan()).state
        total += commitsOf(s, 'coworking')[0]!.commits
      }
      return total / (100 * 10)
    }
    expect(rate((wtp) => wtp)).toBeCloseTo(0.25, 1)
    expect(rate((wtp) => wtp * 2)).toBeLessThan(0.08)
  })

  it('measures what prospects do: a trap market rarely commits', () => {
    let low = 0
    let high = 0
    for (let i = 0; i < 80; i++) {
      for (const [pain, add] of [
        [0.15, (n: number) => (low += n)],
        [0.75, (n: number) => (high += n)],
      ] as const) {
        let s = pained(`trap${i}`, 'small_offices', pain)
        s = endWeek(s, plan({ presales: { small_offices: 2 } })).state
        s = endWeek(s, plan()).state
        add(commitsOf(s, 'small_offices')[0]!.commits)
      }
    }
    expect(high).toBeGreaterThan(low * 3)
  })

  /** A run where a pre-sale in coworking found at least one prospect who paid a deposit. */
  const committed = () => {
    for (let i = 0; i < 50; i++) {
      let s = pained(`dep${i}`, 'coworking', 1)
      s = endWeek(s, plan({ presales: { coworking: 3 } })).state
      const r = endWeek(s, plan())
      const commits = commitsOf(r.state, 'coworking')[0]!.commits
      if (commits > 0) return { r, commits }
    }
    throw new Error('no commit in 50 runs')
  }

  it('takes a deposit of one month from every prospect who commits', () => {
    const { r, commits } = committed()
    expect(r.report.ledger.revenueCents).toBe(commits * 30_000)
    const leads = r.state.leads.filter((l) => l.stage === 'committed')
    expect(leads).toHaveLength(commits)
    for (const l of leads) expect(l).toMatchObject({ source: 'presale', depositCents: 30_000 })
    expect(r.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'presale_result', commits }),
    )
    expect(getView(r.state).leads.filter((l) => l.stage === 'committed')).toHaveLength(commits)
  })

  it('turns a deposit into a customer once the market has its must haves, with the first month paid', () => {
    const { r, commits } = committed()
    let s = r.state
    // Ship every coworking must have at once.
    s = {
      ...s,
      product: {
        ...s.product,
        features: s.product.features.map((f) =>
          s.hidden.segments.coworking!.mustHave.includes(f.id)
            ? { ...f, shippedWeek: s.week - 1 }
            : f,
        ),
      },
    }
    const next = endWeek(s, plan())
    expect(next.state.customers).toHaveLength(commits)
    for (const c of next.state.customers) {
      expect(c).toMatchObject({ priceCentsPerMonth: 30_000, prepaidMonths: 1 })
    }
    expect(
      next.report.entries.filter((e) => e.kind === 'lead_update' && e.change === 'won'),
    ).toHaveLength(commits)
    // The first month end sends no invoice: the deposit paid for it.
    let t = next.state
    while (t.week % 4 !== 0) t = endWeek(t, plan()).state
    const monthEnd = endWeek(t, plan()).state
    expect(monthEnd.invoices).toHaveLength(0)
    expect(monthEnd.customers.every((c) => c.prepaidMonths === 0)).toBe(true)
  })

  it('refunds the deposit and loses the prospect after 8 weeks without the product', () => {
    const { r, commits } = committed()
    let s = r.state
    let refund = 0
    for (let w = 0; w < 8; w++) {
      const next = endWeek(s, plan())
      refund += next.report.entries.filter(
        (e) => e.kind === 'lead_update' && e.change === 'refunded',
      ).length
      if (refund > 0) {
        expect(next.report.ledger.otherCostsCents).toBe(commits * 30_000)
        expect(w).toBe(7)
      }
      s = next.state
    }
    expect(refund).toBe(commits)
    expect(s.leads.filter((l) => l.lostReason === 'refunded')).toHaveLength(commits)
    expect(s.customers).toHaveLength(0)
  })
})
