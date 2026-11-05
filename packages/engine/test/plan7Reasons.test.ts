import { describe, expect, it } from 'vitest'
import {
  buildPostMortem,
  endWeek,
  getView,
  shutDown,
  validatePlan,
  type GameState,
} from '../src/index'
import { canAsk, honesty, missingFeatures, recordLosses } from '../src/systems/losses'
import type { Customer, Lead, LostReason, Scenario } from '../src/types'
import { kantino, newGame, plan, richKantino } from './helpers'

const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  id,
  name: `Firma ${id}`,
  segmentId: 'small_offices',
  stage: 'demo',
  source: 'outreach',
  stageSinceWeek: 1,
  lastContactWeek: 1,
  silentSinceWeek: null,
  lostReason: null,
  ...over,
})

/** A game in week 5 with every must have of small offices shipped or not. */
function game(shipped: boolean, scenario: Scenario = kantino(), seed = 'reasons'): GameState {
  const s = newGame(seed, scenario)
  const must = s.hidden.segments.small_offices!.mustHave
  return {
    ...s,
    week: 5,
    product: {
      ...s.product,
      features: s.product.features.map((f) =>
        shipped && must.includes(f.id) ? { ...f, shippedWeek: 1 } : f,
      ),
    },
  }
}

/** Loses `n` leads of small offices this week with `reason`, and records the losses. */
function lose(before: GameState, n: number, reason: LostReason): GameState {
  const ids = Array.from({ length: n }, (_, i) => `lead_${i + 1}`)
  const b = { ...before, leads: ids.map((id) => lead(id)) }
  const after = {
    ...b,
    leads: ids.map((id) => lead(id, { stage: 'lost', stageSinceWeek: 5, lostReason: reason })),
  }
  return recordLosses(b, after, plan(), []).state
}

/** Kantino where everyone says something with the loss. */
function talkative(): Scenario {
  const s = kantino()
  return { ...s, sales: { ...s.sales, losses: { ...s.sales.losses!, unpromptedShare: 1 } } }
}

describe('plan 7: real causes of losses', () => {
  it('names the cause the engine used: price, silence, a refund for a missing feature', () => {
    const s = game(false)
    const causes = (st: GameState) => Object.values(st.hidden.lossCauses ?? {})
    expect(causes(lose(s, 3, 'price')).map((c) => c.cause)).toEqual(['price', 'price', 'price'])
    const silent = lose(s, 2, 'silent')
    expect(causes(silent).map((c) => c.cause)).toEqual(['silent', 'silent'])
    expect(silent.losses!.every((l) => !l.askable)).toBe(true)
    for (const c of causes(lose(s, 5, 'refunded'))) {
      expect(c.cause).toBe('missing_feature')
      expect(missingFeatures(s, 'small_offices')).toContain(c.featureId)
    }
  })

  it('picks a decline cause by its share: missing features while they are missing', () => {
    const missing = Object.values(lose(game(false), 200, 'declined').hidden.lossCauses!)
    const shipped = Object.values(lose(game(true), 200, 'declined').hidden.lossCauses!)
    const share = (list: { cause: string }[], c: string) =>
      list.filter((x) => x.cause === c).length / list.length
    expect(share(missing, 'missing_feature')).toBeGreaterThan(0.5)
    expect(share(shipped, 'missing_feature')).toBe(0)
    expect(share(shipped, 'no_need') + share(shipped, 'quality') + share(shipped, 'price')).toBe(1)
  })

  it('says no need mostly in markets without enough pain (spec 3.1)', () => {
    const withPain = (pain: number) => {
      const s = game(true)
      const seg = s.hidden.segments.small_offices!
      const st = {
        ...s,
        product: { ...s.product, bugs: 0, quality: s.scenario.product.startQuality },
        hidden: {
          ...s.hidden,
          segments: { ...s.hidden.segments, small_offices: { ...seg, pain } },
        },
      }
      const causes = Object.values(lose(st, 300, 'declined').hidden.lossCauses!)
      return causes.filter((c) => c.cause === 'no_need').length / causes.length
    }
    // A pained market with nothing missing says the price or that it lives with the pain.
    expect(withPain(0.8)).toBeLessThan(0.4)
    expect(withPain(0.2)).toBe(1)
  })

  it('records customers who left: cancelled with weeks paid, or stopped paying', () => {
    const s = game(true)
    const customer = (id: string, over: Partial<Customer> = {}): Customer => ({
      id,
      leadId: `lead_${id}`,
      name: `Kunde ${id}`,
      segmentId: 'small_offices',
      sinceWeek: 1,
      churnedWeek: null,
      priceCentsPerMonth: 45_000,
      ...over,
    })
    const before = { ...s, customers: [customer('c1'), customer('c2'), customer('c3')] }
    const after = {
      ...before,
      customers: [
        customer('c1', { churnedWeek: 5, churnReason: 'price' }),
        customer('c2', { churnedWeek: 5, churnReason: 'stopped_paying' }),
        customer('c3', { churnedWeek: 5 }),
      ],
    }
    const r = recordLosses(before, after, plan(), [
      {
        kind: 'customer_churned',
        customerId: 'c1',
        name: 'Kunde c1',
        segmentId: 'small_offices',
        overPrice: true,
      },
    ])
    expect(r.state.losses!.map((l) => [l.tag, l.paidWeeks, l.askable])).toEqual([
      ['cancelled', 4, true],
      ['stopped_paying', 4, false],
      ['cancelled', 4, true],
    ])
    expect(r.state.hidden.lossCauses!['loss_1']!.cause).toBe('price')
    expect(r.state.hidden.lossCauses!['loss_2']!.cause).toBe('stopped_paying')
    expect(r.entries[0]).toMatchObject({ lossId: 'loss_1' })
  })
})

