import type { FounderState, GameState, Scenario, WeekPlan } from '../types'

/** Hours of the answers given this week to inbox messages. They count against the week. */
export function committedHours(state: Pick<GameState, 'inbox'>): number {
  let hours = 0
  for (const m of state.inbox) {
    if (m.status !== 'answered') continue
    hours += m.choices.find((c) => c.id === m.choiceId)?.hours ?? 0
  }
  return hours
}

/**
 * Total founder hours of a week: the plan, the answers already given to messages, and the hours
 * taken out of this week by earlier penalties. Rest counts as planned time.
 */
export function plannedHours(
  state: Pick<GameState, 'scenario' | 'inbox' | 'founder'>,
  plan: WeekPlan,
): number {
  const { scenario } = state
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  return (
    sum(Object.values(plan.interviews)) * scenario.experiments.interview.hours +
    sum(Object.values(plan.build)) +
    plan.bugFixHours +
    sum(Object.values(plan.outreach).map((o) => o.hours)) +
    plan.demos.length * scenario.sales.demoHours +
    plan.followUps.length * scenario.sales.followUpHours +
    plan.restHours +
    Object.values(plan.landing).filter((budget) => budget > 0).length *
      scenario.experiments.landing.hours +
    sum(Object.values(plan.presales)) * scenario.experiments.presale.hoursPerBatch +
    plan.chase.length * scenario.finance.chaseHours +
    (plan.searchRole === null ? 0 : scenario.team.searchHours) +
    committedHours(state) +
    state.founder.forcedHours
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

/**
 * Multiplier on sales chances this week: 1 from `fullAt` energy up, falling in a straight line to
 * `lowFactor` at `lowBelow`, and `lowFactor` below that.
 */
export function energyFactor(founder: FounderState, scenario: Scenario): number {
  const { fullAt, lowBelow, lowFactor } = scenario.founder.energy
  if (founder.energy >= fullAt) return 1
  if (founder.energy <= lowBelow) return lowFactor
  return lowFactor + ((1 - lowFactor) * (founder.energy - lowBelow)) / (fullAt - lowBelow)
}
