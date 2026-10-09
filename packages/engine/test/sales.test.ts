import { describe, expect, it } from 'vitest'
import { companyNameCombinations } from '@founder-mode/content'
import { endWeek, getView, validatePlan } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { churnChance, pickName } from '../src/systems/sales'
import type { GameState, Lead } from '../src/types'
import { newGame, plan, richKantino } from './helpers'

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
      ...s.hidden,
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
    // mean cold email response * 20 h * (sellingBase + starting skill), from the scenario
    const sc = newGame().scenario
    const r = sc.segments.find((x) => x.id === 'small_offices')!.channelResponse.cold_email
    const expected = ((r.min + r.max) / 2) * 20 * (sc.sales.sellingBase + sc.start.skills.selling)
    expect(total / runs).toBeGreaterThan(expected * 0.75)
    expect(total / runs).toBeLessThan(expected * 1.25)
  })

  it('gives every lead a distinct name without a number, even in a long run', () => {
    let s = newGame('names', richKantino())
    for (let i = 0; i < 78; i++) {
      s = endWeek(s, plan({ outreach: { coworking: { channel: 'in_person', hours: 50 } } })).state
    }
    const names = s.leads.map((l) => l.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeGreaterThan(150)
    for (const name of names) expect(name).not.toMatch(/ \d+$/)
  })

  it('uses every combination before falling back to a number', () => {
    const rng = new Rng(seedRng('pick'))
    const parts = { first: ['A', 'B'], second: ['x', 'y'] }
    const used = new Set<string>()
    for (let i = 0; i < 4; i++) used.add(pickName(parts, used, rng))
    expect([...used].sort()).toEqual(['A x', 'A y', 'B x', 'B y'])
    expect(pickName(parts, used, rng)).toMatch(/^[AB] [xy] 2$/)
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
    expect(r.state.founder.skills.selling).toBeCloseTo(0.1 + s.scenario.sales.skillGainPerDemo, 10)
    expect(r.state.leads[0]!.lastContactWeek).toBe(1)
  })

  it('moves held demos to a trial or loses the lead, depending on the fit', () => {
    let trials = 0
    let lost = 0
    const cfg = newGame().scenario.sales
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
    // fit = 0.9 * 1 * 0.85 = 0.765, so p(trial) = base + perFit * 0.765
    const p = cfg.demoToTrialBase + cfg.demoToTrialPerFit * 0.765
    expect(trials / 200).toBeGreaterThan(p - 0.11)
    expect(trials / 200).toBeLessThan(p + 0.11)
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
            priceCentsPerMonth: 30_000,
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
    priceCentsPerMonth: 30_000,
  })

  it('invoices at month end the customers won before that week, and is paid later', () => {
    let s = newGame()
    s = { ...s, week: 4, customers: [customer('customer_1', 2), customer('customer_2', 4)] }
    const r = endWeek(s, plan())
    expect(r.state.invoices).toHaveLength(1)
    expect(r.state.invoices[0]).toMatchObject({
      customerId: 'customer_1',
      amountCents: 30_000,
      issuedWeek: 4,
      dueWeek: 6,
    })
    expect(r.report.entries).toContainEqual({
      kind: 'invoices_issued',
      amountCents: 30_000,
      count: 1,
    })
    // No money yet: an invoice is paid in a later week.
    expect(r.report.ledger.revenueCents).toBe(0)
    expect(r.state.company.cashCents).toBe(1_000_000 - 27_000)
  })

  it('invoices every customer the price agreed when they signed', () => {
    const s = {
      ...newGame(),
      week: 4,
      customers: [
        customer('customer_1', 1),
        { ...customer('customer_2', 2), priceCentsPerMonth: 45_000 },
      ],
    }
    // A price change this week applies to new customers only.
    const r = endWeek(s, plan({ priceCentsPerMonth: 90_000 }))
    expect(r.state.invoices.map((i) => i.amountCents)).toEqual([30_000, 45_000])
    expect(r.state.company.priceCentsPerMonth).toBe(90_000)
    const active = r.state.customers.filter((c) => c.churnedWeek === null)
    expect(getView(r.state).monthlyRevenueCents).toBe(
      active.reduce((sum, c) => sum + c.priceCentsPerMonth, 0),
    )
  })

  it('signs new customers at the price set in the same week', () => {
    // Pain 1 with everything shipped: fit is high enough that some trial converts.
    const base = {
      ...withLeads([lead({ stage: 'trial', stageSinceWeek: 1 })], { pain: 1, shipped: true }),
      week: 3,
    }
    let won = 0
    for (let i = 0; i < 20; i++) {
      const s = { ...base, rng: seedRng(`price${i}`) }
      const customer = endWeek(s, plan({ priceCentsPerMonth: 100 })).state.customers[0]
      if (!customer) continue
      expect(customer.priceCentsPerMonth).toBe(100)
      won++
    }
    expect(won).toBeGreaterThan(5)
  })

  it('issues no invoices outside month ends', () => {
    const s = { ...newGame(), week: 3, customers: [customer('customer_1', 1)] }
    expect(endWeek(s, plan()).state.invoices).toEqual([])
  })

  it('computes churn from fit and bugs, capped', () => {
    let s = newGame('churn')
    const seg = s.hidden.segments.small_offices!
    const churn = s.scenario.sales.churn
    // nothing shipped, so fit is 0
    expect(churnChance(s, 'small_offices')).toBeCloseTo(churn.base + churn.perMisfit, 10)
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
        // The month was still invoiced.
        expect(end.state.invoices).toHaveLength(1)
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
            small_offices: { channel: 'cold_email', hours: 15 },
            coworking: { channel: 'in_person', hours: 15 },
            medical: { channel: 'phone', hours: 15 },
          },
        }),
      ).state
    }
    expect(s.leads.length).toBeGreaterThan(10)
    for (const l of s.leads) {
      const parts = s.scenario.companyNames[l.segmentId]!
      expect(companyNameCombinations(parts)).toContain(l.name)
    }
  })
})
