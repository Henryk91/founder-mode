import type { Scenario } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  validatePlan,
  type EndingId,
  type GameState,
} from '@founder-mode/engine'
import type { Strategy } from './strategy'

/** Week at which the playtest numbers are compared. */
export const CHECK_WEEK = 15

export type RunResult = {
  strategy: string
  seed: string
  ending: EndingId
  /** The week in which the run ended. */
  weeks: number
  /** Hidden truth, read by the report only: the segment with the viable role. */
  viableSegment: string
  peakMonthlyRevenueCents: number
  customersEnd: number
  customersAtCheck: number
  monthlyRevenueAtCheckCents: number
  minEnergy: number
  meanPlannedHours: number
  leads: number
  outreachHours: number
}

const monthlyRevenue = (s: GameState) =>
  s.customers.filter((c) => c.churnedWeek === null).reduce((t, c) => t + c.priceCentsPerMonth, 0)

/** Plays one full run. Throws if a strategy produces an invalid plan, which is a bot bug. */
export function runGame(scenario: Scenario, strategy: Strategy, seed: string): RunResult {
  let state = createGame(scenario, seed)
  const player = strategy.create(scenario, seed)
  let peak = 0
  let customersAtCheck = 0
  let revenueAtCheck = 0
  let minEnergy = state.founder.energy
  let hours = 0
  let outreachHours = 0
  let weeks = 0

  while (state.status === 'running') {
    const plan = player.plan(getView(state))
    const issues = validatePlan(state, plan)
    if (issues.length > 0) {
      throw new Error(
        `${strategy.id} made an invalid plan in week ${state.week} (seed ${seed}): ${JSON.stringify(issues)}`,
      )
    }
    const result = endWeek(state, plan)
    state = result.state
    weeks++
    hours += result.report.plannedHours
    for (const o of Object.values(plan.outreach)) outreachHours += o.hours
    minEnergy = Math.min(minEnergy, state.founder.energy)
    peak = Math.max(peak, monthlyRevenue(state))
    if (result.report.week === CHECK_WEEK) {
      customersAtCheck = state.customers.filter((c) => c.churnedWeek === null).length
      revenueAtCheck = monthlyRevenue(state)
    }
    player.observe?.(result.report, getView(state))
  }

  const viable = Object.entries(state.hidden.segments).find(([, h]) => h.roleId === 'viable')
  return {
    strategy: strategy.id,
    seed,
    ending: state.ending ?? 'still_searching',
    weeks: state.week,
    viableSegment: viable?.[0] ?? '',
    peakMonthlyRevenueCents: peak,
    customersEnd: state.customers.filter((c) => c.churnedWeek === null).length,
    customersAtCheck,
    monthlyRevenueAtCheckCents: revenueAtCheck,
    minEnergy,
    meanPlannedHours: weeks ? hours / weeks : 0,
    leads: state.leads.length,
    outreachHours,
  }
}
