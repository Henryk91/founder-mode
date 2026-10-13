import type { Rng } from '../rng'
import type {
  GameState,
  HoursByActivity,
  Invoice,
  MoneyMovement,
  WeekLedger,
  WeekPlan,
  ReportEntry,
} from '../types'
import { activeCustomers } from './customers'
import { chaseInvoices, isUnpaid, issueInvoices, settleInvoices } from './invoices'
import { settleLoans } from './loan'
import { freelanceMonthlyCents } from './team'

export function monthlyFixedCostsCents(state: GameState): number {
  return state.company.fixedCosts.reduce((sum, c) => sum + c.monthlyCents, 0)
}

/**
 * Company costs per month as the player plans with them: fixed costs plus an open freelance
 * booking at its hours, over a 4 week month.
 */
export function monthlyCompanyCostsCents(state: GameState): number {
  return monthlyFixedCostsCents(state) + freelanceMonthlyCents(state)
}

export function isMonthEnd(state: GameState, week: number): boolean {
  return week % state.scenario.finance.weeksPerMonth === 0
}

/** Money that moves in a week apart from the regular flows, gathered by earlier steps. */
export type WeekExtras = {
  adSpendCents: number
  /** Pre-sale deposits received: money from customers, counted as revenue. */
  depositsCents: number
  /** Late fees, severance, and costs of inbox choices. */
  otherCostsCents: number
  /** Money from inbox choices. */
  otherIncomeCents: number
  /** The freelancer's bill: a company cost like a salary. */
  freelanceCents: number
  /** Investment arriving at a round's closing: cash, never revenue (Part D). */
  investmentCents: number
  /** Tourism: guests' payments on the day, net of commission. Revenue. */
  bookingRevenueCents: number
  /** Tourism: shifts, unit costs and products' one-off costs. Company costs. */
  bookingCostsCents: number
}

export const noExtras = (): WeekExtras => ({
  adSpendCents: 0,
  depositsCents: 0,
  otherCostsCents: 0,
  otherIncomeCents: 0,
  freelanceCents: 0,
  investmentCents: 0,
  bookingRevenueCents: 0,
  bookingCostsCents: 0,
})

/**
 * Weekly money movements (plan section 4.7), in this order:
 * 1. the player's transfer from savings into the company,
 * 2. living costs from savings, any shortfall drawn from company cash,
 * 3. fixed costs from company cash at every month end (every 4th week),
 * 4. ad budgets, fees, and other costs and income of the week,
 * 5. customer payments: invoices whose payment week has come,
 * 6. if company cash is negative, savings cover the gap automatically as far as they can.
 * Then, at a month end, every customer gets their invoice (paid in a later week), and invoices
 * unpaid for too long are written off. Each non zero movement between savings and company is
 * returned as a `MoneyMovement` and written to the event log, so the post-mortem can total the
 * private money put in.
 */
