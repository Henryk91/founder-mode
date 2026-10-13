import type { Milestone } from '@founder-mode/content'
import { bookingsRevenueOrSubscriptions } from './bookings'
import type { GameState, MilestoneView, NextMilestoneView, ReachedMilestone } from '../types'
import { monthlyCompanyCostsCents } from './finance'

/** Endings in which the weeks of the final week still count as survived. */
const SURVIVED = new Set(['still_searching', 'sustainable'])

/** Where a milestone stands now: its current value and the target it needs. */
function progress(state: GameState, m: Milestone): { current: number; target: number } {
  switch (m.kind) {
    case 'count':
      return { current: countOf(state, m.of), target: m.target }
    case 'revenue': {
      const revenue = bookingsRevenueOrSubscriptions(state)
      const living = state.founder.livingCostCentsPerWeek * state.scenario.finance.weeksPerMonth
      const costs = monthlyCompanyCostsCents(state) + (m.covers === 'all' ? living : 0)
      return { current: revenue, target: costs }
    }
    case 'weeks': {
      // The week counts once it is over: at the end of week 26 a run has survived 26 weeks,
      // unless that week ended it.
      const over = state.ending === null || SURVIVED.has(state.ending)
      return { current: over ? state.week : state.week - 1, target: m.target }
    }
  }
}

function countOf(
  state: GameState,
  of: 'interviews' | 'deposits' | 'customers' | 'hires' | 'guests',
): number {
  switch (of) {
    case 'interviews':
      return Object.values(state.knowledge)
        .flat()
        .filter((e) => e.kind === 'interview').length
    case 'deposits':
      return Object.values(state.knowledge)
        .flat()
        .reduce((t, e) => t + (e.kind === 'presale' ? e.commits : 0), 0)
    case 'customers':
      return state.customers.length
    case 'guests':
      return (state.bookings?.bookings ?? [])
        .filter((b) => b.status === 'served')
        .reduce((t, b) => t + b.units, 0)
    case 'hires':
      return state.team.members.filter((m) => m.startWeek <= state.week).length
  }
}

const reachedNow = (state: GameState, m: Milestone) => {
  const p = progress(state, m)
  return p.target > 0 && p.current >= p.target
}

/**
 * Plan section 4.11 step 11, after the ending is known: milestones reached this week. Each is
 * reached once, and stays reached.
 */
export function checkMilestones(state: GameState): { state: GameState; reached: MilestoneView[] } {
  const done = new Set(state.milestones.map((m) => m.id))
  const reached: MilestoneView[] = []
  for (const m of state.scenario.milestones) {
    if (done.has(m.id) || !reachedNow(state, m)) continue
    reached.push({ id: m.id, name: m.name, week: state.week })
  }
  if (reached.length === 0) return { state, reached }
  const added: ReachedMilestone[] = reached.map((r) => ({ id: r.id, week: r.week }))
  return { state: { ...state, milestones: [...state.milestones, ...added] }, reached }
}

/** Milestones reached so far, with their names, in the order they were reached. */
export function reachedMilestones(state: GameState): MilestoneView[] {
  return state.milestones.map((r) => ({
    ...r,
    name: state.scenario.milestones.find((m) => m.id === r.id)?.name ?? r.id,
  }))
}

/** The first milestone on the bar not reached yet, with its progress. */
export function nextMilestone(state: GameState): NextMilestoneView | null {
  const done = new Set(state.milestones.map((m) => m.id))
  const m = state.scenario.milestones.find((x) => x.onBar && !done.has(x.id))
  if (!m) return null
  const p = progress(state, m)
  const unit = m.kind === 'revenue' ? 'cents' : m.kind === 'weeks' ? 'weeks' : 'count'
  return { id: m.id, name: m.name, unit, current: Math.min(p.current, p.target), target: p.target }
}
