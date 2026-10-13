import { loadScenario, type LoanConfig } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, validatePlan } from '../src/index'
import { netChangeCents } from '../src/systems/finance'
import { hoursByActivity } from '../src/systems/founder'
import { annuityCents, dueCents, judgeLoan, runRateBp } from '../src/systems/loan'
import type { GameState, LoanPlan, Scenario, WeekPlan } from '../src/types'
import { plan } from './helpers'
import { tourismScenario } from './tourism'

const LOAN: LoanConfig = {
  bankName: 'Isartaler Bank',
  planHours: 20,
  meetingHours: 4,
  decisionWeeks: 2,
  retryWeeks: 4,
  ownShare: 0.2,
  unprovenMaxCents: 5_000_000,
  revenueMultiple: 1.5,
  minCents: 1_000_000,
  maxCents: 15_000_000,
  stepCents: 500_000,
  rateBp: { min: 450, max: 750 },
  termMonths: [60, 84, 120],
  graceMonths: [0, 6, 12],
  missedFeeCents: 5_000,
  earlyFeeShare: 0.01,
  maxLoans: 2,
}

const withLoan = (over: Partial<LoanConfig> = {}): Scenario => ({
  ...tourismScenario(),
  loan: { ...LOAN, ...over },
})

const lp = (over: Partial<LoanPlan>): Partial<WeekPlan> => ({
  loan: { planHours: 0, apply: null, accept: false, decline: false, repay: null, ...over },
})

const terms = { amountCents: 2_000_000, termMonths: 60, graceMonths: 6 }

/** Plays weeks with the same plan part until `until` holds or the run ends. */
function playUntil(s: GameState, p: Partial<WeekPlan>, until: (s: GameState) => boolean) {
  let state = s
  for (let i = 0; i < 60 && state.status === 'running' && !until(state); i++) {
    state = endWeek(state, plan(p)).state
  }
  return state
}

/** Writes the plan, applies, and accepts the offer: the loan is paid out at the next month end. */
function borrow(s: GameState, t = terms): GameState {
  let state = endWeek(s, plan(lp({ planHours: 20, apply: t }))).state
  state = playUntil(state, {}, (x) => x.loan!.offer !== null)
  state = endWeek(state, plan(lp({ accept: true }))).state
  return playUntil(state, {}, (x) => x.loan!.loans.length > 0)
}

