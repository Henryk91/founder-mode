import type { GameState, MoneyMovement, WeekLedger, WeekPlan } from '../types'
import { activeCustomers, payingCustomers } from './customers'

export function monthlyFixedCostsCents(state: GameState): number {
  return state.company.fixedCosts.reduce((sum, c) => sum + c.monthlyCents, 0)
}

export function isMonthEnd(state: GameState, week: number): boolean {
  return week % state.scenario.finance.weeksPerMonth === 0
}

/**
 * Weekly money movements (plan section 4.7), in this order:
 * 1. the player's transfer from savings into the company,
 * 2. living costs from savings, any shortfall drawn from company cash,
 * 3. fixed costs from company cash at every month end (every 4th week),
 * 4. if company cash is negative, savings cover the gap automatically as far as they can.
 * Each non zero movement between savings and company is returned as a `MoneyMovement` and
 * written to the event log, so the post-mortem can total the private money put in.
 * Revenue is the agreed monthly price of every customer won before this week, at month end.
 */
export function applyFinanceWeek(
  state: GameState,
  plan: WeekPlan,
): { state: GameState; ledger: WeekLedger; movements: MoneyMovement[]; payingCount: number } {
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

  const fixedCostsCents = isMonthEnd(state, state.week) ? monthlyFixedCostsCents(state) : 0
  cash -= fixedCostsCents

  // Phase 2: every customer pays their agreed price at month end. Invoices arrive in Phase 4.
  const paying = isMonthEnd(state, state.week) ? payingCustomers(state) : []
  const revenueCents = paying.reduce((sum, c) => sum + c.priceCentsPerMonth, 0)
  cash += revenueCents

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
    cashEndCents: cash,
    savingsEndCents: savings,
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
    payingCount: paying.length,
  }
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
 * Weekly change in company cash plus personal savings: revenue minus fixed and living costs.
 * Transfers, draws, and top ups only move money between the two and cancel out.
 */
export function netChangeCents(l: WeekLedger): number {
  return l.revenueCents - l.fixedCostsCents - l.livingCostsCents
}

/**
 * Whole weeks until company cash plus personal savings reach zero. Once a full month has been
 * played, it uses the average net change of the last month, so one month end with its fixed
 * costs is always in the window. Before that it uses the known costs: living costs, fixed costs
 * spread over the month, and what active customers pay. Null when the total is not shrinking.
 */
export function runwayWeeks(state: GameState): number | null {
  const weeksPerMonth = state.scenario.finance.weeksPerMonth
  // Net change over one month, from history or from known costs.
  const net =
    state.ledger.length >= weeksPerMonth
      ? state.ledger.slice(-weeksPerMonth).reduce((sum, l) => sum + netChangeCents(l), 0)
      : activeCustomers(state).reduce((sum, c) => sum + c.priceCentsPerMonth, 0) -
        monthlyFixedCostsCents(state) -
        state.founder.livingCostCentsPerWeek * weeksPerMonth
  if (net >= 0) return null
  const total = state.company.cashCents + Math.max(0, state.founder.savingsCents)
  if (total <= 0) return 0
  // total / (-net / weeksPerMonth), kept in integers.
  return Math.floor((total * weeksPerMonth) / -net)
}

/**
 * Profitable as defined in docs/scenario-kantino.md: money received from customers over a month
 * covers that month's company fixed costs plus founder living costs. Checks each of the last
 * `months` complete months, counted back from the latest week.
 */
export function profitableForMonths(state: GameState, months: number): boolean {
  const weeksPerMonth = state.scenario.finance.weeksPerMonth
  if (state.ledger.length < months * weeksPerMonth) return false
  for (let m = 0; m < months; m++) {
    const end = state.ledger.length - m * weeksPerMonth
    const month = state.ledger.slice(end - weeksPerMonth, end)
    const revenue = month.reduce((sum, l) => sum + l.revenueCents, 0)
    const costs = month.reduce((sum, l) => sum + l.fixedCostsCents + l.livingCostsCents, 0)
    if (revenue < costs) return false
  }
  return true
}
