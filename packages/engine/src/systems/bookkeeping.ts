import type { GameState, WeekPlan } from '../types'

/** Most bookkeeping hours that make sense this week: the backlog plus this week's new work. */
export function maxBookkeepingHours(state: GameState): number {
  return state.company.bookkeepingBacklogHours + state.scenario.finance.bookkeeping.hoursPerWeek
}

export type BookkeepingResult = {
  backlogHours: number
  /** Set when the backlog went over the limit: a late fee and hours lost next week. */
  penalty: { feeCents: number; lostHours: number } | null
}

/**
 * Bookkeeping (plan section 4.7): every week adds the required hours to the backlog and the
 * hours spent take them off. Over the limit, a late fee is due, time is lost next week, and the
 * books are brought up to date.
 */
export function applyBookkeeping(state: GameState, plan: WeekPlan): BookkeepingResult {
  const cfg = state.scenario.finance.bookkeeping
  const backlog = Math.max(
    0,
    state.company.bookkeepingBacklogHours + cfg.hoursPerWeek - plan.bookkeepingHours,
  )
  if (backlog > cfg.backlogLimit) {
    return {
      backlogHours: 0,
      penalty: { feeCents: cfg.lateFeeCents, lostHours: cfg.lostHours },
    }
  }
  return { backlogHours: backlog, penalty: null }
}
