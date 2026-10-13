import type { LoanConfig } from '@founder-mode/content'
import { Rng, seedRng } from '../rng'
import type {
  GameState,
  Loan,
  LoanPlan,
  LoanRefusal,
  LoanState,
  LoanTerms,
  LoanView,
  ReportEntry,
  WeekPlan,
} from '../types'
import { bookingsRevenueOrSubscriptions } from './bookings'

/**
 * The bank loan (step 6, docs/loan-proposal.md). A business plan in hours, an application the
 * bank judges on visible numbers only, an offer at a rate drawn once per run, monthly repayments
 * at month ends, and default after a second missed payment in a row.
 */

export const loanConfig = (state: GameState): LoanConfig | null => state.scenario.loan ?? null

export function initialLoan(cfg: LoanConfig | undefined): LoanState | null {
  if (!cfg) return null
  return {
    planHours: 0,
    planNeeded: cfg.planHours,
    application: null,
    offer: null,
    accepted: null,
    refusal: null,
    loans: [],
  }
}

/** The run's fixed rate, from its own stream so the game's draws are untouched. */
export function runRateBp(state: GameState): number {
  const cfg = loanConfig(state)!
  const r = new Rng(seedRng(`${state.seed}/loan`))
  return r.int(cfg.rateBp.min, cfg.rateBp.max)
}

/** Own money the founder put in: the company's starting money and every transfer from savings. */
export function ownMoneyCents(state: GameState): number {
  return (
    state.scenario.start.cashCents +
    state.ledger.reduce((t, l) => t + l.transferCents + l.autoTransferCents, 0)
  )
}

const borrowedCents = (state: GameState) =>
  (state.loan?.loans ?? [])
    .filter((l) => l.status === 'running')
    .reduce((t, l) => t + l.principalCents, 0)

/** The most the bank lends now: before any guest paid, then from the last four weeks' revenue. */
export function ceilingCents(state: GameState): number {
  const cfg = loanConfig(state)!
  const monthly = bookingsRevenueOrSubscriptions(state)
  const proven = monthly > 0 ? cfg.revenueMultiple * monthly * 12 : 0
  return Math.min(cfg.maxCents, Math.max(cfg.unprovenMaxCents, Math.round(proven)))
}

/** The bank's answer to an application: the main reason to refuse, or null for an offer. */
export function judgeLoan(state: GameState, terms: LoanTerms): LoanRefusal | null {
  const cfg = loanConfig(state)!
  const loans = state.loan?.loans ?? []
  if (loans.some((l) => l.missedTotal > 0)) return 'missed_payment'
  if (loans.filter((l) => l.status === 'running').length >= cfg.maxLoans) return 'too_many'
  const own = ownMoneyCents(state)
  const borrowed = borrowedCents(state) + terms.amountCents
  if (own < cfg.ownShare * (own + borrowed)) return 'own_money'
  if (borrowedCents(state) + terms.amountCents > ceilingCents(state)) return 'no_guests'
  return null
}

/** The fixed monthly payment that clears `balance` in `months` at a yearly rate in basis points. */
export function annuityCents(balance: number, rateBp: number, months: number): number {
  if (months <= 0) return balance
  const r = rateBp / 10_000 / 12
  if (r === 0) return Math.ceil(balance / months)
  return Math.ceil((balance * r) / (1 - Math.pow(1 + r, -months)))
}

const monthlyInterest = (balance: number, rateBp: number) =>
  Math.round((balance * rateBp) / 10_000 / 12)

/** What a loan asks at its next month end: interest only in the free months, then the annuity. */
export function dueCents(loan: Loan): { interest: number; principal: number } {
  const interest = monthlyInterest(loan.balanceCents, loan.rateBp)
  if (loan.months < loan.graceMonths) return { interest, principal: 0 }
  const principal = Math.min(loan.balanceCents, Math.max(0, loan.paymentCents - interest))
  const last = loan.months + 1 >= loan.termMonths
  return { interest, principal: last ? loan.balanceCents : principal }
}

const noPlan = (): LoanPlan => ({
  planHours: 0,
  apply: null,
  accept: false,
  decline: false,
  repay: null,
})

/** Founder hours the loan takes this week: the business plan, and the meeting when applying. */
export function loanHours(state: GameState, plan: WeekPlan): number {
  const cfg = loanConfig(state)
  if (!cfg || !plan.loan) return 0
  return plan.loan.planHours + (plan.loan.apply ? cfg.meetingHours : 0)
}

