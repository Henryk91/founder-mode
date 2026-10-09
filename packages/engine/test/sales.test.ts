import { describe, expect, it } from 'vitest'
import { endWeek, validatePlan } from '../src/index'
import { churnChance } from '../src/systems/sales'
import type { GameState, Lead } from '../src/types'
import { newGame, plan } from './helpers'

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'lead_1',
  name: 'Testfirma',
  segmentId: 'small_offices',
  stage: 'lead',
  stageSinceWeek: 1,
  lastContactWeek: 1,
  silentSinceWeek: null,
  lostReason: null,
  ...over,
})

/** A game where the first segment has a certain demand, to make stage changes predictable. */
function withLeads(leads: Lead[], over: { pain?: number; shipped?: boolean } = {}): GameState {
  const s = newGame('sales')
  const seg = s.hidden.segments.small_offices!
  return {
    ...s,
    leads,
    hidden: {
      segments: {
        ...s.hidden.segments,
        small_offices: { ...seg, pain: over.pain ?? seg.pain },
      },
    },
    product: {
      ...s.product,
      features: s.product.features.map((f) =>
        over.shipped && seg.mustHave.includes(f.id) ? { ...f, shippedWeek: 1 } : f,
      ),
    },
  }
}

const stages = (s: GameState) => s.leads.map((l) => l.stage)

describe('outreach', () => {
  it('finds leads in proportion to hours, response, and selling skill', () => {
    let total = 0
    const runs = 200
    for (let i = 0; i < runs; i++) {
      const s = newGame(`outreach-${i}`)
      const r = endWeek(
        s,
        plan({ outreach: { small_offices: { channel: 'cold_email', hours: 20 } } }),
      )
      total += r.state.leads.length
      const entry = r.report.entries.find((e) => e.kind === 'new_leads')
      expect(entry).toMatchObject({ segmentId: 'small_offices', channel: 'cold_email' })
      expect(r.state.leads.every((l) => l.stage === 'lead' || l.stage === 'demo')).toBe(true)
    }
    // cold email 0.10 to 0.20 (mean 0.15) * 20 h * (0.5 + 0.1) = 1.8 on average
    expect(total / runs).toBeGreaterThan(1.3)
    expect(total / runs).toBeLessThan(2.3)
  })

  it('gives every lead a distinct name, even beyond the name pool', () => {
    let s = newGame('names')
    s = {
      ...s,
      scenario: {
        ...s.scenario,
        companyNames: { ...s.scenario.companyNames, coworking: ['Alpha', 'Beta'] },
      },
    }
    const names = new Set<string>()
    for (let i = 0; i < 6; i++) {
      s = endWeek(s, plan({ outreach: { coworking: { channel: 'in_person', hours: 40 } } })).state
    }
    for (const l of s.leads) names.add(l.name)
    expect(names.size).toBe(s.leads.length)
    expect(s.leads.length).toBeGreaterThan(2)
  })

  it('does not run without hours', () => {
    const r = endWeek(newGame(), plan({ outreach: { coworking: { channel: 'phone', hours: 0 } } }))
    expect(r.state.leads).toEqual([])
    expect(r.report.entries.some((e) => e.kind === 'new_leads')).toBe(false)
  })
})

describe('demos and trials', () => {
  it('only allows demos with leads that asked for one', () => {
    const s = withLeads([lead(), lead({ id: 'lead_2', stage: 'demo' })])
    expect(validatePlan(s, plan({ demos: ['lead_1'] }))).toContainEqual({
      code: 'invalid_demo',
      leadId: 'lead_1',
    })
    expect(validatePlan(s, plan({ demos: ['lead_2'] }))).toEqual([])
    expect(validatePlan(s, plan({ demos: ['lead_2', 'lead_2'] }))).toHaveLength(1)
    expect(validatePlan(s, plan({ demos: ['nobody'] }))).toHaveLength(1)
  })

  it('costs the demo hours and raises the selling skill', () => {
    const s = withLeads([lead({ stage: 'demo' })])
    const r = endWeek(s, plan({ demos: ['lead_1'] }))
    expect(r.report.plannedHours).toBe(3)
    expect(r.state.founder.skills.selling).toBeCloseTo(0.11, 10)
    expect(r.state.leads[0]!.lastContactWeek).toBe(1)
  })

  it('moves held demos to a trial or loses the lead, depending on the fit', () => {
    let trials = 0
    let lost = 0
    for (let i = 0; i < 200; i++) {
      const s = {
        ...withLeads([lead({ stage: 'demo' })], { pain: 0.9, shipped: true }),
        seed: `d${i}`,
      }
      const r = endWeek({ ...s, rng: newGame(`rng-${i}`).rng }, plan({ demos: ['lead_1'] }))
      if (r.state.leads[0]!.stage === 'trial') trials++
      else {
        expect(r.state.leads[0]).toMatchObject({ stage: 'lost', lostReason: 'declined' })
        lost++
      }
    }
    // fit = 0.9 * 1 * 0.85 = 0.765, so p(trial) = 0.2 + 0.6 * 0.765 = 0.66
    expect(trials / 200).toBeGreaterThan(0.55)
    expect(trials / 200).toBeLessThan(0.77)
    expect(lost).toBeGreaterThan(0)
  })

  it('turns a trial into a paying customer only after the trial weeks', () => {
    let s = withLeads([lead({ stage: 'trial', stageSinceWeek: 1 })], { pain: 1, shipped: true })
    s = { ...s, week: 2 }
    expect(stages(endWeek(s, plan()).state)).toEqual(['trial'])
    let won = 0
    for (let i = 0; i < 100; i++) {
      const t = { ...s, week: 3, rng: newGame(`t${i}`).rng }
      const r = endWeek(t, plan())
      if (r.state.leads[0]!.stage === 'paying') {
        won++
        expect(r.state.customers).toEqual([
          {
            id: 'customer_1',
            leadId: 'lead_1',
            name: 'Testfirma',
            segmentId: 'small_offices',
            sinceWeek: 3,
            churnedWeek: null,
          },
        ])
      } else {
        expect(r.state.customers).toEqual([])
      }
    }
    // fit = 1 * 0.85, price factor 1 unless the price is above wtp
    expect(won).toBeGreaterThan(0)
  })

  it('never converts a trial when nothing has shipped', () => {
    const s = { ...withLeads([lead({ stage: 'trial', stageSinceWeek: 1 })], { pain: 1 }), week: 3 }
    for (let i = 0; i < 50; i++) {
      const r = endWeek({ ...s, rng: newGame(`z${i}`).rng }, plan())
      expect(r.state.customers).toEqual([])
    }
  })
})

