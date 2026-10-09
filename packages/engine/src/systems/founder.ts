import type { FounderState, Scenario, WeekPlan } from '../types'

/** Total founder hours a plan uses. Rest counts as planned time. */
export function plannedHours(scenario: Scenario, plan: WeekPlan): number {
  const interviewCount = Object.values(plan.interviews).reduce((sum, n) => sum + n, 0)
  return interviewCount * scenario.experiments.interview.hours + plan.restHours
}

/**
 * Energy for the week (docs/scenario-kantino.md section 7). Hours above the base cost energy,
 * rest restores it, and a week within the base gives a small bonus. Clamped to 0..max.
 * The low energy penalty and burnout arrive in Phase 4.
 */
export function applyFounderWeek(
  founder: FounderState,
  scenario: Scenario,
  hours: number,
  restHours: number,
): FounderState {
  const rules = scenario.founder.energy
  const overtime = Math.max(0, hours - founder.baseHoursPerWeek)
  let delta = overtime * rules.perHourOverBase + restHours * rules.perRestHour
  if (overtime === 0) delta += rules.weekWithinBase
  const energy = Math.min(rules.max, Math.max(0, founder.energy + delta))
  return { ...founder, energy }
}
