import type { EndingId, GameState } from '../types'
import { netChangeCents, profitableForMonths, profitableOverMonths } from './finance'
import { growingHolds } from './funding'

/** Profitable for the last 8 weeks, as two 4 week months, unless the scenario says otherwise. */
const SUSTAINABLE_MONTHS = 2

/**
 * Checks the endings available so far (plan section 4.13). Finance has already moved savings
 * into the company where it could, so negative cash means the savings are gone too.
 * Shut down is the player's own action (`shutDown`), never checked here.
 */
export function checkEnding(state: GameState): EndingId | null {
  if (state.company.cashCents < 0) return 'bankrupt'
  if (state.founder.weeksAtZeroEnergy >= state.scenario.founder.energy.burnoutWeeks) {
    return 'burnout'
  }
  if (state.week >= state.scenario.maxWeeks) {
    const months = state.scenario.win?.profitableMonths ?? SUSTAINABLE_MONTHS
    const over = state.scenario.win?.overMonths
    if (
      over !== undefined ? profitableOverMonths(state, over) : profitableForMonths(state, months)
    ) {
      return 'sustainable'
    }
    // A funded company still burning money wins as Growing, with runway and growth (Part D).
    const net = state.ledger.slice(-state.scenario.finance.weeksPerMonth)
    if (
      growingHolds(
        state,
        net.reduce((t, l) => t + netChangeCents(l), 0),
      )
    )
      return 'growing'
    return 'still_searching'
  }
  return null
}
