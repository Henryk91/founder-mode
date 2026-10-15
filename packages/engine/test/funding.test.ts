import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, validatePlan } from '../src/index'
import { netChangeCents } from '../src/systems/finance'
import { founderShareBp, growingHolds } from '../src/systems/funding'
import type { Customer, FundingPlan, GameState, WeekPlan } from '../src/types'
import { plan } from './helpers'

const long = () => {
  const s = loadScenario('kantino', 'long')
  // A quiet inbox, so only funding moves the week.
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}
const game = (seed = 'funding') => createGame(long(), seed)

const fp = (over: Partial<FundingPlan>): Partial<WeekPlan> => ({
  funding: {
    start: null,
    pitchHours: 0,
    secondLooks: [],
    accept: null,
    decline: [],
    stop: false,
    update: null,
    ...over,
  },
})

/** `n` paying customers in one market at `price` a month, signed long ago. */
function withCustomers(s: GameState, n: number, price = 45_000): GameState {
  const customers: Customer[] = Array.from({ length: n }, (_, i) => ({
    id: `customer_${i + 1}`,
    leadId: `lead_${i + 1}`,
    name: `Customer ${i + 1}`,
    segmentId: 'medical',
    sinceWeek: 1,
    churnedWeek: null,
    priceCentsPerMonth: price,
  }))
  return { ...s, customers }
}

/** Plays weeks with an empty plan, then with the funding part given. */
const next = (s: GameState, p: Partial<WeekPlan> = {}) => endWeek(s, plan(p))

describe('funding: what the player sees', () => {
  it('exists only in long mode', () => {
    expect(getView(createGame(loadScenario('kantino'), 'x')).funding).toBeNull()
    const view = getView(game()).funding!
    expect(view.rounds.map((r) => r.id)).toEqual(['angel', 'seed'])
    expect(view.canStart).toBe(true)
    expect(view.founderShareBp).toBe(10_000)
    expect(view.mood).toBeNull()
    expect(JSON.stringify(view)).not.toContain('appetite')
    expect(JSON.stringify(view)).not.toContain('confidence')
  })

  it('refuses funding in the 60 week game and anything that does not fit', () => {
    const std = createGame(loadScenario('kantino'), 'x')
    expect(validatePlan(std, plan(fp({ start: 'angel' })))).toContainEqual({
      code: 'invalid_funding',
    })
    const s = game()
    expect(validatePlan(s, plan(fp({ pitchHours: 3 })))).toContainEqual({
      code: 'invalid_funding',
    })
    expect(validatePlan(s, plan(fp({ update: 'proper' })))).toContainEqual({
      code: 'invalid_funding',
    })
    expect(validatePlan(s, plan(fp({ start: 'angel', pitchHours: 10 })))).toEqual([])
  })
})

