import { describe, expect, it } from 'vitest'
import { companyNameCombinations } from '@founder-mode/content'
import { endWeek, getView, validatePlan } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import {
  churnChance,
  distinctWord,
  effectiveHours,
  pickName,
  recentOutreach,
} from '../src/systems/sales'
import type { GameState, Lead } from '../src/types'
import { informedPlan, newGame, plan, richKantino } from './helpers'

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'lead_1',
  name: 'Testfirma',
  segmentId: 'small_offices',
  stage: 'lead',
  source: 'outreach',
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
        plan({ outreach: { small_offices: { channel: 'cold_email', hours: 12 } } }),
      )
      total += r.state.leads.length
      const entry = r.report.entries.find((e) => e.kind === 'new_leads')
      expect(entry).toMatchObject({ segmentId: 'small_offices', channel: 'cold_email' })
      expect(r.state.leads.every((l) => l.stage === 'lead' || l.stage === 'demo')).toBe(true)
    }
    // mean cold email response * 12 h * (sellingBase + starting skill), from the scenario
    const sc = newGame().scenario
    const r = sc.segments.find((x) => x.id === 'small_offices')!.channelResponse.cold_email
    const expected = ((r.min + r.max) / 2) * 12 * (sc.sales.sellingBase + sc.start.skills.selling)
    expect(total / runs).toBeGreaterThan(expected * 0.75)
    expect(total / runs).toBeLessThan(expected * 1.25)
  })

  it('finds fewer leads per hour beyond the saturation hours on one channel', () => {
    // One week alone stays within 3 x 12 h; three weeks of 30 h on the same channel do not.
    const inPerson = { coworking: { channel: 'in_person' as const, hours: 30 } }
    let s = newGame('window')
    for (let i = 0; i < 2; i++) s = endWeek(s, plan({ outreach: inPerson })).state
    expect(recentOutreach(s).get('coworking/in_person')).toBe(60)
    s = endWeek(s, plan()).state
    expect(recentOutreach(s).get('coworking/in_person')).toBe(30)
    expect(effectiveHours(0, 10, 12, 0.3)).toBe(10)
    expect(effectiveHours(0, 20, 12, 0.3)).toBeCloseTo(12 + 8 * 0.3, 10)
    expect(effectiveHours(12, 5, 12, 0.3)).toBeCloseTo(1.5, 10)
    const leads = (hours: number) => {
      let total = 0
      for (let i = 0; i < 200; i++) {
        const s = newGame(`sat-${i}`)
        const out = { coworking: { channel: 'in_person' as const, hours } }
        total += endWeek(s, plan({ outreach: out })).state.leads.length
      }
      return total
    }
    // In week 1, 60 h count as 36 + 24 * 0.3 = 43.2 h, so about 1.2 times the leads of 36 h.
    expect(leads(60) / leads(36)).toBeGreaterThan(1.05)
    expect(leads(60) / leads(36)).toBeLessThan(1.4)
  })

  it('gives every lead a distinct name without a number, even in a long run', () => {
    let s = newGame('names', richKantino())
    for (let i = 0; i < 59; i++) {
      s = endWeek(s, plan({ outreach: { coworking: { channel: 'in_person', hours: 50 } } })).state
    }
    const names = s.leads.map((l) => l.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeGreaterThan(60)
    for (const name of names) expect(name).not.toMatch(/ \d+$/)
  })

  it('uses every combination before falling back to a number', () => {
    const rng = new Rng(seedRng('pick'))
    const parts = { first: ['A', 'B'], second: ['x', 'y'] }
    const used = new Set<string>()
    for (let i = 0; i < 4; i++) used.add(pickName(parts, used, new Set(), rng))
    expect([...used].sort()).toEqual(['A x', 'A y', 'B x', 'B y'])
    expect(pickName(parts, used, new Set(), rng)).toMatch(/^[AB] [xy] 2$/)
  })

  it('never picks a distinctive word that an open lead still carries', () => {
    const rng = new Rng(seedRng('busy'))
    const parts = { first: ['A', 'B'], second: ['x', 'y'] }
    for (let i = 0; i < 20; i++) {
      expect(pickName(parts, new Set(), new Set(['A']), rng)).toMatch(/^B /)
      expect(pickName({ ...parts, distinct: 'second' }, new Set(), new Set(['x']), rng)).toMatch(
        / y$/,
      )
    }
    // With every word held by an open lead, a fresh name still comes out.
    expect(pickName(parts, new Set(['A x']), new Set(['A', 'B']), rng)).not.toBe('A x')
    expect(
      distinctWord({ first: ['Praxis Dr.', 'Praxis'], second: ['Lorenz'] }, 'Praxis Dr. Lorenz'),
    ).toBe('Praxis Dr.')
    expect(
      distinctWord(
        { first: ['Praxis Dr.'], second: ['Lorenz'], distinct: 'second' },
        'Praxis Dr. Lorenz',
      ),
    ).toBe('Lorenz')
  })

  it('keeps open leads of a market apart by their distinctive word over a long run', () => {
    let s = newGame('names', richKantino())
    let checked = 0
    while (s.status === 'running' && s.week <= 40) {
      s = endWeek(s, informedPlan(s)).state
      for (const seg of s.scenario.segments) {
        const parts = s.scenario.companyNames[seg.id]!
        const words = s.leads
          .filter((l) => l.segmentId === seg.id && l.stage !== 'lost' && l.stage !== 'paying')
          .map((l) => distinctWord(parts, l.name))
        expect(words).not.toContain(null)
        expect(new Set(words).size).toBe(words.length)
        checked += words.length
      }
    }
    expect(checked).toBeGreaterThan(100)
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
    let s = withLeads([lead({ stage: 'trial', stageSinceWeek: 2 })], { pain: 1, shipped: true })
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
            priceCentsPerMonth: 45_000,
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
    priceCentsPerMonth: 45_000,
  })

  it('invoices at month end the customers won before that week, and is paid later', () => {
    let s = newGame()
    s = { ...s, week: 4, customers: [customer('customer_1', 2), customer('customer_2', 4)] }
    const r = endWeek(s, plan())
    expect(r.state.invoices).toHaveLength(1)
    expect(r.state.invoices[0]).toMatchObject({
      customerId: 'customer_1',
      amountCents: 45_000,
      issuedWeek: 4,
      dueWeek: 6,
    })
    expect(r.report.entries).toContainEqual({
      kind: 'invoices_issued',
      amountCents: 45_000,
      count: 1,
    })
    // No money yet: an invoice is paid in a later week.
    expect(r.report.ledger.revenueCents).toBe(0)
    expect(r.state.company.cashCents).toBe(900_000 - 40_500)
  })

  it('invoices every customer the price agreed when they signed', () => {
    const s = {
      ...newGame(),
      week: 4,
      customers: [
        customer('customer_1', 1),
        { ...customer('customer_2', 2), priceCentsPerMonth: 67_500 },
      ],
    }
    // A price change this week applies to new customers only.
    const r = endWeek(s, plan({ priceCentsPerMonth: 135_000 }))
    expect(r.state.invoices.map((i) => i.amountCents)).toEqual([45_000, 67_500])
    expect(r.state.company.priceCentsPerMonth).toBe(135_000)
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
    expect(s.leads.length).toBeGreaterThan(5)
    for (const l of s.leads) {
      const parts = s.scenario.companyNames[l.segmentId]!
      expect(companyNameCombinations(parts)).toContain(l.name)
    }
  })
})

