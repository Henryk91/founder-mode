import type { FounderState, Scenario, WeekPlan } from '../types'

/** Total founder hours a plan uses. Rest counts as planned time. */
export function plannedHours(scenario: Scenario, plan: WeekPlan): number {
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  return (
    sum(Object.values(plan.interviews)) * scenario.experiments.interview.hours +
    sum(Object.values(plan.build)) +
    plan.bugFixHours +
    sum(Object.values(plan.outreach).map((o) => o.hours)) +
    plan.demos.length * scenario.sales.demoHours +
    plan.restHours
  )
}

/**
 * Energy for the week (docs/scenario-kantino.md section 7). Hours above the base cost energy,
 * rest restores it, and a week within the base gives a small bonus. Clamped to 0..max.
 * Counts the weeks in a row that end at 0, for the burnout ending.
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
  const weeksAtZeroEnergy = energy === 0 ? founder.weeksAtZeroEnergy + 1 : 0
  return { ...founder, energy, weeksAtZeroEnergy }
}

/** Multiplier on sales chances this week: lowFactor while energy is below lowBelow, else 1. */
export function energyFactor(founder: FounderState, scenario: Scenario): number {
  const rules = scenario.founder.energy
  return founder.energy < rules.lowBelow ? rules.lowFactor : 1
}