describe('funding: the pipeline', () => {
  it('costs prep and pitch hours, and investors pass without paying customers', () => {
    const r = next(game(), fp({ start: 'angel', pitchHours: 10 }))
    // 8 h of deck and numbers, 10 h of pitching: two first meetings of 5 h.
    expect(r.report.plannedHours).toBe(18)
    const met = r.report.entries.filter((e) => e.kind === 'investor_met')
    expect(met).toHaveLength(2)
    for (const m of met) expect(m).toMatchObject({ interested: false, reason: 'too_early' })
    expect(r.state.funding.round?.id).toBe('angel')
    expect(getView(r.state).funding!.canStart).toBe(false)
  })

  it('takes a good company from meeting to term sheet to money at closing', () => {
    let s = withCustomers(game('good'), 12, 60_000)
    let interested: string | undefined
    for (let w = 0; w < 6 && !interested; w++) {
      const r = next(s, fp(w === 0 ? { start: 'angel', pitchHours: 15 } : { pitchHours: 15 }))
      s = r.state
      interested = s.funding.investors.find((i) => i.stage === 'interested')?.id
    }
    expect(interested).toBeDefined()
    let offered: string | undefined
    for (let w = 0; w < 8 && !offered; w++) {
      const look = s.funding.investors.filter((i) => i.stage === 'interested').map((i) => i.id)
      s = next(s, fp({ secondLooks: look, pitchHours: look.length ? 0 : 5 })).state
      offered = s.funding.investors.find((i) => i.stage === 'offered')?.id
    }
    expect(offered).toBeDefined()
    const terms = s.funding.investors.find((i) => i.id === offered)!.terms!
    // Angel: 80,000 to 180,000 EUR at the larger of 1.5 million and 20 times yearly revenue.
    expect(terms.amountCents).toBeGreaterThanOrEqual(8_000_000)
    expect(terms.amountCents).toBeLessThanOrEqual(18_000_000)
    expect(terms.preMoneyCents).toBe(Math.max(150_000_000, 20 * 12 * 12 * 60_000))
    const cashBefore = s.company.cashCents
    const accepted = next(s, fp({ accept: offered! }))
    s = accepted.state
    expect(accepted.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'terms_accepted', closeWeek: s.week - 1 + 3 }),
    )
    s = next(next(s).state).state
    const closing = next(s)
    s = closing.state
    const ledger = s.ledger.at(-1)!
    expect(ledger.investmentCents).toBe(terms.amountCents)
    expect(ledger.revenueCents).toBe(0)
    // Investment never counts as earnings for runway.
    expect(netChangeCents(ledger)).toBeLessThan(0)
    expect(s.company.cashCents).toBeGreaterThan(cashBefore + terms.amountCents - 500_000)
    expect(s.funding.stakes).toHaveLength(1)
    expect(founderShareBp(s.funding.stakes)).toBe(10_000 - terms.shareBp)
    const view = getView(s).funding!
    expect(view.raisedCents).toBe(terms.amountCents)
    expect(view.mood).not.toBeNull()
    expect(view.capTable[0]!.shareBp + view.capTable[1]!.shareBp).toBe(10_000)
  })

  it('offers weak terms before the revenue bar and pays the founder once money arrives', () => {
    // Investors who say yes to anything, so the terms alone are under test.
    const s0 = long()
    const eager = { ...s0, funding: { ...s0.funding!, appetite: { min: 0.0001, max: 0.0002 } } }
    // Four customers at 600 EUR: 2,400 EUR a month, under the angel bar of 3,000.
    let s = withCustomers(createGame(eager, 'weak'), 4, 60_000)
    expect(s.company.fixedCosts.some((c) => c.id === 'founder_salary')).toBe(false)
    let offered: string | undefined
    for (let w = 0; w < 12 && !offered; w++) {
      const look = s.funding.investors.filter((i) => i.stage === 'interested').map((i) => i.id)
      const p = w === 0 ? { start: 'angel' as const, pitchHours: 10 } : { pitchHours: 5 }
      s = next(s, fp({ ...p, secondLooks: look })).state
      offered = s.funding.investors.find((i) => i.stage === 'offered')?.id
    }
    expect(offered).toBeDefined()
    const terms = s.funding.investors.find((i) => i.id === offered)!.terms!
    // A quarter of the 80,000 to 180,000 EUR cheque, at 40% of the 1.5 million floor.
    expect(terms.amountCents).toBeGreaterThanOrEqual(2_000_000)
    expect(terms.amountCents).toBeLessThanOrEqual(5_000_000)
    expect(terms.preMoneyCents).toBe(60_000_000)
    s = next(s, fp({ accept: offered! })).state
    for (let w = 0; w < 4 && s.funding.stakes.length === 0; w++) s = next(s).state
    expect(s.funding.stakes).toHaveLength(1)
    const salary = s.company.fixedCosts.find((c) => c.id === 'founder_salary')
    expect(salary).toMatchObject({ monthlyCents: 250_000 })
    expect(getView(s).company.fixedCosts.map((c) => c.name)).toContain(salary!.name)
  })

  it('draws nothing in a run that never raises', () => {
    let a = game('same')
    let b = game('same')
    for (let w = 0; w < 5; w++) {
      a = next(a).state
      b = next(b, fp({})).state
    }
    expect(a.rng).toEqual(b.rng)
  })
})

describe('funding: the Growing ending', () => {
  it('needs money raised, a year of runway and growth over the quarter', () => {
    let s = withCustomers(game('grow'), 10)
    for (let w = 0; w < 16; w++) s = next(s).state
    expect(growingHolds(s, -100_000)).toBe(false)
    const raised: GameState = {
      ...s,
      funding: {
        ...s.funding,
        stakes: [
          { investorId: 'i', name: 'X', round: 'angel', amountCents: 1, shareBp: 900, week: 1 },
        ],
      },
      company: { ...s.company, cashCents: 50_000_000 },
    }
    // Monthly revenue has not grown over the quarter: no.
    expect(growingHolds(raised, -100_000)).toBe(false)
    const grown = withCustomers(raised, 14)
    expect(growingHolds(grown, -100_000)).toBe(true)
    // Less than 12 months of money at the burn: no.
    expect(growingHolds(grown, -10_000_000)).toBe(false)
  })
})

describe('landing tests in long mode', () => {
  it('allows three per market, so money cannot buy leads without limit', () => {
    let s = game('landing')
    for (let w = 0; w < 3; w++) {
      expect(getView(s).segments.find((x) => x.id === 'medical')!.landingTestsLeft).toBe(3 - w)
      s = next(s, { landing: { medical: 30_000 } }).state
    }
    expect(validatePlan(s, plan({ landing: { medical: 30_000 } }))).toContainEqual({
      code: 'landing_limit',
      segmentId: 'medical',
    })
    expect(
      getView(createGame(loadScenario('kantino'), 'x')).segments[0]!.landingTestsLeft,
    ).toBeNull()
  })
})