describe('ghosting', () => {
  it('loses silent leads after the silent weeks', () => {
    const s = { ...withLeads([lead({ silentSinceWeek: 1 })]), week: 5 }
    const r = endWeek(s, plan())
    expect(r.state.leads[0]).toMatchObject({ stage: 'lost', lostReason: 'silent' })
    expect(r.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'lead_update', change: 'lost_silent' }),
    )
  })

  it('lets untouched leads go silent about 10% of weeks, but not those with a demo held', () => {
    let silent = 0
    for (let i = 0; i < 400; i++) {
      const s = { ...withLeads([lead({ stage: 'lead', stageSinceWeek: 1 })], { pain: 0 }), week: 2 }
      const r = endWeek({ ...s, rng: newGame(`g${i}`).rng }, plan())
      if (r.state.leads[0]!.silentSinceWeek !== null) silent++
    }
    expect(silent / 400).toBeGreaterThan(0.05)
    expect(silent / 400).toBeLessThan(0.16)
  })

  it('does not let silent leads progress or book demos', () => {
    const s = withLeads([lead({ stage: 'demo', silentSinceWeek: 1 })])
    expect(validatePlan(s, plan({ demos: ['lead_1'] }))).toHaveLength(1)
  })
})

describe('customers, revenue and churn', () => {
  const customer = (id: string, sinceWeek: number) => ({
    id,
    leadId: 'lead_1',
    name: id,
    segmentId: 'small_offices',
    sinceWeek,
    churnedWeek: null,
  })

  it('pays the monthly price at month end for customers won before that week', () => {
    let s = newGame()
    s = { ...s, week: 4, customers: [customer('customer_1', 2), customer('customer_2', 4)] }
    const r = endWeek(s, plan())
    expect(r.report.ledger.revenueCents).toBe(30_000)
    expect(r.report.entries).toContainEqual({ kind: 'revenue', amountCents: 30_000, customers: 1 })
    expect(r.state.company.cashCents).toBe(1_500_000 + 30_000 - 27_000)
  })

  it('has no revenue outside month ends', () => {
    const s = { ...newGame(), week: 3, customers: [customer('customer_1', 1)] }
    expect(endWeek(s, plan()).report.ledger.revenueCents).toBe(0)
  })

  it('computes churn from fit and bugs, capped', () => {
    let s = newGame('churn')
    const seg = s.hidden.segments.small_offices!
    expect(churnChance(s, 'small_offices')).toBeCloseTo(0.02 + 0.25, 10) // nothing shipped, fit 0
    s = { ...s, product: { ...s.product, bugs: 100 } }
    expect(churnChance(s, 'small_offices')).toBe(0.6)
    expect(seg.pain).toBeGreaterThan(0)
  })

  it('churns customers only at month ends', () => {
    let churned = 0
    for (let i = 0; i < 100; i++) {
      const base = { ...newGame(`c${i}`), customers: [customer('customer_1', 1)] }
      const mid = endWeek({ ...base, week: 2 }, plan()).state
      expect(mid.customers[0]!.churnedWeek).toBeNull()
      const end = endWeek({ ...base, week: 4 }, plan())
      if (end.state.customers[0]!.churnedWeek === 4) {
        churned++
        expect(end.report.entries).toContainEqual(
          expect.objectContaining({ kind: 'customer_churned', name: 'customer_1' }),
        )
        // The month's revenue was still received.
        expect(end.report.ledger.revenueCents).toBe(30_000)
      }
    }
    expect(churned).toBeGreaterThan(10)
  })
})

describe('lead names', () => {
  it('come from the pool of the segment they were found in', () => {
    let s = newGame('segment-names')
    for (let i = 0; i < 8; i++) {
      s = endWeek(
        s,
        plan({
          outreach: {
            small_offices: { channel: 'cold_email', hours: 20 },
            coworking: { channel: 'in_person', hours: 20 },
            medical: { channel: 'phone', hours: 20 },
          },
        }),
      ).state
    }
    expect(s.leads.length).toBeGreaterThan(10)
    for (const l of s.leads) {
      // A reused name gets a number appended, but a pool name may also end in a digit.
      const pool = s.scenario.companyNames[l.segmentId]!
      expect(pool.includes(l.name) || pool.includes(l.name.replace(/ \d+$/, ''))).toBe(true)
    }
  })
})