describe('the bank loan', () => {
  it('exists only where a scenario offers it', () => {
    const s = createGame(loadScenario('kantino'), 'x')
    expect(s.loan).toBeNull()
    expect(getView(s).loan).toBeNull()
    expect(validatePlan(s, plan(lp({ planHours: 2 })))).toContainEqual({
      code: 'invalid_loan',
    })
  })

  it('needs the business plan written before an application, and counts its hours', () => {
    const s = createGame(withLoan(), 'plan')
    expect(validatePlan(s, plan(lp({ apply: terms })))).toContainEqual({
      code: 'invalid_loan',
    })
    expect(validatePlan(s, plan(lp({ planHours: 21 })))).toContainEqual({
      code: 'invalid_loan',
    })
    expect(validatePlan(s, plan(lp({ planHours: 20, apply: terms })))).toEqual([])
    expect(hoursByActivity(s, plan(lp({ planHours: 20, apply: terms }))).admin).toBe(24)
    const half = endWeek(s, plan(lp({ planHours: 10 }))).state
    expect(half.loan!.planHours).toBe(10)
    expect(getView(half).loan!.planHours).toBe(10)
  })

  it('answers after the decision weeks, judging only visible numbers', () => {
    const s = createGame(withLoan(), 'judge')
    // 9,000 EUR of own money carries at most 36,000 EUR of borrowing at a fifth.
    expect(judgeLoan(s, { ...terms, amountCents: 4_000_000 })).toBe('own_money')
    // Before any guest paid, the bank lends up to its unproven ceiling.
    expect(judgeLoan(createGame(withLoan({ unprovenMaxCents: 1_500_000 }), 'j'), terms)).toBe(
      'no_guests',
    )
    expect(judgeLoan(s, terms)).toBeNull()
    let state = endWeek(s, plan(lp({ planHours: 20, apply: terms }))).state
    expect(state.loan!.application!.decideWeek).toBe(3)
    state = endWeek(state, plan()).state
    expect(state.loan!.offer).toBeNull()
    state = endWeek(state, plan()).state
    const offer = state.loan!.offer!
    expect(offer.rateBp).toBe(runRateBp(s))
    expect(offer.rateBp).toBeGreaterThanOrEqual(450)
    expect(offer.rateBp).toBeLessThanOrEqual(750)
    expect(offer.paymentCents).toBe(annuityCents(2_000_000, offer.rateBp, 54))
  })

  it('refuses in plain words, and asks for half a plan before the next try', () => {
    let s = createGame(withLoan(), 'refuse')
    s = endWeek(s, plan(lp({ planHours: 20, apply: { ...terms, amountCents: 4_000_000 } }))).state
    s = playUntil(s, {}, (x) => x.loan!.refusal !== null)
    expect(s.loan!.refusal!.reason).toBe('own_money')
    expect(s.loan!.planNeeded).toBe(10)
    expect(validatePlan(s, plan(lp({ planHours: 10, apply: terms })))).toContainEqual({
      code: 'invalid_loan',
    })
  })

  it('pays out at a month end as loan money, not revenue, and charges interest only at first', () => {
    const s = borrow(createGame(withLoan(), 'pay'))
    const loan = s.loan!.loans[0]!
    expect(loan.balanceCents).toBe(2_000_000)
    const l = s.ledger.at(-1)!
    expect(l.loanInCents).toBe(2_000_000)
    expect(l.revenueCents).toBe(0)
    expect(netChangeCents({ ...l, loanInCents: 0 })).toBe(netChangeCents(l))
    expect(dueCents(loan).principal).toBe(0)
    const next = playUntil(s, {}, (x) => x.loan!.loans[0]!.months === 1)
    expect(next.loan!.loans[0]!.interestPaidCents).toBe(
      Math.round((2_000_000 * loan.rateBp) / 10_000 / 12),
    )
    expect(next.loan!.loans[0]!.balanceCents).toBe(2_000_000)
  })

  it('clears the balance with the annuity by the end of the term', () => {
    const cfg = { rate: 600, months: 60 }
    let balance = 2_000_000
    const pay = annuityCents(balance, cfg.rate, cfg.months)
    const loan = {
      id: 'l',
      principalCents: balance,
      balanceCents: balance,
      rateBp: cfg.rate,
      termMonths: cfg.months,
      graceMonths: 0,
      startWeek: 1,
      months: 0,
      paymentCents: pay,
      interestPaidCents: 0,
      feesCents: 0,
      missedInRow: 0,
      missedTotal: 0,
      status: 'running' as const,
    }
    for (let m = 0; m < cfg.months; m++) {
      const due = dueCents({ ...loan, balanceCents: balance, months: m })
      balance -= due.principal
    }
    expect(balance).toBe(0)
  })

  it('misses a payment the company and savings cannot meet, and the second ends the run', () => {
    // A quiet inbox, so only the loan payment is in question.
    const quiet = withLoan()
    const scenario = { ...quiet, inbox: { ...quiet.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
    let s = borrow(createGame(scenario, 'miss'), { ...terms, graceMonths: 0 })
    s = {
      ...s,
      company: { ...s.company, cashCents: 0 },
      founder: { ...s.founder, savingsCents: 0, livingCostCentsPerWeek: 0 },
      scenario: { ...s.scenario, start: { ...s.scenario.start } },
    }
    // No fixed costs either, so only the loan payment is in question.
    s = { ...s, company: { ...s.company, fixedCosts: [] } }
    s = playUntil(s, {}, (x) => x.loan!.loans[0]!.missedTotal > 0)
    const loan = s.loan!.loans[0]!
    expect(loan.missedInRow).toBe(1)
    expect(loan.feesCents).toBe(5_000)
    expect(s.status).toBe('running')
    s = playUntil(s, {}, (x) => x.status === 'ended')
    expect(s.ending).toBe('bank_called')
  })

  it('repays early with a fee', () => {
    let s = borrow(createGame(withLoan(), 'early'))
    s = { ...s, company: { ...s.company, cashCents: 5_000_000 } }
    const id = s.loan!.loans[0]!.id
    s = playUntil(s, lp({ repay: id }), (x) => x.loan!.loans[0]!.status !== 'running')
    const loan = s.loan!.loans[0]!
    expect(loan.status).toBe('repaid')
    expect(loan.balanceCents).toBe(0)
    expect(loan.feesCents).toBe(20_000)
  })
})