describe('plan 7: what they say', () => {
  it('says the real cause more often in a blunt market than in a polite one', () => {
    const truth = (politeness: number) => {
      let s = game(false, talkative())
      s = {
        ...s,
        hidden: {
          ...s.hidden,
          segments: {
            ...s.hidden.segments,
            small_offices: { ...s.hidden.segments.small_offices!, politeness },
          },
        },
      }
      const after = lose(s, 400, 'declined')
      const honest = after.losses!.filter(
        (l) => l.stated!.kind === after.hidden.lossCauses![l.id]!.cause,
      ).length
      return { share: honest / 400, expected: honesty(after, 'small_offices'), after }
    }
    const blunt = truth(0.1)
    const polite = truth(0.6)
    expect(blunt.expected).toBeGreaterThan(0.8)
    expect(polite.expected).toBeLessThan(0.65)
    expect(Math.abs(blunt.share - blunt.expected)).toBeLessThan(0.07)
    expect(Math.abs(polite.share - polite.expected)).toBeLessThan(0.07)
    // Otherwise a softer reason; a missing feature is named when they tell the truth about it.
    for (const l of polite.after.losses!) {
      const real = polite.after.hidden.lossCauses![l.id]!
      if (l.stated!.kind === real.cause) {
        expect(l.stated!.featureId).toBe(real.featureId)
        if (real.featureId) {
          const f = kantino().features.find((x) => x.id === real.featureId)!
          expect(l.stated!.text).toContain(f.missing ?? f.name)
        }
      } else expect(['budget_freeze', 'bad_timing', 'next_year']).toContain(l.stated!.kind)
      expect(l.stated!.text).not.toContain('{need}')
      expect(l.stated!.text.length).toBeGreaterThan(10)
    }
  })

  it('gives a reason unprompted about a fifth of the time', () => {
    const after = lose(game(false), 1000, 'declined')
    const said = after.losses!.filter((l) => l.stated !== null).length / 1000
    expect(said).toBeGreaterThan(0.16)
    expect(said).toBeLessThan(0.24)
  })
})

