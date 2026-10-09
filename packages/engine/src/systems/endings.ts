import type { EndingId, GameState } from '../types'
import { profitableForMonths } from './finance'

/** Profitable for the last 8 weeks, as two 4 week months. */
const SUSTAINABLE_MONTHS = 2

/**
 * Checks the endings available so far (plan section 4.13). Finance has already moved savings
 * into the company where it could, so negative cash means the savings are gone too.
 * Shut down arrives with the player action that triggers it.
 */
export function checkEnding(state: GameState): EndingId | null {
  if (state.company.cashCents < 0) return 'bankrupt'
  if (state.founder.weeksAtZeroEnergy >= state.scenario.founder.energy.burnoutWeeks) {
    return 'burnout'
  }
  if (state.week >= state.scenario.maxWeeks) {
    return profitableForMonths(state, SUSTAINABLE_MONTHS) ? 'sustainable' : 'still_searching'
  }
  return null
}
