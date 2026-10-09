import type { Rng } from '../rng'
import type { GameState, Invoice, WeekPlan } from '../types'
import { activeCustomers } from './customers'

const DAYS_PER_WEEK = 7
const weeksFor = (days: number) => Math.ceil(days / DAYS_PER_WEEK)

/** Weeks past the due week; 0 while the invoice is not overdue. */
export function overdueWeeks(invoice: Invoice, week: number): number {
  return Math.max(0, week - invoice.dueWeek)
}

/** Issued, not paid, not written off. */
export const isUnpaid = (i: Invoice) => i.paidWeek === null && i.writtenOffWeek === null

/** An unpaid invoice whose due week has passed: the player may chase it. */
export function isOverdue(invoice: Invoice, week: number): boolean {
  return isUnpaid(invoice) && week > invoice.dueWeek
}

/**
 * Invoices every active customer won in an earlier week (plan section 4.7). Each invoice is due
 * `invoiceDueDays` later and is paid after a lateness drawn from the segment's mean, uniform
 * from 0 to twice the mean in days; never with the segment's never-pays share; or only once
 * chased with its waits-for-chase share. The payment week is hidden.
 */
export function issueInvoices(state: GameState, rng: Rng): { state: GameState; issued: Invoice[] } {
  const dueDays = state.scenario.finance.invoiceDueDays
  const issued: Invoice[] = []
  const payWeeks = { ...state.hidden.payWeeks }
  const waitsForChase = [...state.hidden.waitsForChase]
  const prepaid = new Set<string>()
  for (const customer of activeCustomers(state)) {
    if (customer.sinceWeek >= state.week) continue
    // A month paid for by a pre-sale deposit sends no invoice.
    if ((customer.prepaidMonths ?? 0) > 0) {
      prepaid.add(customer.id)
      continue
    }
    const hidden = state.hidden.segments[customer.segmentId]
    if (!hidden) throw new Error(`Unknown segment ${customer.segmentId}`)
    const id = `invoice_${state.invoices.length + issued.length + 1}`
    const never = rng.chance(hidden.neverPaysShare)
    const lateDays = Math.round(rng.range(0, 2 * hidden.paymentDelayDaysMean))
    const waits = rng.chance(hidden.waitsForChaseShare)
    issued.push({
      id,
      customerId: customer.id,
      customerName: customer.name,
      segmentId: customer.segmentId,
      amountCents: customer.priceCentsPerMonth,
      issuedWeek: state.week,
      dueWeek: state.week + weeksFor(dueDays),
      paidWeek: null,
      writtenOffWeek: null,
    })
    payWeeks[id] = never || waits ? null : state.week + weeksFor(dueDays + lateDays)
    if (!never && waits) waitsForChase.push(id)
  }
  const customers = prepaid.size
    ? state.customers.map((c) =>
        prepaid.has(c.id) ? { ...c, prepaidMonths: (c.prepaidMonths ?? 0) - 1 } : c,
      )
    : state.customers
  if (issued.length === 0) return { state: { ...state, customers }, issued }
  return {
    state: {
      ...state,
      customers,
      invoices: [...state.invoices, ...issued],
      hidden: { ...state.hidden, payWeeks, waitsForChase },
    },
    issued,
  }
}

/**
 * A nudge that worked: the invoice is paid next week, or earlier if it was due to be paid anyway.
 * A customer who waits to be chased now pays too. A never payer does not.
 */
export function nudgeInvoice(
  hidden: Pick<GameState['hidden'], 'payWeeks' | 'waitsForChase'>,
  id: string,
  week: number,
): Pick<GameState['hidden'], 'payWeeks' | 'waitsForChase'> {
  const planned = hidden.payWeeks[id]
  if (planned !== null && planned !== undefined) {
    return { ...hidden, payWeeks: { ...hidden.payWeeks, [id]: Math.min(planned, week + 1) } }
  }
  if (!hidden.waitsForChase.includes(id)) return hidden
  return {
    payWeeks: { ...hidden.payWeeks, [id]: week + 1 },
    waitsForChase: hidden.waitsForChase.filter((x) => x !== id),
  }
}

/**
 * Chasing an overdue invoice gets it paid in the following week with the scenario's chance,
 * unless the customer will never pay. The player cannot tell the difference beforehand.
 */
export function chaseInvoices(state: GameState, plan: WeekPlan, rng: Rng): GameState {
  if (plan.chase.length === 0) return state
  let money = { payWeeks: state.hidden.payWeeks, waitsForChase: state.hidden.waitsForChase }
  for (const id of plan.chase) {
    // The roll is always made, so a never payer does not change the random sequence.
    if (rng.chance(state.scenario.finance.chaseBoost)) money = nudgeInvoice(money, id, state.week)
  }
  return { ...state, hidden: { ...state.hidden, ...money } }
}

/** Marks invoices due for payment this week as paid, and writes off very old unpaid ones. */
export function settleInvoices(state: GameState): {
  state: GameState
  paid: Invoice[]
  writtenOff: Invoice[]
} {
  const paid: Invoice[] = []
  const writtenOff: Invoice[] = []
  const limit = state.scenario.finance.writeOffWeeks
  const invoices = state.invoices.map((inv) => {
    if (!isUnpaid(inv)) return inv
    const payWeek = state.hidden.payWeeks[inv.id]
    if (payWeek !== null && payWeek !== undefined && payWeek <= state.week) {
      const next = { ...inv, paidWeek: state.week }
      paid.push(next)
      return next
    }
    if (state.week - inv.dueWeek >= limit) {
      const next = { ...inv, writtenOffWeek: state.week }
      writtenOff.push(next)
      return next
    }
    return inv
  })
  return { state: { ...state, invoices }, paid, writtenOff }
}

/** Longest overdue time in days over unpaid invoices, for event conditions. */
export function maxOverdueDays(state: GameState): number {
  let weeks = 0
  for (const inv of state.invoices) {
    if (isOverdue(inv, state.week)) weeks = Math.max(weeks, overdueWeeks(inv, state.week))
  }
  return weeks * DAYS_PER_WEEK
}