describe('plan 7: asking why', () => {
  /** A real game in a week after some losses, with every loss asked about at once. */
  function withLosses(): GameState {
    let s = newGame('ask', richKantino())
    for (let w = 0; w < 30 && (s.losses ?? []).filter((l) => canAsk(s, l)).length < 3; w++) {
      const v = getView(s)
      const demos = v.leads.filter((l) => l.canBookDemo).map((l) => l.id)
      s = endWeek(s, plan({ outreach: { coworking: { in_person: 20 } }, demos })).state
    }
    return s
  }

  it('costs an hour, answers the next week about two thirds of the time, within four weeks', () => {
    const s = withLosses()
    const open = getView(s).losses.filter((l) => l.canAsk)
    expect(open.length).toBeGreaterThan(0)
    expect(getView(s).costs.askWhyHours).toBe(1)
    const ask = plan({ askWhy: [open[0]!.id] })
    expect(validatePlan(s, ask)).toEqual([])
    const r = endWeek(s, ask)
    expect(r.report.plannedHours).toBe(1)
    const after = getView(r.state).losses.find((l) => l.id === open[0]!.id)!
    expect(after.askedWeek).toBe(s.week)
    expect(after.canAsk).toBe(false)
    if (after.stated) {
      expect(after.stated).toMatchObject({ asked: true, week: s.week + 1 })
    } else expect(after.unanswered).toBe(true)
    // Asked twice, or unknown: refused.
    expect(validatePlan(r.state, plan({ askWhy: [open[0]!.id] })).map((i) => i.code)).toEqual([
      'invalid_ask',
    ])
    expect(validatePlan(s, plan({ askWhy: ['loss_999'] })).map((i) => i.code)).toEqual([
      'invalid_ask',
    ])
  })

  it('answers about two thirds of the asks', () => {
    let answered = 0
    let asked = 0
    for (let i = 0; i < 12; i++) {
      let s = newGame(`answers-${i}`, richKantino())
      for (let w = 0; w < 40 && s.status === 'running'; w++) {
        const v = getView(s)
        const demos = v.leads.filter((l) => l.canBookDemo).map((l) => l.id)
        const askWhy = v.losses.filter((l) => l.canAsk).map((l) => l.id)
        asked += askWhy.length
        s = endWeek(s, plan({ outreach: { coworking: { in_person: 20 } }, demos, askWhy })).state
      }
      answered += (s.losses ?? []).filter((l) => l.stated?.asked).length
    }
    expect(asked).toBeGreaterThan(100)
    expect(answered / asked).toBeGreaterThan(0.57)
    expect(answered / asked).toBeLessThan(0.77)
  })

  it('cannot be asked after four weeks', () => {
    let s = withLosses()
    const loss = getView(s).losses.find((l) => l.canAsk)!
    while (s.week <= loss.askUntilWeek) s = endWeek(s, plan()).state
    expect(getView(s).losses.find((l) => l.id === loss.id)!.canAsk).toBe(false)
    expect(validatePlan(s, plan({ askWhy: [loss.id] })).map((i) => i.code)).toContain('invalid_ask')
  })

  it('never shows the real cause during the run', () => {
    const s = withLosses()
    const text = JSON.stringify(getView(s))
    expect(text).not.toContain('lossCauses')
    expect(text).not.toMatch(/"cause":/)
    for (const l of getView(s).losses) expect(Object.keys(l)).not.toContain('cause')
  })
})

describe('plan 7: the post-mortem (R2)', () => {
  it('counts stated reasons against real causes per market', () => {
    let s = newGame('pm7', talkative())
    for (let w = 0; w < 20; w++) {
      const v = getView(s)
      const demos = v.leads.filter((l) => l.canBookDemo).map((l) => l.id)
      s = endWeek(s, plan({ outreach: { coworking: { in_person: 25 } }, demos })).state
    }
    s = shutDown(s)
    const pm = buildPostMortem(s)
    const lines = pm.lossReasons!
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      const here = s.losses!.filter((l) => l.segmentId === line.segmentId)
      expect(line.losses).toBe(here.length)
      const saidTotal = line.said.reduce((t, x) => t + x.count, 0)
      expect(saidTotal + line.unsaid).toBe(line.losses)
      for (const said of line.said) {
        expect(said.real.reduce((t, r) => t + r.count, 0)).toBe(said.count)
        const behind = here.filter((l) => l.stated?.kind === said.kind)
        for (const r of said.real) {
          const n = behind.filter((l) => {
            const real = s.hidden.lossCauses![l.id]!
            return real.cause === r.cause && real.featureId === r.featureId
          }).length
          expect(n).toBe(r.count)
        }
      }
    }
  })
})