export function applyFinanceWeek(
  input: GameState,
  plan: WeekPlan,
  extras: WeekExtras,
  rng: Rng,
  delegatedChases: readonly string[] = [],
): {
  state: GameState
  ledger: WeekLedger
  movements: MoneyMovement[]
  paid: Invoice[]
  issued: Invoice[]
  writtenOff: Invoice[]
  /** Customers whose service stopped this week because an invoice was written off. */
  stopped: string[]
  /** The bank loan's month end: payout, payments, missed payments. */
  loanEntries: ReportEntry[]
} {
  let state = chaseInvoices(input, plan, rng, delegatedChases)
  let cash = state.company.cashCents
  let savings = state.founder.savingsCents

  const transferCents = plan.transferToCompanyCents
  savings -= transferCents
  cash += transferCents

  const livingCostsCents = state.founder.livingCostCentsPerWeek
  const fromSavings = Math.min(Math.max(savings, 0), livingCostsCents)
  const founderDrawCents = livingCostsCents - fromSavings
  savings -= fromSavings
  cash -= founderDrawCents

  const monthEnd = isMonthEnd(state, state.week)
  const fixedCostsCents = monthEnd ? monthlyFixedCostsCents(state) : 0
  cash -= fixedCostsCents
  cash -= extras.adSpendCents + extras.otherCostsCents + extras.freelanceCents
  cash -= extras.bookingCostsCents
  cash += extras.otherIncomeCents
  cash += extras.investmentCents

  const settled = settleInvoices(state)
  state = settled.state
  // A customer whose invoice is written off stopped paying: their service stops, so they leave
  // the count and the revenue and get no more invoices. Their other open invoices stay open.
  const stopped = [
    ...new Set(
      settled.writtenOff
        .map((i) => i.customerId)
        .filter((id) => state.customers.some((c) => c.id === id && c.churnedWeek === null)),
    ),
  ]
  if (stopped.length > 0) {
    state = {
      ...state,
      customers: state.customers.map((c) =>
        stopped.includes(c.id)
          ? { ...c, churnedWeek: state.week, churnReason: 'stopped_paying' as const }
          : c,
      ),
    }
  }
  const revenueCents =
    settled.paid.reduce((sum, inv) => sum + inv.amountCents, 0) +
    extras.depositsCents +
    extras.bookingRevenueCents
  cash += revenueCents

  let issued: Invoice[] = []
  if (monthEnd) {
    const result = issueInvoices(state, rng)
    state = result.state
    issued = result.issued
  }

  // The bank loan at month ends: payout, then payments from cash and savings (the guarantee).
  const loans = settleLoans(state, plan, cash + Math.max(0, savings), monthEnd)
  state = loans.state
  cash +=
    loans.money.inCents -
    loans.money.principalCents -
    loans.money.interestCents -
    loans.money.feeCents

  let autoTransferCents = 0
  if (cash < 0 && savings > 0) {
    autoTransferCents = Math.min(savings, -cash)
    savings -= autoTransferCents
    cash += autoTransferCents
  }

  const ledger: WeekLedger = {
    week: state.week,
    revenueCents,
    fixedCostsCents,
    livingCostsCents,
    founderDrawCents,
    transferCents,
    autoTransferCents,
    adSpendCents: extras.adSpendCents,
    freelanceCents: extras.freelanceCents,
    otherCostsCents: extras.otherCostsCents,
    otherIncomeCents: extras.otherIncomeCents,
    investmentCents: extras.investmentCents,
    bookingRevenueCents: extras.bookingRevenueCents,
    bookingCostsCents: extras.bookingCostsCents,
    loanInCents: loans.money.inCents,
    loanPrincipalCents: loans.money.principalCents,
    loanInterestCents: loans.money.interestCents,
    loanFeeCents: loans.money.feeCents,
    cashEndCents: cash,
    savingsEndCents: savings,
    // Filled in by `closeLedger` once churn has run.
    monthlyRevenueCents: 0,
    customers: 0,
    runwayWeeks: null,
    energyEnd: state.founder.energy,
    hours: { learning: 0, building: 0, selling: 0, admin: 0, rest: 0 },
  }
  const movements: MoneyMovement[] = (
    [
      { kind: 'savings_transfer', amountCents: transferCents },
      { kind: 'founder_draw', amountCents: founderDrawCents },
      { kind: 'auto_top_up', amountCents: autoTransferCents },
    ] as const
  ).filter((m) => m.amountCents > 0)

  return {
    state: {
      ...state,
      company: { ...state.company, cashCents: cash },
      founder: { ...state.founder, savingsCents: savings },
      ledger: [...state.ledger, ledger],
      eventLog: [...state.eventLog, ...movements.map((m) => ({ ...m, week: state.week }))],
    },
    ledger,
    movements,
    loanEntries: loans.entries,
    paid: settled.paid,
    issued,
    writtenOff: settled.writtenOff,
    stopped,
  }
}

/** Invoices issued and not yet paid or written off, in cents. */
export function receivablesCents(state: GameState): number {
  return state.invoices.filter(isUnpaid).reduce((sum, i) => sum + i.amountCents, 0)
}

/** Total private money the founder has put into the company, manual and automatic. */
export function privateMoneyInCents(state: GameState): number {
  return state.eventLog.reduce(
    (sum, e) =>
      e.kind === 'savings_transfer' || e.kind === 'auto_top_up' ? sum + e.amountCents : sum,
    0,
  )
}

/**
 * Weekly change in company cash plus personal savings: money actually received (an invoice
 * written off brought nothing) minus fixed costs, living costs, ads, and fees. Transfers, draws,
 * and top ups only move money between the two and cancel out. Investment (Part D) has its own
 * ledger field and stays out of this sum: runway counts only what the business earns.
 */
