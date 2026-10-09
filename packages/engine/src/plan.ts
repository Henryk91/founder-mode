import { plannedHours } from './systems/founder'
import type { GameState, PlanIssue, WeekPlan } from './types'

export function emptyPlan(): WeekPlan {
  return { interviews: {}, restHours: 0, transferToCompanyCents: 0 }
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0

/** Returns every problem with a plan. An empty list means `endWeek` will accept it. */
export function validatePlan(state: GameState, plan: WeekPlan): PlanIssue[] {
  const issues: PlanIssue[] = []
  if (state.status !== 'running') issues.push({ code: 'game_over' })

  for (const [segmentId, count] of Object.entries(plan.interviews)) {
    if (!(segmentId in state.hidden.segments)) issues.push({ code: 'unknown_segment', segmentId })
    if (!isCount(count)) issues.push({ code: 'invalid_number', field: `interviews.${segmentId}` })
  }
  if (!isCount(plan.restHours)) issues.push({ code: 'invalid_number', field: 'restHours' })
  if (!isCount(plan.transferToCompanyCents)) {
    issues.push({ code: 'invalid_number', field: 'transferToCompanyCents' })
  } else if (plan.transferToCompanyCents > Math.max(0, state.founder.savingsCents)) {
    issues.push({ code: 'transfer_exceeds_savings', savingsCents: state.founder.savingsCents })
  }

  // Hours only make sense once every number is valid.
  if (!issues.some((i) => i.code === 'invalid_number')) {
    const hours = plannedHours(state.scenario, plan)
    if (hours > state.founder.maxHoursPerWeek) {
      issues.push({
        code: 'too_many_hours',
        plannedHours: hours,
        maxHours: state.founder.maxHoursPerWeek,
      })
    }
  }
  return issues
}
