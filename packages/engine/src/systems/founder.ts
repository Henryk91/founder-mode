import type { FounderState, GameState, HoursByActivity, Scenario, WeekPlan } from '../types'
import { bookingsHours, hostingHours } from './bookings'
import { fundingHours } from './funding'
import { loanHours } from './loan'
import { managementHours } from './team'
import { trialsHours } from './trials'

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
  state: Pick<GameState, 'scenario' | 'inbox' | 'founder' | 'team' | 'week'>,
  plan: WeekPlan,
): number {
  const h = hoursByActivity(state, plan)
  return h.learning + h.building + h.selling + h.admin + h.rest
}

/**
 * The week's hours by activity, as the post-mortem counts them: interviews, landing tests and
 * pre-sales are learning; building and fixing are building; outreach, demos and follow ups are
 * selling; chasing, the hiring search, inbox answers, lost hours and (long mode) managing the
 * team are admin.
 */
export function hoursByActivity(
  state: Pick<GameState, 'scenario' | 'inbox' | 'founder' | 'team' | 'week'>,
  plan: WeekPlan,
): HoursByActivity {
  const { scenario } = state
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  return {
    learning:
      sum(Object.values(plan.interviews)) * scenario.experiments.interview.hours +
      Object.values(plan.landing).filter((budget) => budget > 0).length *
        scenario.experiments.landing.hours +
      sum(Object.values(plan.presales)) * scenario.experiments.presale.hoursPerBatch +
      trialsHours(state, plan),
    building: sum(Object.values(plan.build)) + plan.bugFixHours,
    selling:
      bookingsHours(state, plan) +
      sum(Object.values(plan.outreach).map((o) => o.hours)) +
      plan.demos.length * scenario.sales.demoHours +
      plan.followUps.length * scenario.sales.followUpHours,
    admin:
      plan.chase.length * scenario.finance.chaseHours +
      (plan.searchRole === null ? 0 : scenario.team.searchHours) +
      committedHours(state) +
      state.founder.forcedHours +
      hostingHours(state as GameState) +
      managementHours(state) +
      fundingHours(state as GameState, plan) +
      loanHours(state as GameState, plan),
    rest: plan.restHours,
  }
}

/**
 * Energy for the week (scenario spec section 7). Every week recovers `weeklyRecovery`, each hour
 * above the base costs `perHourOverBase`, and rest restores more. So a few hours over the base
 * can be kept up for good, and more drain energy slowly (a slope, not a cliff). Clamped to 0..max.
 * Counts the weeks in a row that end at 0, for the burnout ending.
 */
export function applyFounderWeek(
  founder: FounderState,
  scenario: Scenario,
  hours: number,
  restHours: number,
  /** Energy from lasting modifiers, such as a better office. */
  bonus = 0,
): FounderState {
  const rules = scenario.founder.energy
  const overtime = Math.max(0, hours - founder.baseHoursPerWeek)
  // Every week recovers a little; each hour over the base week takes some of it back (Phase 9).
  let delta =
    rules.weeklyRecovery + overtime * rules.perHourOverBase + restHours * rules.perRestHour
  delta += bonus
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

/**
 * Living costs per week in `week`: the last of the scenario's living steps that has begun, else
 * `current`. Without steps (the 60 week game) always `current`.
 */
export function livingCostsFor(scenario: Scenario, week: number, current: number): number {
  let cost = current
  for (const step of scenario.founder.livingSteps ?? [])
    if (week >= step.week) cost = step.centsPerWeek
  return cost
}