/** Whether the loan part of a plan can happen this week. */
export function loanValid(state: GameState, plan: WeekPlan): boolean {
  const p = plan.loan
  if (!p) return true
  const cfg = loanConfig(state)
  const l = state.loan
  if (!cfg || !l) return false
  if (!Number.isInteger(p.planHours) || p.planHours < 0) return false
  if (p.planHours > Math.max(0, l.planNeeded - l.planHours)) return false
  if (p.apply) {
    const t = p.apply
    const ready = l.planHours + p.planHours >= l.planNeeded
    const waiting = l.refusal !== null && state.week < l.refusal.week + cfg.retryWeeks
    if (!ready || waiting || l.application || l.offer || l.accepted) return false
    if (t.amountCents < cfg.minCents || t.amountCents > cfg.maxCents) return false
    if (t.amountCents % cfg.stepCents !== 0) return false
    if (!cfg.termMonths.includes(t.termMonths) || !cfg.graceMonths.includes(t.graceMonths)) {
      return false
    }
  }
  if ((p.accept || p.decline) && !l.offer) return false
  if (p.accept && p.decline) return false
  if (p.repay !== null && !l.loans.some((x) => x.id === p.repay && x.status === 'running')) {
    return false
  }
  return true
}

/**
 * The week's loan steps before finance: plan hours, a new application, the bank's answer when
 * due, and accepting or declining an offer. Money moves at month ends in `settleLoans`.
 */
export function applyLoan(
  state: GameState,
  plan: WeekPlan,
): { state: GameState; entries: ReportEntry[] } {
  const cfg = loanConfig(state)
  const l0 = state.loan
  if (!cfg || !l0) return { state, entries: [] }
  const p = plan.loan ?? noPlan()
  const entries: ReportEntry[] = []
  let l: LoanState = { ...l0, planHours: Math.min(l0.planNeeded, l0.planHours + p.planHours) }
  if (p.accept && l.offer) {
    const { amountCents, termMonths, graceMonths, rateBp } = l.offer
    l = { ...l, accepted: { amountCents, termMonths, graceMonths, rateBp }, offer: null }
    entries.push({ kind: 'loan_accepted', amountCents })
  } else if (p.decline && l.offer) {
    l = { ...l, offer: null, planHours: 0, planNeeded: Math.ceil(cfg.planHours / 2) }
  }
  if (p.apply) {
    l = { ...l, application: { ...p.apply, decideWeek: state.week + cfg.decisionWeeks } }
    entries.push({ kind: 'loan_applied', amountCents: p.apply.amountCents })
  }
  if (l.application && state.week >= l.application.decideWeek) {
    const { amountCents, termMonths, graceMonths } = l.application
    const terms = { amountCents, termMonths, graceMonths }
    const reason = judgeLoan(state, terms)
    if (reason) {
      l = {
        ...l,
        application: null,
        refusal: { reason, week: state.week },
        planHours: 0,
        planNeeded: Math.ceil(cfg.planHours / 2),
      }
      entries.push({ kind: 'loan_refused', reason })
    } else {
      // Riskier loans cost more: the spread for borrowing beyond the founder's own money.
      const own = Math.max(1, ownMoneyCents(state))
      const leverage = (borrowedCents(state) + terms.amountCents) / own
      const rateBp =
        runRateBp(state) + Math.round((cfg.leverageSpreadBp ?? 0) * Math.max(0, leverage - 1))
      const free = terms.termMonths - terms.graceMonths
      const paymentCents = annuityCents(terms.amountCents, rateBp, free)
      l = {
        ...l,
        application: null,
        refusal: null,
        offer: { ...terms, rateBp, paymentCents, week: state.week },
      }
      entries.push({ kind: 'loan_offer', amountCents: terms.amountCents, rateBp, paymentCents })
    }
  }
  return { state: { ...state, loan: l }, entries }
}

export type LoanMoney = {
  inCents: number
  principalCents: number
  interestCents: number
  feeCents: number
}

/**
 * Month end: pays out an accepted loan, then each running loan's payment (or the whole balance
 * with the early fee when the plan repays it). A payment that company cash and savings together
 * cannot meet is missed: a fee joins the balance. Returns the money moved.
 */
