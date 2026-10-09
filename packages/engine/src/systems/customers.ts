import type { Customer, GameState } from '../types'

export function activeCustomers(state: GameState): Customer[] {
  return state.customers.filter((c) => c.churnedWeek === null)
}

/** Customers who pay at a month end: active and won in an earlier week. */
export function payingCustomers(state: GameState): Customer[] {
  return activeCustomers(state).filter((c) => c.sinceWeek < state.week)
}