export function netChangeCents(l: WeekLedger): number {
  return (
    l.revenueCents +
    l.otherIncomeCents -
    l.fixedCostsCents -
    l.freelanceCents -
    l.bookingCostsCents -
    l.livingCostsCents -
    l.adSpendCents -
    l.otherCostsCents -
    l.loanPrincipalCents -
    l.loanInterestCents -
    l.loanFeeCents
  )
}

/** Records where the week ended: revenue, customers, runway and energy after churn, and its hours. */
export function closeLedger(state: GameState, hours: HoursByActivity): GameState {
  const last = state.ledger.at(-1)
  if (!last) return state
  const active = activeCustomers(state)
  // Tourism has no subscribers: its monthly revenue is what guests paid over the last four weeks.
  const monthly = state.bookings
    ? state.ledger.slice(-4).reduce((sum, l) => sum + l.bookingRevenueCents, 0)
    : active.reduce((sum, c) => sum + c.priceCentsPerMonth, 0)
  const closed: WeekLedger = {
    ...last,
    monthlyRevenueCents: monthly,
    customers: active.length,
    energyEnd: state.founder.energy,
    hours,
  }
  const ledger = [...state.ledger.slice(0, -1), closed]
  closed.runwayWeeks = runwayWeeks({ ...state, ledger })
  return { ...state, ledger }
}

/**
 * Runway: whole weeks until company cash plus personal savings reach zero, at the net change of
 * the last four weeks (`netChangeCents`: money actually received less everything paid), so one
 * month end with its fixed costs is always in the window. Before four weeks have been played it
 * counts the known costs with no income at all; invoiced revenue never counts. Null ("Covered")
 * when that pace does not shrink the money. Never more than the weeks left in the run.
 */
export function runwayWeeks(state: GameState): number | null {
  const weeksPerMonth = state.scenario.finance.weeksPerMonth
  const net =
    state.ledger.length >= weeksPerMonth
      ? state.ledger.slice(-weeksPerMonth).reduce((sum, l) => sum + netChangeCents(l), 0)
      : -monthlyCompanyCostsCents(state) - state.founder.livingCostCentsPerWeek * weeksPerMonth
  if (net >= 0) return null
  const total = state.company.cashCents + Math.max(0, state.founder.savingsCents)
  if (total <= 0) return 0
  // Weeks still to play after the last one played.
  const left = Math.max(0, state.scenario.maxWeeks - (state.ledger.at(-1)?.week ?? 0))
  // total / (-net / weeksPerMonth), kept in integers.
  return Math.min(left, Math.floor((total * weeksPerMonth) / -net))
}

/**
 * Profitable as defined in the scenario specs (docs/scenario-*.md): money received from
 * customers over a month covers that month's company fixed costs, the freelancer's bills and the
 * founder's living costs. Checks each of the last
 * `months` complete months, counted back from the latest week.
 */
/**
 * Seasonal businesses (tourism): money received over the last `months` months together covers
 * those months' company costs and living costs.
 */
export function profitableOverMonths(state: GameState, months: number): boolean {
  const weeks = months * state.scenario.finance.weeksPerMonth
  if (state.ledger.length < weeks) return false
  const span = state.ledger.slice(-weeks)
  const revenue = span.reduce((t, l) => t + l.revenueCents, 0)
  // Loan repayments, interest and fees count: a business that cannot serve its debt is not one.
  const costs = span.reduce(
    (t, l) =>
      t +
      l.fixedCostsCents +
      l.freelanceCents +
      l.bookingCostsCents +
      l.livingCostsCents +
      l.loanPrincipalCents +
      l.loanInterestCents +
      l.loanFeeCents,
    0,
  )
  return revenue >= costs
}

export function profitableForMonths(state: GameState, months: number): boolean {
  const weeksPerMonth = state.scenario.finance.weeksPerMonth
  if (state.ledger.length < months * weeksPerMonth) return false
  for (let m = 0; m < months; m++) {
    const end = state.ledger.length - m * weeksPerMonth
    const month = state.ledger.slice(end - weeksPerMonth, end)
    const revenue = month.reduce((sum, l) => sum + l.revenueCents, 0)
    const costs = month.reduce(
      (sum, l) =>
        sum + l.fixedCostsCents + l.freelanceCents + l.bookingCostsCents + l.livingCostsCents,
      0,
    )
    if (revenue < costs) return false
  }
  return true
}
