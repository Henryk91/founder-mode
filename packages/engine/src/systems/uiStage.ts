import type { GameState } from '../types'
import { contractWorks } from './contracts'
import { monthsCovering } from './finance'
import { workingMembers } from './team'

/** People working here this week: the founder, hires who have started, staff on contracts. */
export function peopleWorking(state: GameState): number {
  const contracts = (state.bookings?.contracts ?? []).filter((c) =>
    contractWorks(state, c, state.week),
  ).length
  return 1 + workingMembers(state).length + contracts
}

/**
 * Plan 3: whether the screens turn established this week. Once revenue has covered all costs for
 * the scenario's months running and enough people work here (`establishedAt`); never back.
 */
export function reachesEstablished(state: GameState): boolean {
  const at = state.scenario.establishedAt
  if (!at || state.company.uiStage === 'established') return false
  return monthsCovering(state, true) >= at.monthsCoveringAll && peopleWorking(state) >= at.people
}