export function settleLoans(
  state: GameState,
  plan: WeekPlan,
  available: number,
  monthEnd: boolean,
): { state: GameState; money: LoanMoney; entries: ReportEntry[] } {
  const money: LoanMoney = { inCents: 0, principalCents: 0, interestCents: 0, feeCents: 0 }
  const cfg = loanConfig(state)
  const l0 = state.loan
  if (!cfg || !l0 || !monthEnd) return { state, money, entries: [] }
  const entries: ReportEntry[] = []
  let left = available
  const loans: Loan[] = []
  for (const loan of l0.loans) {
    if (loan.status !== 'running') {
      loans.push(loan)
      continue
    }
    const repayAll = plan.loan?.repay === loan.id
    const due = repayAll
      ? {
          interest: monthlyInterest(loan.balanceCents, loan.rateBp),
          principal: loan.balanceCents,
        }
      : dueCents(loan)
    const fee = repayAll ? Math.round(loan.balanceCents * cfg.earlyFeeShare) : 0
    const total = due.interest + due.principal + fee
    if (total <= left) {
      left -= total
      money.interestCents += due.interest
      money.principalCents += due.principal
      money.feeCents += fee
      const balance = loan.balanceCents - due.principal
      const next: Loan = {
        ...loan,
        balanceCents: balance,
        months: loan.months + 1,
        interestPaidCents: loan.interestPaidCents + due.interest,
        feesCents: loan.feesCents + fee,
        missedInRow: 0,
        status: balance <= 0 ? 'repaid' : 'running',
      }
      // The payment is set once the free months end, on what is owed then.
      if (next.status === 'running' && next.months === loan.graceMonths && loan.graceMonths > 0) {
        next.paymentCents = annuityCents(balance, loan.rateBp, loan.termMonths - loan.graceMonths)
      }
      loans.push(next)
      entries.push({
        kind: 'loan_payment',
        amountCents: total,
        interestCents: due.interest,
        balanceCents: balance,
      })
      if (next.status === 'repaid') entries.push({ kind: 'loan_repaid', name: cfg.bankName })
    } else {
      const missed: Loan = {
        ...loan,
        balanceCents: loan.balanceCents + due.interest + cfg.missedFeeCents,
        months: loan.months + 1,
        feesCents: loan.feesCents + cfg.missedFeeCents,
        missedInRow: loan.missedInRow + 1,
        missedTotal: loan.missedTotal + 1,
        firstMissedWeek: loan.firstMissedWeek ?? state.week,
      }
      if (missed.missedInRow >= 2) missed.status = 'called'
      loans.push(missed)
      entries.push({
        kind: 'loan_missed',
        amountCents: total,
        feeCents: cfg.missedFeeCents,
        inRow: missed.missedInRow,
      })
    }
  }
  let accepted = l0.accepted
  if (accepted) {
    const id = `loan_${loans.length + 1}`
    loans.push({
      id,
      principalCents: accepted.amountCents,
      balanceCents: accepted.amountCents,
      rateBp: accepted.rateBp,
      termMonths: accepted.termMonths,
      graceMonths: accepted.graceMonths,
      startWeek: state.week,
      months: 0,
      paymentCents: annuityCents(
        accepted.amountCents,
        accepted.rateBp,
        accepted.termMonths - accepted.graceMonths,
      ),
      interestPaidCents: 0,
      feesCents: 0,
      missedInRow: 0,
      missedTotal: 0,
      status: 'running',
    })
    money.inCents += accepted.amountCents
    entries.push({ kind: 'loan_paid_out', amountCents: accepted.amountCents, name: cfg.bankName })
    accepted = null
  }
  return { state: { ...state, loan: { ...l0, loans, accepted } }, money, entries }
}

/** A running loan with its last payment missed. */
export const loanMissed = (state: GameState) =>
  (state.loan?.loans ?? []).some((l) => l.status === 'running' && l.missedInRow > 0)

/** True once the bank has called a loan: the run ends. */
export const loanCalled = (state: GameState) =>
  (state.loan?.loans ?? []).some((l) => l.status === 'called')

/** What the player sees of the loan: the plan, the application, the offer, the loans. */
export function loanView(state: GameState): LoanView | null {
  const cfg = loanConfig(state)
  const l = state.loan
  if (!cfg || !l) return null
  return {
    bankName: cfg.bankName,
    planHours: l.planHours,
    planNeeded: l.planNeeded,
    meetingHours: cfg.meetingHours,
    ownShare: cfg.ownShare,
    ownMoneyCents: ownMoneyCents(state),
    minCents: cfg.minCents,
    maxCents: cfg.maxCents,
    stepCents: cfg.stepCents,
    termMonths: cfg.termMonths,
    graceMonths: cfg.graceMonths,
    canApplyFrom: l.refusal !== null ? l.refusal.week + cfg.retryWeeks : null,
    application: l.application,
    offer: l.offer,
    accepted: l.accepted,
    refusal: l.refusal,
    loans: l.loans.map((x) => {
      const due = dueCents(x)
      return {
        id: x.id,
        principalCents: x.principalCents,
        balanceCents: x.balanceCents,
        rateBp: x.rateBp,
        nextPaymentCents: x.status === 'running' ? due.interest + due.principal : 0,
        monthsLeft: Math.max(0, x.termMonths - x.months),
        freeMonthsLeft: Math.max(0, x.graceMonths - x.months),
        interestPaidCents: x.interestPaidCents,
        missedInRow: x.missedInRow,
        status: x.status,
      }
    }),
  }
}