describe('price', () => {
  const customer = (id: string, sinceWeek: number) => ({
    id,
    leadId: id,
    name: id,
    segmentId: 'small_offices',
    sinceWeek,
    churnedWeek: null,
    priceCentsPerMonth: 45_000,
  })
  const trialAt = (seed: string, ratio: number) => {
    const s = withLeads([lead({ stage: 'trial', stageSinceWeek: 1 })], { pain: 1, shipped: true })
    const wtp = s.hidden.segments.small_offices!.wtpCents
    const game = newGame(seed)
    return {
      ...s,
      rng: game.rng,
      week: 3,
      company: { ...s.company, priceCentsPerMonth: Math.max(1, Math.round(wtp * ratio)) },
    }
  }

  it('tells a trial lost over the price apart from a plain no', () => {
    const count = { won: 0, price: 0, declined: 0 }
    for (let i = 0; i < 200; i++) {
      const r = endWeek(trialAt(`p${i}`, 1.5), plan())
      const l = r.state.leads[0]!
      if (l.stage === 'paying') count.won++
      else if (l.lostReason === 'price') {
        count.price++
        expect(r.report.entries).toContainEqual(
          expect.objectContaining({ kind: 'lead_update', change: 'declined_price' }),
        )
        expect(getView(r.state).leads[0]!.lostReason).toBe('price')
      } else if (l.lostReason === 'declined') count.declined++
    }
    // At 1.5 times what they would pay, most trials that would have said yes say no to the price.
    expect(count.price).toBeGreaterThan(count.won)
    expect(count.declined).toBeGreaterThan(0)
  })

  it('names the price for nobody when the price is far below what they would pay', () => {
    for (let i = 0; i < 100; i++) {
      const l = endWeek(trialAt(`q${i}`, 0.1), plan()).state.leads[0]!
      expect(l.lostReason).not.toBe('price')
    }
  })

  it('adds a price share to churn only above what the customer would pay', () => {
    const s = newGame('churn-price')
    const wtp = s.hidden.segments.small_offices!.wtpCents
    const { perPrice, priceFrom } = s.scenario.sales.churn
    const without = churnChance(s, 'small_offices')
    expect(churnChance(s, 'small_offices', wtp)).toBeCloseTo(without, 10)
    expect(churnChance(s, 'small_offices', Math.round(wtp / 2))).toBeCloseTo(without, 10)
    expect(churnChance(s, 'small_offices', wtp * 2)).toBeCloseTo(
      Math.min(s.scenario.sales.churn.cap, without + perPrice * (2 - priceFrom)),
      6,
    )
  })

  it('tells the player when a customer leaves over the price', () => {
    let overPrice = 0
    let other = 0
    for (let i = 0; i < 300; i++) {
      const base = newGame(`cp${i}`)
      const wtp = base.hidden.segments.small_offices!.wtpCents
      const s = {
        ...base,
        week: 4,
        customers: [{ ...customer('customer_1', 1), priceCentsPerMonth: wtp * 3 }],
      }
      const r = endWeek(s, plan())
      const c = r.state.customers[0]!
      if (c.churnedWeek === null) continue
      const entry = r.report.entries.find((e) => e.kind === 'customer_churned')
      expect(entry).toMatchObject({ overPrice: c.churnReason === 'price' })
      if (c.churnReason === 'price') overPrice++
      else other++
    }
    // Twice what they would pay above the line: the price is the larger share of leaving.
    expect(overPrice).toBeGreaterThan(other)
    expect(other).toBeGreaterThan(0)
  })

  it('never puts a churn down to the price at the price they would pay', () => {
    for (let i = 0; i < 200; i++) {
      const base = newGame(`cq${i}`)
      const wtp = base.hidden.segments.small_offices!.wtpCents
      const s = {
        ...base,
        week: 4,
        customers: [{ ...customer('customer_1', 1), priceCentsPerMonth: wtp }],
      }
      const r = endWeek(s, plan())
      expect(r.state.customers[0]!.churnReason).toBeUndefined()
    }
  })
})
