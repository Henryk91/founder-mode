import type { GameState } from '../types'
import { monthsCovering } from './finance'
import { stageNumber } from './office'

/**
 * Plan 3: whether the screens turn established this week (`establishedAt`): money coming in has
 * covered all costs, the founder's living costs included, for the scenario's months in a row; or
 * a move into its office stage has completed; or (where it says so) a funding round has closed.
 * Never back.
 */
export function reachesEstablished(state: GameState): boolean {
  const at = state.scenario.establishedAt
  if (!at || state.company.uiStage === 'established') return false
  if (monthsCovering(state, true) >= at.monthsCoveringAll) return true
  if (at.officeStage && stageNumber(state, state.company.officeStage) >= at.officeStage) return true
  return at.funded === true && state.funding.stakes.length > 0
}
